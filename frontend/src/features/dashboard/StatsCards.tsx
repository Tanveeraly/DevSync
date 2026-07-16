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
}

export default function StatsCards() {
  const stats: StatItem[] = [
    {
      name: 'Total Issues',
      value: '7 active',
      change: '+14% this week',
      changeType: 'increase',
      icon: Layers,
      sparklineData: [4, 5, 3, 6, 5, 8, 7],
      color: 'stroke-indigo-500',
    },
    {
      name: 'Open Pull Requests',
      value: '2 pending',
      change: '-5% this week',
      changeType: 'decrease',
      icon: GitPullRequest,
      sparklineData: [3, 2, 4, 3, 2, 3, 2],
      color: 'stroke-amber-500',
    },
    {
      name: 'Commits (Last 7 Days)',
      value: '87 commits',
      change: '+28% vs last week',
      changeType: 'increase',
      icon: GitCommit,
      sparklineData: [12, 18, 8, 25, 14, 4, 6],
      color: 'stroke-emerald-500',
    },
    {
      name: 'Contributors',
      value: '4 active',
      change: 'Steady state',
      changeType: 'neutral',
      icon: Users,
      sparklineData: [3, 3, 4, 4, 4, 4, 4],
      color: 'stroke-blue-500',
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => {
        // Calculate SVG path for sparkline
        const maxVal = Math.max(...stat.sparklineData);
        const minVal = Math.min(...stat.sparklineData);
        const range = maxVal - minVal || 1;
        const width = 100;
        const height = 30;
        const points = stat.sparklineData.map((val, index) => {
          const x = (index / (stat.sparklineData.length - 1)) * width;
          // Invert y because SVG y goes down
          const y = height - ((val - minVal) / range) * (height - 4) - 2;
          return `${x},${y}`;
        }).join(' ');

        return (
          <div 
            key={stat.name} 
            className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm transition-all hover:border-zinc-700"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-500">{stat.name}</span>
              <div className="rounded-lg bg-zinc-900/50 p-2 text-zinc-400 border border-zinc-800/80">
                <stat.icon size={16} />
              </div>
            </div>
            
            <div className="mt-2 flex items-baseline justify-between">
              <div>
                <span className="text-xl font-bold tracking-tight text-white">{stat.value}</span>
                <p className="mt-1 text-[10px] text-zinc-500">
                  <span className={
                    stat.changeType === 'increase' ? 'text-emerald-500 font-medium' :
                    stat.changeType === 'decrease' ? 'text-rose-500 font-medium' :
                    'text-zinc-500'
                  }>
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
