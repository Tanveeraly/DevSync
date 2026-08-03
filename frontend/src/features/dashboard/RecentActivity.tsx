'use client';

import React from 'react';
import { GitPullRequest, GitBranch, Play, CheckCircle2, GitCommit, ExternalLink } from 'lucide-react';
import { sampleActivities, sampleUsers } from '@/data/sample';
import { formatDate } from '@/lib/utils';

interface RecentActivityProps {
  activities?: any[];
  users?: any[];
  recentCommits?: any[];
}

export default function RecentActivity({ activities = [], users = [], recentCommits = [] }: RecentActivityProps) {
  const isLiveCommits = recentCommits && recentCommits.length > 0;
  const displayActivities = activities.length > 0 ? activities : sampleActivities;
  const displayUsers = users.length > 0 ? users : sampleUsers;

  const getIcon = (type: string, action: string) => {
    if (type === 'pr') return <GitPullRequest size={14} className="text-purple-400" />;
    if (type === 'branch') return <GitBranch size={14} className="text-indigo-400" />;
    if (action.includes('editing')) return <Play size={14} className="text-amber-400 animate-pulse" fill="#f59e0b" />;
    return <CheckCircle2 size={14} className="text-emerald-400" />;
  };

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm h-full flex flex-col justify-between">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">
              {isLiveCommits ? 'Live GitHub Commits' : 'Live Activity Feed'}
            </h3>
            {isLiveCommits && (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                GitHub API
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">
            {isLiveCommits ? 'Recent repository commits & contributions' : 'Real-time status changes and developer logs'}
          </p>
        </div>
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto max-h-[300px] pr-1">
        {isLiveCommits ? (
          recentCommits.map((commit, i) => (
            <div key={commit.sha || i} className="flex gap-3 text-xs leading-5">
              <div className="relative flex-shrink-0">
                {commit.avatarUrl ? (
                  <img
                    src={commit.avatarUrl}
                    alt={commit.author}
                    className="h-7 w-7 rounded-full border border-zinc-800 object-cover"
                  />
                ) : (
                  <div className="h-7 w-7 rounded-full border border-zinc-800 bg-indigo-950/40 border-indigo-500/30 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                    {(commit.author || 'GH').substring(0, 2)}
                  </div>
                )}
                <span className="absolute -bottom-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-zinc-900 bg-zinc-950 p-0.5 shadow-sm">
                  <GitCommit size={12} className="text-indigo-400" />
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-zinc-300">
                  <span className="font-semibold text-white">{commit.author}</span>{' '}
                  <span className="text-zinc-400">committed</span>{' '}
                  <a
                    href={commit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded hover:underline"
                  >
                    {commit.sha}
                    <ExternalLink size={9} />
                  </a>
                </p>
                <p className="text-[11px] text-zinc-300 mt-0.5 font-medium truncate">
                  {commit.message}
                </p>
                <span className="text-[9px] text-zinc-600 block mt-0.5">
                  {commit.date ? formatDate(commit.date) : 'Recently'}
                </span>
              </div>
            </div>
          ))
        ) : (
          displayActivities.map((act) => {
            const user = displayUsers.find((u) => u.id === (act.userId || act.user_id));
            const userName = user?.full_name || user?.username || user?.name || 'User';
            const avatarUrl = user?.avatarUrl || user?.avatar_url;
            const entityName = act.entityName || act.entity_id || act.action;
            const timestamp = act.timestamp || act.created_at;

            return (
              <div key={act.id} className="flex gap-3 text-xs leading-5">
                <div className="relative flex-shrink-0">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="h-7 w-7 rounded-full border border-zinc-800 object-cover"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full border border-zinc-800 bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-indigo-400 uppercase">
                      {userName.substring(0, 2)}
                    </div>
                  )}
                  <span className="absolute -bottom-1.5 -right-1 flex h-4.5 w-4.5 items-center justify-center rounded-full border border-zinc-900 bg-zinc-950 p-0.5 shadow-sm">
                    {getIcon(act.entityType || act.entity_type, act.action)}
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-zinc-300">
                    <span className="font-semibold text-white">{userName}</span>{' '}
                    <span className="text-zinc-400">{act.action}</span>{' '}
                    <span className="font-mono text-[10px] text-indigo-400 bg-indigo-950/20 border border-indigo-900/30 px-1.5 py-0.5 rounded">
                      {entityName}
                    </span>
                  </p>
                  {act.details && (
                    <p className="text-[10px] text-zinc-500 mt-0.5 italic">
                      {typeof act.details === 'object' ? JSON.stringify(act.details) : act.details}
                    </p>
                  )}
                  <span className="text-[9px] text-zinc-600 block mt-0.5">{timestamp ? formatDate(timestamp) : 'Just now'}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
