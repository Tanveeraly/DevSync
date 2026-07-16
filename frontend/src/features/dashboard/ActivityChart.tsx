'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from 'recharts';
import { sampleCommitStats } from '@/data/sample';

export default function ActivityChart() {
  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Repository Activity</h3>
          <p className="text-[11px] text-zinc-500">Commits, PRs, and resolved issues over the past week</p>
        </div>
        <div className="flex gap-2">
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-indigo-500" /> Commits
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> PRs
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-zinc-400">
            <span className="h-2 w-2 rounded-full bg-emerald-500" /> Resolved
          </span>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sampleCommitStats}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="commitsColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="prsColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="resolvedColor" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1f1f23" vertical={false} />
            <XAxis 
              dataKey="day" 
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
              cursor={{ stroke: '#27272a', strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="commits"
              name="Commits"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#commitsColor)"
            />
            <Area
              type="monotone"
              dataKey="prs"
              name="PRs"
              stroke="#f59e0b"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#prsColor)"
            />
            <Area
              type="monotone"
              dataKey="issuesClosed"
              name="Resolved"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#resolvedColor)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
