'use client';

import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';
import { Layers } from 'lucide-react';

interface RepoOverviewProps {
  issues?: any[];
}

export default function RepoOverview({ issues = [] }: RepoOverviewProps) {
  const counts = {
    backlog: issues.filter(i => (i.status || '').toLowerCase() === 'backlog').length,
    todo: issues.filter(i => (i.status || '').toLowerCase() === 'todo').length,
    in_progress: issues.filter(i => (i.status || '').toLowerCase() === 'in_progress').length,
    review: issues.filter(i => (i.status || '').toLowerCase() === 'review').length,
    done: issues.filter(i => (i.status || '').toLowerCase() === 'done').length,
  };

  const rawData = [
    { name: 'Backlog',      value: counts.backlog,      color: '#71717a' },
    { name: 'To Do',        value: counts.todo,         color: '#f59e0b' },
    { name: 'In Progress',  value: counts.in_progress,  color: '#6366f1' },
    { name: 'In Review',    value: counts.review,       color: '#3b82f6' },
    { name: 'Done',         value: counts.done,         color: '#10b981' },
  ];

  const total = rawData.reduce((acc, curr) => acc + curr.value, 0);

  // When all zero, show a placeholder slice so chart doesn't vanish
  const chartData = total === 0
    ? [{ name: 'No Issues Yet', value: 1, color: '#27272a' }]
    : rawData;

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-semibold text-white">Issue Distribution</h3>
        <p className="text-[11px] text-zinc-500">Current status breakdown of workspace issues</p>
      </div>

      <div className="relative my-4 flex items-center justify-center h-44">
        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center pointer-events-none">
          {total === 0 ? (
            <>
              <Layers size={20} className="text-zinc-600 mb-1" />
              <span className="text-[9px] font-medium tracking-wider text-zinc-600 uppercase">No Issues</span>
            </>
          ) : (
            <>
              <span className="text-2xl font-extrabold text-white">{total}</span>
              <span className="text-[9px] font-medium tracking-wider text-zinc-500 uppercase">Issues</span>
            </>
          )}
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              paddingAngle={total === 0 ? 0 : 4}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f0f12" strokeWidth={2} />
              ))}
            </Pie>
            {total > 0 && (
              <Tooltip
                contentStyle={{
                  backgroundColor: '#09090b',
                  border: '1px solid #27272a',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: '#fafafa',
                }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 mt-2">
        {total === 0 ? (
          <p className="text-center text-[10px] text-zinc-600">
            Create issues on the board to see distribution
          </p>
        ) : (
          rawData.map((item) => (
            <div key={item.name} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full border border-[#0f0f12]" style={{ backgroundColor: item.color }} />
                <span className="text-zinc-400 font-medium">{item.name}</span>
              </div>
              <span className="font-semibold text-white">
                {item.value} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
