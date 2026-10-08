'use client';

import React from 'react';
import { Layers, GitPullRequest, GitCommit, Users } from 'lucide-react';

interface StatItem {
  name: string;
  value: string;
  change: string;
  changeType: 'increase' | 'decrease' | 'neutral';
  icon: React.ElementType;
  sparklineData: number[];
  color: string;
  badge?: string;
}

interface StatsCardsProps {
  issues?: any[];
  users?: any[];
  activities?: any[];
  githubStats?: any;
  githubConnected?: boolean;
  hasRepositoryUrl?: boolean;
}

export default function StatsCards({
  issues = [],
  users = [],
  activities = [],
  githubStats,
  githubConnected = false,
  hasRepositoryUrl = false,
}: StatsCardsProps) {
  const totalIssuesCount = issues.length;
  const activeIssues = issues.filter((i) => i.status !== 'done').length;
  const activitiesCount = activities.length;

  // Prefer live GitHub data for PRs and contributors
  const openPrsCount: number = githubStats?.open_prs_count ?? 0;
  const ghContributors: any[] = githubStats?.contributors ?? [];
  const contributorCount = ghContributors.length || users.length;

  // Build sparkline from commits_by_day (last 7 days)
  const commitsByDay: any[] = githubStats?.commits_by_day ?? [];
  const commitSparkline =
    commitsByDay.length > 0
      ? commitsByDay.map((d: any) => d.commits)
      : [0, 0, 0, 0, 0, 0, 1];
  const prSparkline =
    commitsByDay.length > 0
      ? commitsByDay.map((d: any) => d.prs)
      : [0, 0, 0, 0, 0, 0, openPrsCount || 1];

  const isLive = !!githubStats && !githubStats.error;
  const repositoryStatus = !hasRepositoryUrl
    ? 'Link a repository'
    : !githubConnected
      ? 'Connect GitHub account'
      : isLive
        ? 'Live from GitHub'
        : 'GitHub data unavailable';

  const stats: StatItem[] = [
    {
      name: 'Total Issues',
      value: `${totalIssuesCount} issue${totalIssuesCount === 1 ? '' : 's'}`,
      change: `${activeIssues} active`,
      changeType: 'neutral',
      icon: Layers,
      sparklineData: [4, 5, 3, 6, 5, 8, Math.max(1, totalIssuesCount)],
      color: 'stroke-indigo-500',
    },
    {
      name: 'Open PRs',
      value: `${openPrsCount} PR${openPrsCount === 1 ? '' : 's'}`,
      change: repositoryStatus,
      changeType: openPrsCount > 0 ? 'increase' : 'neutral',
      icon: GitPullRequest,
      sparklineData: prSparkline.map((v) => Math.max(0, v)),
      color: 'stroke-amber-500',
      badge: isLive ? 'Live' : undefined,
    },
    {
      name: 'Logged Activities',
      value: `${activitiesCount} event${activitiesCount === 1 ? '' : 's'}`,
      change: 'Real-time feed',
      changeType: 'increase',
      icon: GitCommit,
      sparklineData: [12, 18, 8, 25, 14, 4, Math.max(1, activitiesCount)],
      color: 'stroke-emerald-500',
    },
    {
      name: 'Contributors',
      value: `${contributorCount} member${contributorCount === 1 ? '' : 's'}`,
      change: isLive
        ? `${githubStats?.recent_commits?.length ?? 0} recent commits`
        : repositoryStatus,
      changeType: 'neutral',
      icon: Users,
      sparklineData: commitSparkline.map((v) => Math.max(0, v)),
      color: 'stroke-blue-500',
      badge: isLive ? 'Live' : undefined,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        const maxVal = Math.max(...stat.sparklineData, 1);
        const minVal = Math.min(...stat.sparklineData);
        const range = maxVal - minVal || 1;
        const width = 100;
        const height = 30;
        const points = stat.sparklineData
          .map((val, index) => {
            const x = (index / (stat.sparklineData.length - 1)) * width;
            const y = height - ((val - minVal) / range) * (height - 4) - 2;
            return `${x},${y}`;
          })
          .join(' ');

        return (
          <div
            key={stat.name}
            className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm transition-all hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-zinc-500">{stat.name}</span>
                {stat.badge && (
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                    {stat.badge}
                  </span>
                )}
              </div>
              <div className="rounded-lg bg-zinc-900/50 p-2 text-zinc-400 border border-zinc-800/80">
                <stat.icon size={16} />
              </div>
            </div>

            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-xl font-bold tracking-tight text-white">{stat.value}</span>
                <p className="mt-1 text-[10px] text-zinc-500">
                  <span
                    className={
                      stat.changeType === 'increase'
                        ? 'text-emerald-500 font-medium'
                        : stat.changeType === 'decrease'
                        ? 'text-rose-500 font-medium'
                        : 'text-zinc-500'
                    }
                  >
                    {stat.change}
                  </span>
                </p>
              </div>

              {/* SVG Sparkline */}
              <div className="h-8 w-24">
                <svg className="h-full w-full" viewBox="0 0 100 30">
                  <polyline
                    fill="none"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={stat.color}
                    points={points}
                  />
                </svg>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
