'use client';

import { useEffect, useState, useCallback } from 'react';
import { 
  Check, 
  Link2, 
  Loader2, 
  LogOut, 
  Users, 
  Lock, 
  Database, 
  ExternalLink, 
  Edit3, 
  Sparkles,
  GitBranch
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';
import { api } from '@/lib/api';

interface Contributor {
  name: string;
  commits?: number;
  prs?: number;
  reviews?: number;
  avatarUrl?: string;
  htmlUrl?: string;
}

const PRESET_ROLES = [
  'Software Developer',
  'Team Lead',
  'Frontend Engineer',
  'Backend Engineer',
  'Full Stack Developer',
  'DevOps Engineer',
  'UI/UX Designer',
  'QA Engineer',
];

export default function SettingsPage() {
  const [linked, setLinked] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedSlug, setSelectedSlug] = useState<string>('');
  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [contributorsLoading, setContributorsLoading] = useState(false);
  const [assignedTitles, setAssignedTitles] = useState<Record<string, string>>({});
  const [editingCustomUser, setEditingCustomUser] = useState<string | null>(null);
  const [customTitleInput, setCustomTitleInput] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saveNotification, setSaveNotification] = useState<string | null>(null);

  // Load saved titles from localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('devsync_contributor_titles');
        if (saved) {
          setAssignedTitles(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load saved contributor titles:', e);
      }
    }
  }, []);

  // Fetch contributors for a given project slug
  const loadContributors = useCallback(async (slug: string) => {
    if (!slug) {
      setContributors([]);
      return;
    }
    setContributorsLoading(true);
    try {
      const stats = await api.getGithubStats(slug);
      if (stats && Array.isArray(stats.contributors)) {
        setContributors(stats.contributors);

        // Auto-assign default roles if not yet assigned
        setAssignedTitles((prev) => {
          const updated = { ...prev };
          let changed = false;
          stats.contributors.forEach((c: Contributor, index: number) => {
            if (!updated[c.name]) {
              updated[c.name] = index === 0 ? 'Team Lead' : 'Software Developer';
              changed = true;
            }
          });
          if (changed && typeof window !== 'undefined') {
            localStorage.setItem('devsync_contributor_titles', JSON.stringify(updated));
          }
          return updated;
        });
      } else {
        setContributors([]);
      }
    } catch (err: any) {
      console.warn('Unable to load GitHub contributors for project:', slug, err);
      setContributors([]);
    } finally {
      setContributorsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    const initializeSettings = async () => {
      try {
        setLoading(true);

        // 1. Check GitHub OAuth status & Repositories
        const status = await api.getGithubStatus();
        setLinked(status.linked);
        if (status.linked) {
          try {
            setRepositories(await api.getGithubRepositories());
          } catch (repoErr) {
            console.warn('Failed to fetch repositories:', repoErr);
          }
        }

        // 2. Fetch Projects to discover active repository contributors
        try {
          const userProjects = await api.listProjects();
          setProjects(userProjects || []);

          if (userProjects && userProjects.length > 0) {
            // Prefer the first project that has a github_repo_url, or fallback to first
            const projectWithRepo = userProjects.find((p: any) => p.github_repo_url) || userProjects[0];
            setSelectedSlug(projectWithRepo.slug);
            await loadContributors(projectWithRepo.slug);
          }
        } catch (projErr) {
          console.warn('Failed to fetch projects:', projErr);
        }
      } catch (err: any) {
        setError(err.message || 'Unable to check workspace configuration.');
      } finally {
        setLoading(false);
      }
    };

    initializeSettings();

    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') setMessage('GitHub account connected successfully.');
    if (params.get('github') === 'error') setError('GitHub connection failed. Please try again.');
    window.history.replaceState({}, '', window.location.pathname);
  }, [loadContributors]);

  const handleProjectChange = async (slug: string) => {
    setSelectedSlug(slug);
    await loadContributors(slug);
  };

  const handleRoleChange = (contributorName: string, newRole: string) => {
    const updated = {
      ...assignedTitles,
      [contributorName]: newRole,
    };
    setAssignedTitles(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('devsync_contributor_titles', JSON.stringify(updated));
    }
    setSaveNotification(`Role for @${contributorName} updated to "${newRole}".`);
    setTimeout(() => setSaveNotification(null), 3000);
  };

  const saveCustomTitle = (contributorName: string) => {
    if (!customTitleInput.trim()) {
      setEditingCustomUser(null);
      return;
    }
    handleRoleChange(contributorName, customTitleInput.trim());
    setEditingCustomUser(null);
    setCustomTitleInput('');
  };

  const connect = async () => {
    setError('');
    try {
      await api.linkGithubAccount();
    } catch (err: any) {
      setError(err.message || 'Unable to start GitHub login.');
    }
  };

  const disconnect = async () => {
    if (!window.confirm('Disconnect your GitHub account?')) return;
    setLoading(true);
    try {
      await api.disconnectGithub();
      setLinked(false);
      setRepositories([]);
      setContributors([]);
      setMessage('GitHub account disconnected.');
    } catch (err: any) {
      setError(err.message || 'Unable to disconnect GitHub.');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find((p) => p.slug === selectedSlug);

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Workspace Settings</h2>
        <p className="text-xs text-zinc-500">Manage GitHub contributors, developer role titles, and real-time locking settings.</p>
      </div>

      {saveNotification && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-xs font-medium text-emerald-400 animate-in fade-in duration-200">
          <Check size={14} />
          <span>{saveNotification}</span>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Quick Configuration links */}
        <div className="space-y-4 md:col-span-2">
          {/* Card 1: Team profile list (GitHub Contributors) */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800/80 pb-3">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-indigo-400" />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold text-white">Team Members</h3>
                    <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 text-[9px] font-semibold text-indigo-400">
                      GitHub Contributors
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Assign and customize roles for repository contributors
                  </p>
                </div>
              </div>

              {/* Project selector if multiple projects exist */}
              {projects.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-zinc-500 font-medium">Project:</span>
                  <select
                    value={selectedSlug}
                    onChange={(e) => handleProjectChange(e.target.value)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-200 outline-none focus:border-indigo-500 transition-colors"
                  >
                    {projects.map((project) => (
                      <option key={project.id || project.slug} value={project.slug}>
                        {project.name} {project.github_repo_url ? `(${project.github_repo_url.split('/').slice(-2).join('/')})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Repository Info badge if linked */}
            {selectedProject?.github_repo_url && (
              <div className="flex items-center justify-between rounded-lg bg-zinc-950/70 border border-zinc-800/70 px-3 py-1.5 text-[11px]">
                <div className="flex items-center gap-2 text-zinc-400">
                  <GitBranch size={13} className="text-indigo-400" />
                  <span>Linked Repository:</span>
                  <span className="font-mono text-zinc-200 font-medium">{selectedProject.github_repo_url}</span>
                </div>
                {contributors.length > 0 && (
                  <span className="text-[10px] text-zinc-500">
                    {contributors.length} {contributors.length === 1 ? 'Contributor' : 'Contributors'}
                  </span>
                )}
              </div>
            )}
            
            {/* Contributors List */}
            {contributorsLoading ? (
              <div className="flex items-center justify-center gap-2.5 py-10 text-xs text-zinc-500">
                <Loader2 size={15} className="animate-spin text-indigo-400" />
                <span>Fetching contributors from GitHub...</span>
              </div>
            ) : contributors.length > 0 ? (
              <div className="divide-y divide-zinc-800/60">
                {contributors.map((contributor) => {
                  const currentTitle = assignedTitles[contributor.name] || 'Software Developer';
                  const isEditingCustom = editingCustomUser === contributor.name;

                  return (
                    <div key={contributor.name} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={contributor.avatarUrl || `https://avatar.vercel.sh/${contributor.name}`}
                          alt={contributor.name}
                          className="h-9 w-9 rounded-full border border-zinc-800 object-cover bg-zinc-900"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = `https://avatar.vercel.sh/${contributor.name}`;
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white">{contributor.name}</span>
                            {contributor.htmlUrl && (
                              <a
                                href={contributor.htmlUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-zinc-500 hover:text-indigo-400 transition-colors"
                                title="View on GitHub"
                              >
                                <ExternalLink size={11} />
                              </a>
                            )}
                          </div>
                          <div className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
                            <span className="text-indigo-400 font-medium">
                              {contributor.commits ?? 0} {contributor.commits === 1 ? 'commit' : 'commits'}
                            </span>
                            <span>•</span>
                            <span>GitHub Contributor</span>
                          </div>
                        </div>
                      </div>

                      {/* Title / Role Assignment Control */}
                      <div className="flex items-center gap-2">
                        {isEditingCustom ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              value={customTitleInput}
                              onChange={(e) => setCustomTitleInput(e.target.value)}
                              placeholder="e.g. Lead Architect"
                              className="rounded border border-indigo-500 bg-zinc-950 px-2.5 py-1 text-xs text-white outline-none w-40"
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') saveCustomTitle(contributor.name);
                                if (e.key === 'Escape') setEditingCustomUser(null);
                              }}
                            />
                            <button
                              type="button"
                              onClick={() => saveCustomTitle(contributor.name)}
                              className="rounded bg-indigo-600 px-2.5 py-1 text-[10px] font-semibold text-white hover:bg-indigo-500 transition-colors"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingCustomUser(null)}
                              className="rounded bg-zinc-800 px-2 py-1 text-[10px] text-zinc-400 hover:text-white transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <select
                              value={currentTitle}
                              onChange={(e) => {
                                if (e.target.value === '__custom__') {
                                  setEditingCustomUser(contributor.name);
                                  setCustomTitleInput(currentTitle);
                                } else {
                                  handleRoleChange(contributor.name, e.target.value);
                                }
                              }}
                              className={`rounded-lg border px-2.5 py-1 text-[10px] font-semibold outline-none cursor-pointer transition-colors ${
                                currentTitle.toLowerCase().includes('lead')
                                  ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-300'
                                  : currentTitle.toLowerCase().includes('devops')
                                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                                  : currentTitle.toLowerCase().includes('frontend')
                                  ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                                  : currentTitle.toLowerCase().includes('backend')
                                  ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                                  : currentTitle.toLowerCase().includes('designer')
                                  ? 'border-pink-500/40 bg-pink-500/10 text-pink-300'
                                  : 'border-zinc-700 bg-zinc-900 text-zinc-200 hover:border-zinc-600'
                              }`}
                            >
                              {PRESET_ROLES.map((role) => (
                                <option key={role} value={role} className="bg-zinc-900 text-zinc-100">
                                  {role}
                                </option>
                              ))}
                              {!PRESET_ROLES.includes(currentTitle) && (
                                <option value={currentTitle} className="bg-zinc-900 text-zinc-100">
                                  {currentTitle} (Custom)
                                </option>
                              )}
                              <option value="__custom__" className="bg-zinc-900 text-indigo-400 font-bold">
                                + Custom Role...
                              </option>
                            </select>

                            <button
                              type="button"
                              onClick={() => {
                                setEditingCustomUser(contributor.name);
                                setCustomTitleInput(currentTitle);
                              }}
                              title="Assign custom title"
                              className="p-1 rounded text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
                            >
                              <Edit3 size={12} />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-6 text-center space-y-2">
                <Users size={24} className="mx-auto text-zinc-600" />
                <div className="text-xs font-semibold text-zinc-300">No GitHub contributors available</div>
                <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                  {!linked
                    ? 'Connect your GitHub account in the integration card on the right to load live repository contributors.'
                    : !selectedProject?.github_repo_url
                    ? 'This project does not have a GitHub repository URL linked yet. Link one on the Dashboard or Projects view.'
                    : 'No contributors were returned by GitHub for this repository.'}
                </p>
                {!linked && (
                  <button
                    onClick={connect}
                    className="mt-2 inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition-colors"
                  >
                    <Github size={13} />
                    <span>Connect GitHub</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Card 2: Collision locks configuration */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Lock size={16} className="text-amber-400" />
              <h3 className="text-sm font-semibold text-white">Collision & Locking Mechanics</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-200">Optimistic Locking</div>
                  <p className="text-[10px] text-zinc-500">Verify issue version counter updates on each card move to prevent silent overwrites.</p>
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 font-bold text-[10px]">
                  ENABLED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-200">Assignment Locks</div>
                  <p className="text-[10px] text-zinc-500">Lock the issue card immediately when a developer opens the edit details dialog.</p>
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 font-bold text-[10px]">
                  ENABLED
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold text-zinc-200">WebSocket Broadcast Rooms</div>
                  <p className="text-[10px] text-zinc-500">Stream position moves and editing locks instantly to all project members.</p>
                </div>
                <span className="rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 font-bold text-[10px]">
                  ACTIVE
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Status details */}
        <div className="space-y-4">
          {/* Card 3: GitHub status */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm space-y-3">
            <div className="flex items-center justify-between border-b border-zinc-800/80 pb-2">
              <div className="flex items-center gap-2">
                <Github size={16} className="text-white" />
                <h3 className="text-sm font-semibold text-white">GitHub Integration</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${linked ? 'bg-emerald-500/10 text-emerald-400' : 'bg-zinc-800 text-zinc-500'}`}>
                {linked ? 'CONNECTED' : 'DISCONNECTED'}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center gap-2 py-3 text-[11px] text-zinc-500">
                <Loader2 size={13} className="animate-spin" /> Checking connection...
              </div>
            ) : linked ? (
              <div className="space-y-3">
                <p className="text-[11px] text-zinc-400">Your GitHub account is linked. Repositories accessible with your account:</p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {repositories.length === 0 ? (
                    <p className="rounded-lg bg-zinc-950/60 p-3 text-[10px] text-zinc-500">No repositories were returned by GitHub.</p>
                  ) : repositories.map((repository: any) => (
                    <div key={repository.id} className="flex items-center justify-between rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium text-zinc-200">{repository.full_name}</div>
                        <div className="text-[9px] text-zinc-600">{repository.private ? 'Private' : 'Public'}</div>
                      </div>
                      {repository.html_url ? (
                        <a
                          href={repository.html_url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-zinc-500 hover:text-white transition-colors"
                        >
                          <ExternalLink size={12} />
                        </a>
                      ) : (
                        <Link2 size={12} className="text-zinc-600" />
                      )}
                    </div>
                  ))}
                </div>
                <button onClick={disconnect} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 py-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50 transition-colors">
                  <LogOut size={12} /> Disconnect GitHub
                </button>
              </div>
            ) : (
              <button onClick={connect} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold text-black hover:bg-zinc-200 transition-colors">
                <Github size={14} /> Connect GitHub account
              </button>
            )}

            {message && <p className="rounded-lg bg-emerald-500/10 px-3 py-2 text-[10px] text-emerald-400">{message}</p>}
            {error && <p className="rounded-lg bg-rose-500/10 px-3 py-2 text-[10px] text-rose-400">{error}</p>}
          </div>

          {/* Card 4: Database status */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm space-y-3">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
              <Database size={16} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Database Sync</h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Connecting through asyncpg to PostgreSQL database instances. Alembic schema tracking holds version audits cleanly.
            </p>
            <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Migrations:</span>
                <span className="text-zinc-300">Head (v3_alembic)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Tables:</span>
                <span className="text-zinc-300">9 initialized</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
