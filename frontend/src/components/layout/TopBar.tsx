'use client';

import React, { useEffect, useState } from 'react';
import { Search, Bell, Circle, Moon, Sun, LogOut, User as UserIcon } from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';

interface TopBarProps {
  title?: string;
  user?: any;
}

export default function TopBar({ title, user }: TopBarProps) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('theme');
    const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentTheme = storedTheme === 'light' || storedTheme === 'dark'
      ? storedTheme
      : (systemPref ? 'dark' : 'light');

    setTheme(currentTheme);
    document.documentElement.classList.toggle('dark', currentTheme === 'dark');
    document.documentElement.style.colorScheme = currentTheme;
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    window.localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
    document.documentElement.style.colorScheme = nextTheme;
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  return (
    <header className="flex h-16 w-full items-center justify-between border-b border-[var(--border)] bg-[var(--surface)] px-6">
      {/* Page Title / Context */}
      <div className="flex items-center gap-2">
        <h1 className="text-base font-semibold text-[var(--foreground)] tracking-tight">
          {title || 'Workspace'}
        </h1>
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        <span className="text-[10px] text-[var(--muted)] font-mono">LIVE SYNCED</span>
      </div>

      {/* Center - Search Bar */}
      <div className="hidden max-w-md flex-1 md:flex">
        <div className="relative w-full">
          <span className="absolute inset-y-0 left-3 flex items-center text-[var(--muted)]">
            <Search size={16} />
          </span>
          <input
            type="text"
            placeholder="Search issues, pull requests, commits..."
            className="w-full rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] py-1.5 pl-10 pr-4 text-xs text-[var(--foreground)] placeholder-[var(--muted)] outline-none transition-all focus:border-[var(--accent)]"
          />
        </div>
      </div>

      {/* Right - Profile and Actions */}
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={toggleTheme}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface-muted)] p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
          aria-label="Toggle color theme"
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {/* GitHub Status */}
        <a 
          href="https://github.com" 
          target="_blank" 
          rel="noreferrer"
          className="flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-1 text-xs text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)] transition-colors"
        >
          <Github size={14} />
          <span className="hidden sm:inline font-medium">GitHub Connected</span>
          <Circle size={8} fill="#22c55e" className="text-emerald-500" />
        </a>

        {/* Notifications */}
        <button className="relative rounded-lg p-2 text-[var(--muted)] transition-colors hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]">
          <Bell size={18} />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-indigo-500" />
        </button>

        {/* Logout Button */}
        <button 
          onClick={handleLogout}
          title="Sign Out"
          className="rounded-lg p-2 text-[var(--muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut size={18} />
        </button>

        {/* Divider */}
        <div className="h-6 w-px bg-[var(--border)]" />

        {/* User Profile */}
        <div className="flex items-center gap-2">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name || user.username}
              className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full border border-[var(--border)] bg-[var(--surface-muted)] flex items-center justify-center text-zinc-500">
              <UserIcon size={14} />
            </div>
          )}
          <div className="hidden flex-col text-left lg:flex">
            <span className="text-xs font-semibold text-[var(--foreground)]">
              {user?.full_name || user?.username || 'Developer'}
            </span>
            <span className="text-[9px] text-[var(--muted)] uppercase tracking-wider">
              {user?.email ? 'Active Account' : 'Guest'}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
