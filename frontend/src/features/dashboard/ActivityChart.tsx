'use client';

import React from 'react';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer
} from 'recharts';
import { sampleCommitStats } from '@/data/sample';
import { Link2 } from 'lucide-react';

interface ActivityChartProps {
  data?: any[];
  error?: string | null;
  onLinkGithub?: () => void;
}

export default function ActivityChart({ data, error, onLinkGithub }: ActivityChartProps) {
  const chartData = data && data.length > 0 ? data : sampleCommitStats;
  const isLive = data && data.length > 0 && !error;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-white">Repository Activity</h3>
            {isLive ? (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                Live GitHub Data
              </span>
            ) : (
              <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">
                Sample Data
              </span>
            )}
          </div>
          <p className="text-[11px] text-zinc-500">Commits, PRs, and resolved issues over the past week</p>
          {error && (
            <div className="flex items-center gap-2 mt-1.5">
              <span className="text-[10px] text-amber-400 font-medium">{error}</span>
              {onLinkGithub && (
                <button
                  onClick={onLinkGithub}
                  className="flex items-center gap-1 text-[10px] text-indigo-400 hover:text-indigo-300 font-semibold underline underline-offset-2 transition-colors"
                >
                  <Link2 size={11} />
                  Link Repo URL
                </button>
              )}
            </div>
          )}
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
            data={chartData}
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
