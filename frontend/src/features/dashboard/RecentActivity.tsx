'use client';

import React from 'react';
import { GitPullRequest, GitBranch, Play, CheckCircle2, User } from 'lucide-react';
import { sampleActivities, sampleUsers } from '@/data/sample';
import { formatDate } from '@/lib/utils';

export default function RecentActivity() {
  const getIcon = (type: string, action: string) => {
    if (type === 'pr') return <GitPullRequest size={14} className="text-purple-400" />;
    if (type === 'branch') return <GitBranch size={14} className="text-indigo-400" />;
    if (action.includes('editing')) return <Play size={14} className="text-amber-400 animate-pulse" fill="#f59e0b" />;
    return <CheckCircle2 size={14} className="text-emerald-400" />;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm h-full flex flex-col justify-between">
      <div>
        <h3 className="text-sm font-semibold text-white">Live Activity Feed</h3>
        <p className="text-[11px] text-zinc-500">Real-time status changes and developer locks</p>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-1">
        {sampleActivities.map((act) => {
          const user = sampleUsers.find((u) => u.id === act.userId);
          return (
            <div key={act.id} className="flex gap-3 text-xs leading-5">
              {/* Avatar / Icon overlap */}
              <div className="relative flex-shrink-0">
                <img
                  src={user?.avatarUrl}
                  alt={user?.name}
                  className="h-7 w-7 rounded-full border border-zinc-800 object-cover"
                />
                <span className="absolute -bottom-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-zinc-900 bg-zinc-950 p-0.5 shadow-sm">
                  {getIcon(act.entityType, act.action)}
                </span>
              </div>

              {/* Action content */}
              <div className="flex-1 min-w-0">
                <p className="text-zinc-300">
                  <span className="font-semibold text-white">{user?.name}</span>{' '}
                  <span className="text-zinc-400">{act.action}</span>{' '}
                  <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded">
                    {act.entityName}
                  </span>
                </p>
                {act.details && (
                  <p className="text-[10px] text-zinc-500 mt-0.5 italic">{act.details}</p>
                )}
                <span className="text-[9px] text-zinc-600 block mt-0.5">{formatDate(act.timestamp)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
