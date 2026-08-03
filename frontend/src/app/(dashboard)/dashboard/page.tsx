'use client';

import React, { useEffect, useState, useCallback } from 'react';
import StatsCards from '@/features/dashboard/StatsCards';
import ActivityChart from '@/features/dashboard/ActivityChart';
import RepoOverview from '@/features/dashboard/RepoOverview';
import ContributorGraph from '@/features/dashboard/ContributorGraph';
import RecentActivity from '@/features/dashboard/RecentActivity';
import { api } from '@/lib/api';
import { FolderPlus, Rocket, Zap, GitMerge, ArrowRight, Link2 } from 'lucide-react';
import CreateProjectModal from '@/components/ui/CreateProjectModal';
import SetGithubRepoModal from '@/components/ui/SetGithubRepoModal';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<{ projects: any[]; users: any[]; issues: any[]; activities: any[] }>({
    projects: [],
    users: [],
    issues: [],
    activities: [],
  });
  const [githubStats, setGithubStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showSetGithubModal, setShowSetGithubModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const dashboardData = await api.getDashboardData();
      setData(dashboardData);

      if (dashboardData.projects.length > 0) {
        const firstSlug = dashboardData.projects[0].slug;
        try {
          const stats = await api.getGithubStats(firstSlug);
          setGithubStats(stats);
        } catch (err) {
          console.error('Failed to fetch github stats:', err);
        }
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleProjectCreated = async (project: any) => {
    setShowCreateProject(false);
    router.push(`/board/${project.slug}`);
  };

  const activeProject = data.projects.length > 0 ? data.projects[0] : null;

  // Empty state — no projects yet
  if (!loading && data.projects.length === 0) {
    return (
      <div className="space-y-6 text-left">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-xs text-zinc-500">Real-time visualization of codebase contributions, issue tracking, and activity logs.</p>
        </div>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="relative mb-8">
            <div className="absolute inset-0 rounded-full bg-indigo-600/20 blur-2xl scale-150" />
            <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-600/10 border border-indigo-500/30">
              <FolderPlus size={36} className="text-indigo-400" />
            </div>
          </div>

          <h3 className="text-2xl font-extrabold text-white mb-3">No Projects Yet</h3>
          <p className="text-zinc-400 text-sm max-w-md mb-8 leading-relaxed">
            Create your first project to start syncing your team's work. Each project gets its own
            real-time Kanban board with collision prevention and live WebSocket updates.
          </p>

          <div className="grid grid-cols-3 gap-4 mb-10 max-w-lg w-full">
            {[
              { icon: Zap, label: 'Live WebSockets', desc: 'Real-time board sync' },
              { icon: GitMerge, label: 'GitHub Webhooks', desc: 'Auto-advance tasks on merge' },
              { icon: Rocket, label: 'Collision Prevention', desc: 'Optimistic locking built-in' },
            ].map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-4 text-left"
              >
                <Icon size={16} className="text-indigo-400 mb-2" />
                <div className="text-xs font-semibold text-white">{label}</div>
                <div className="text-[10px] text-zinc-500 mt-0.5">{desc}</div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 px-7 py-3.5 text-sm font-semibold text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5"
          >
            <FolderPlus size={16} />
            Create Your First Project
            <ArrowRight size={15} />
          </button>
        </div>

        <CreateProjectModal
          open={showCreateProject}
          onClose={() => setShowCreateProject(false)}
          onCreated={handleProjectCreated}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 text-left">
      {/* Header Info */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-white">Dashboard</h2>
          <p className="text-xs text-zinc-500">
            Real-time visualization for {activeProject?.name || 'Workspace'}
            {activeProject?.github_repo_url && (
              <span className="ml-2 font-mono text-indigo-400">({activeProject.github_repo_url})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {activeProject && (
            <button
              onClick={() => setShowSetGithubModal(true)}
              className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0f0f12] hover:bg-zinc-900 px-3.5 py-2 text-xs font-semibold text-zinc-300 transition-all"
            >
              <Link2 size={13} className="text-indigo-400" />
              {activeProject.github_repo_url ? 'Change GitHub Repo' : 'Link GitHub Repo'}
            </button>
          )}
          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-3.5 py-2 text-xs font-semibold text-white transition-all shadow-md hover:shadow-[0_0_12px_rgba(99,102,241,0.4)]"
          >
            <FolderPlus size={13} />
            New Project
          </button>
        </div>
      </div>

      {/* Main Metrics cards */}
      <StatsCards issues={data.issues} users={data.users} activities={data.activities} githubStats={githubStats} />

      {/* Primary Graphs Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityChart
            data={githubStats?.commits_by_day}
            error={githubStats?.error}
            onLinkGithub={() => setShowSetGithubModal(true)}
          />
        </div>
        <div>
          <RepoOverview issues={data.issues} />
        </div>
      </div>

      {/* Secondary Graphs Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ContributorGraph data={githubStats?.contributors} />
        </div>
        <div>
          <RecentActivity
            activities={data.activities}
            users={data.users}
            recentCommits={githubStats?.recent_commits}
          />
        </div>
      </div>

      {/* Modals */}
      <CreateProjectModal
        open={showCreateProject}
        onClose={() => setShowCreateProject(false)}
        onCreated={handleProjectCreated}
      />

      {activeProject && (
        <SetGithubRepoModal
          open={showSetGithubModal}
          projectSlug={activeProject.slug}
          currentRepoUrl={activeProject.github_repo_url || ''}
          onClose={() => setShowSetGithubModal(false)}
          onSaved={loadDashboard}
        />
      )}
    </div>
  );
}
