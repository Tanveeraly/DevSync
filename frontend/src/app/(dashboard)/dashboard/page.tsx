'use client';

import React from 'react';
import StatsCards from '@/features/dashboard/StatsCards';
import ActivityChart from '@/features/dashboard/ActivityChart';
import RepoOverview from '@/features/dashboard/RepoOverview';
import ContributorGraph from '@/features/dashboard/ContributorGraph';
import RecentActivity from '@/features/dashboard/RecentActivity';

export default function DashboardPage() {
  return (
    <div className="space-y-6 text-left">
      {/* Header Info */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Dashboard</h2>
        <p className="text-xs text-zinc-500">Real-time visualization of codebase contributions, issue tracking, and activity logs.</p>
      </div>

      {/* Main Metrics cards */}
      <StatsCards />

      {/* Primary Graphs Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityChart />
        </div>
        <div>
          <RepoOverview />
        </div>
      </div>

      {/* Secondary Graphs Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ContributorGraph />
        </div>
        <div>
          <RecentActivity />
        </div>
      </div>
    </div>
  );
}
