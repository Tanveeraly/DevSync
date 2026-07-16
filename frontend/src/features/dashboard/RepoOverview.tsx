'use client';

import React from 'react';
import { 
  PieChart, 
  Pie, 
  Cell, 
  ResponsiveContainer, 
  Tooltip 
} from 'recharts';

export default function RepoOverview() {
  const data = [
    { name: 'Backlog', value: 2, color: '#71717a' },
    { name: 'To Do', value: 1, color: '#f59e0b' },
    { name: 'In Progress', value: 2, color: '#6366f1' },
    { name: 'In Review', value: 1, color: '#3b82f6' },
    { name: 'Done', value: 1, color: '#10b981' },
  ];

  const total = data.reduce((acc, curr) => acc + curr.value, 0);

  return (
    <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm flex flex-col justify-between h-full">
      <div>
        <h3 className="text-sm font-semibold text-white">Issue Distribution</h3>
        <p className="text-[11px] text-zinc-500">Current status breakdown of workspace issues</p>
      </div>

      <div className="relative my-4 flex items-center justify-center h-44">
        {/* Center Text */}
        <div className="absolute flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-extrabold text-white">{total}</span>
          <span className="text-[9px] font-medium tracking-wider text-zinc-500 uppercase">Issues</span>
        </div>

        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={70}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f0f12" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: '#09090b',
                border: '1px solid #27272a',
                borderRadius: '8px',
                fontSize: '11px',
                color: '#fafafa',
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Legend list */}
      <div className="space-y-1.5 mt-2">
        {data.map((item) => (
          <div key={item.name} className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full border border-[#0f0f12]" style={{ backgroundColor: item.color }} />
              <span className="text-zinc-400 font-medium">{item.name}</span>
            </div>
            <span className="font-semibold text-white">{item.value} ({Math.round((item.value / total) * 100)}%)</span>
          </div>
        ))}
      </div>
    </div>
  );
}
