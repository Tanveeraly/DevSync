'use client';

import React, { useEffect, useState, useCallback } from 'react';
import StatsCards from '@/features/dashboard/StatsCards';
import ActivityChart from '@/features/dashboard/ActivityChart';
import RepoOverview from '@/features/dashboard/RepoOverview';
import ContributorGraph from '@/features/dashboard/ContributorGraph';
import RecentActivity from '@/features/dashboard/RecentActivity';
import { api } from '@/lib/api';
import { FolderPlus, Rocket, Zap, GitMerge, ArrowRight, Link2, ChevronDown, Loader2 } from 'lucide-react';
import CreateProjectModal from '@/components/ui/CreateProjectModal';
import SetGithubRepoModal from '@/components/ui/SetGithubRepoModal';
import { useRouter } from 'next/navigation';

interface DashboardProject {
  id: string;
  name: string;
  slug: string;
  github_repo_url?: string | null;
}

interface DashboardData {
  projects: DashboardProject[];
  users: Record<string, unknown>[];
  issues: Record<string, unknown>[];
  activities: Record<string, unknown>[];
}

interface GithubStats {
  error?: string | null;
  open_prs_count?: number;
  commits_by_day?: Record<string, unknown>[];
  contributors?: Record<string, unknown>[];
  recent_commits?: Record<string, unknown>[];
}

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<DashboardData>({
    projects: [],
    users: [],
    issues: [],
    activities: [],
  });
  const [githubStats, setGithubStats] = useState<GithubStats | null>(null);
  const [githubConnection, setGithubConnection] = useState<{ linked: boolean; loading: boolean }>({ linked: false, loading: true });
  const [loading, setLoading] = useState(true);
  const [projectDataLoading, setProjectDataLoading] = useState(false);
  const [projectDataError, setProjectDataError] = useState('');
  const [selectedProjectSlug, setSelectedProjectSlug] = useState('');
  const [showCreateProject, setShowCreateProject] = useState(false);
  const [showSetGithubModal, setShowSetGithubModal] = useState(false);

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [projects, status] = await Promise.all([
        api.listProjects(),
        api.getGithubStatus(),
      ]);
      setData({ projects, users: [], issues: [], activities: [] });
      setGithubStats(null);
      setProjectDataError('');
      setProjectDataLoading(projects.length > 0);
      setSelectedProjectSlug((currentSlug) =>
        projects.some((project: DashboardProject) => project.slug === currentSlug)
          ? currentSlug
          : projects[0]?.slug || '',
      );
      setGithubConnection({ linked: status.linked, loading: false });
    } catch (err) {
      setGithubConnection({ linked: false, loading: false });
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadDashboard);
  }, [loadDashboard]);

  useEffect(() => {
    const project = data.projects.find((item) => item.slug === selectedProjectSlug);
    if (!project) return;

    let active = true;

    const loadSelectedProject = async () => {
      try {
        const [issues, activities, users] = await Promise.all([
          api.listIssues(project.slug),
          api.listActivities(project.slug),
          api.listProjectMembers(project.slug),
        ]);
        if (active) {
          setData((currentData) => ({ ...currentData, issues, activities, users }));
        }
      } catch (err) {
        if (active) {
          setProjectDataError(
            err instanceof Error ? err.message : 'Unable to load selected project data.',
          );
        }
      }

      if (active && githubConnection.linked && project.github_repo_url) {
        try {
          const stats = await api.getGithubStats(project.slug);
          if (active) setGithubStats(stats);
        } catch (err) {
          if (active) {
            setGithubStats({
              error: err instanceof Error ? err.message : 'Unable to load GitHub statistics.',
            });
          }
        }
      }
      if (active) setProjectDataLoading(false);
    };

    void Promise.resolve().then(loadSelectedProject);
    return () => {
      active = false;
    };
  }, [data.projects, selectedProjectSlug, githubConnection.linked]);

  const handleProjectCreated = async (project: DashboardProject) => {
    setShowCreateProject(false);
    router.push(`/board/${project.slug}`);
  };

  const handleRepositorySaved = async (updatedProject: { github_repo_url: string }) => {
    setData((currentData) => ({
      ...currentData,
      projects: currentData.projects.map((project) =>
        project.slug === activeProject?.slug
          ? { ...project, github_repo_url: updatedProject.github_repo_url }
          : project
      ),
    }));

    await loadDashboard();
  };

  const activeProject =
    data.projects.find((project) => project.slug === selectedProjectSlug) || null;
  const hasRepositoryUrl = Boolean(activeProject?.github_repo_url);

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
            Create your first project to start syncing your team&apos;s work. Each project gets its own
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
          {data.projects.length > 0 && (
            <label className="relative flex items-center">
              <span className="sr-only">Select project for dashboard stats</span>
              <select
                value={selectedProjectSlug}
                onChange={(event) => {
                  setSelectedProjectSlug(event.target.value);
                  setProjectDataLoading(true);
                  setProjectDataError('');
                  setData((currentData) => ({
                    ...currentData,
                    users: [],
                    issues: [],
                    activities: [],
                  }));
                  setGithubStats(null);
                }}
                aria-label="Select project for dashboard stats"
                className="min-w-48 appearance-none rounded-lg border border-zinc-800 bg-[#0f0f12] py-2 pl-3 pr-9 text-xs font-medium text-zinc-200 outline-none transition focus:border-indigo-500"
              >
                {data.projects.map((project) => (
                  <option key={project.id} value={project.slug}>
                    {project.name}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                aria-hidden="true"
                className="pointer-events-none absolute right-3 text-zinc-500"
              />
            </label>
          )}
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

      {projectDataLoading && (
        <div className="flex items-center gap-2 text-xs text-zinc-500" role="status">
          <Loader2 size={13} className="animate-spin text-indigo-400" />
          Loading {activeProject?.name} statistics...
        </div>
      )}
      {projectDataError && (
        <div className="rounded-lg border border-rose-500/30 bg-rose-500/5 px-4 py-2.5 text-xs text-rose-300" role="alert">
          {projectDataError}
        </div>
      )}

      {/* Main Metrics cards */}
      <StatsCards
        issues={data.issues}
        users={data.users}
        activities={data.activities}
        githubStats={githubStats}
        githubConnected={githubConnection.linked}
        hasRepositoryUrl={hasRepositoryUrl}
      />

      {/* Primary Graphs Row */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
          <ActivityChart
            data={githubStats?.commits_by_day}
            error={githubStats?.error}
            isLoaded={Boolean(githubStats && !githubStats.error)}
            hasRepositoryUrl={hasRepositoryUrl}
            githubConnected={githubConnection.linked}
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
          <ContributorGraph
            data={githubStats?.contributors}
            isLoaded={Boolean(githubStats && !githubStats.error)}
            hasRepositoryUrl={hasRepositoryUrl}
            githubConnected={githubConnection.linked}
          />
        </div>
        <div>
          <RecentActivity
            activities={data.activities}
            users={data.users}
            recentCommits={githubStats?.recent_commits}
            isGithubLoaded={Boolean(githubStats && !githubStats.error)}
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
          onSaved={handleRepositorySaved}
        />
      )}
    </div>
  );
}
