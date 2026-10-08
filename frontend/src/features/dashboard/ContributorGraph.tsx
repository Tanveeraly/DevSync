'use client';

import React from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { sampleContributorStats } from '@/data/sample';

interface ContributorGraphProps {
  data?: any[];
  isLoaded?: boolean;
  hasRepositoryUrl?: boolean;
  githubConnected?: boolean;
}

export default function ContributorGraph({
  data,
  isLoaded = false,
  hasRepositoryUrl = false,
  githubConnected = false,
}: ContributorGraphProps) {
  const chartData = data && data.length > 0 ? data : sampleContributorStats;
  const isLive = isLoaded && data && data.length > 0;
  const unavailableMessage = !hasRepositoryUrl
    ? 'Link a repository URL to load contributor activity.'
    : !githubConnected
      ? 'Connect your GitHub account to load contributor activity.'
      : 'Contributor activity is temporarily unavailable.';

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Team Contribution</h3>
            {isLive ? (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Live GitHub Data
              </span>
            ) : (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                {hasRepositoryUrl && githubConnected ? 'Unavailable' : 'Not Connected'}
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">Commits, PRs, and reviews by team member</p>
          {!isLive && <p className="mt-1 text-[10px] text-amber-400">{unavailableMessage}</p>}
        </div>
      </div>

      <div className="h-72 w-full">
        {isLive ? (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              barSize={16}
            >
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <YAxis 
              stroke="#52525b" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false} 
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#fafafa',
              }}
              cursor={{ fill: '#18181b', opacity: 0.4 }}
            />
            <Legend 
              wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
              iconType="circle"
              iconSize={8}
            />
              <Bar dataKey="commits" name="Commits" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="prs" name="PRs" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              <Bar dataKey="reviews" name="Reviews Verified" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-lg border border-dashed border-zinc-800 bg-zinc-950/30 px-6 text-center">
            <div>
              <p className="text-xs font-medium text-zinc-300">Contributor data is unavailable</p>
              <p className="mt-1 text-[10px] text-zinc-600">Connect GitHub to load live contributions.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
