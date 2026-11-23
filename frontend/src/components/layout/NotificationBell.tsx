'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell, CheckCheck } from 'lucide-react';
import { api, AppNotification } from '@/lib/api';
import { getWsOrigin } from '@/hooks/useWebSocket';

const PRIORITY_STYLES: Record<string, string> = {
  urgent: 'bg-red-500/15 text-red-400',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-zinc-500/15 text-zinc-400',
};

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Bell showing the current user's own notifications (e.g. tasks assigned to them). */
export default function NotificationBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const [list, count] = await Promise.all([
        api.listNotifications(),
        api.getUnreadNotificationCount(),
      ]);
      setItems(list);
      setUnread(count.unread);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listNotifications(), api.getUnreadNotificationCount()])
      .then(([list, count]) => {
        if (cancelled) return;
        setItems(list);
        setUnread(count.unread);
      })
      .catch((err) => console.error('Failed to load notifications:', err));
    return () => {
      cancelled = true;
    };
  }, []);

  // Live updates on this user's personal channel.
  useEffect(() => {
    let socket: WebSocket | null = null;
    let retry: ReturnType<typeof setTimeout> | null = null;
    let stopped = false;

    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token || stopped) return;
      socket = new WebSocket(
        `${getWsOrigin()}/api/v1/ws/notifications?token=${encodeURIComponent(token)}`,
      );
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload?.event === 'notification_created' && payload.data) {
            setItems((prev) => [payload.data, ...prev.filter((n) => n.id !== payload.data.id)]);
            setUnread((n) => n + 1);
          }
        } catch {
          // ignore malformed messages
        }
      };
      socket.onclose = () => {
        if (!stopped) retry = setTimeout(connect, 5000);
      };
    };
    connect();

    return () => {
      stopped = true;
      if (retry) clearTimeout(retry);
      socket?.close();
    };
  }, []);

  // Close when clicking outside.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const openNotification = async (n: AppNotification) => {
    setOpen(false);
    if (!n.is_read) {
      setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
      setUnread((c) => Math.max(0, c - 1));
      api.markNotificationRead(n.id).catch((err) => console.error(err));
    }
    const slug = n.data?.project_slug;
    if (slug) {
      router.push(n.issue_id ? `/board/${slug}?issue=${n.issue_id}` : `/board/${slug}`);
    }
  };

  const markAllRead = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    setUnread(0);
    try {
      await api.markAllNotificationsRead();
    } catch (err) {
      console.error(err);
      load();
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          if (!open) load();
        }}
        aria-label={unread ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-expanded={open}
        className="relative rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-indigo-500 px-1 text-[9px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-96 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-2xl">
          <div className="flex items-center justify-between border-b border-[var(--border)] px-4 py-3">
            <span className="text-sm font-semibold text-[var(--foreground)]">Notifications</span>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs text-[var(--muted)] hover:text-[var(--foreground)]"
              >
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          <ul className="max-h-[28rem] overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-10 text-center text-xs text-[var(--muted)]">
                No notifications yet. You&apos;ll be notified here when a task is assigned to you.
              </li>
            )}
            {items.map((n) => {
              const d = n.data || {};
              const priorityKey = (d.priority || '').toLowerCase();
              return (
                <li key={n.id} className="border-b border-[var(--border)] last:border-b-0">
                  <button
                    type="button"
                    onClick={() => openNotification(n)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-[var(--surface-muted)] ${
                      n.is_read ? 'opacity-70' : ''
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${
                        n.is_read ? 'bg-transparent' : 'bg-indigo-500'
                      }`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] text-[var(--muted)]">
                        {d.project_name || n.title} · {timeAgo(n.created_at)}
                      </span>
                      <span className="mt-0.5 block truncate text-sm font-semibold text-[var(--foreground)]">
                        {d.issue_title || n.title}
                      </span>
                      {d.issue_description && (
                        <span className="mt-0.5 line-clamp-2 block text-xs text-[var(--muted)]">
                          {d.issue_description}
                        </span>
                      )}
                      <span className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px]">
                        {d.priority && (
                          <span className={`rounded px-1.5 py-0.5 font-medium ${PRIORITY_STYLES[priorityKey] || PRIORITY_STYLES.low}`}>
                            {d.priority}
                          </span>
                        )}
                        {d.status && (
                          <span className="rounded bg-[var(--surface-muted)] px-1.5 py-0.5 text-[var(--muted)]">
                            {d.status}
                          </span>
                        )}
                        {(d.labels || []).map((label) => (
                          <span key={label} className="rounded bg-indigo-500/10 px-1.5 py-0.5 text-indigo-400">
                            {label}
                          </span>
                        ))}
                        {d.assigned_by && (
                          <span className="text-[var(--muted)]">by {d.assigned_by}</span>
                        )}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
