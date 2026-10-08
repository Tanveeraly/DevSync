'use client';

import { useEffect, useState } from 'react';
import { Check, Link2, Loader2, LogOut, Users, Lock, Database } from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';
import { api } from '@/lib/api';
import { sampleUsers } from '@/data/sample';

export default function SettingsPage() {
  const [linked, setLinked] = useState(false);
  const [repositories, setRepositories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const loadGitHub = async () => {
      try {
        const status = await api.getGithubStatus();
        setLinked(status.linked);
        if (status.linked) {
          setRepositories(await api.getGithubRepositories());
        }
      } catch (err: any) {
        setError(err.message || 'Unable to check GitHub connection.');
      } finally {
        setLoading(false);
      }
    };
    loadGitHub();

    const params = new URLSearchParams(window.location.search);
    if (params.get('github') === 'connected') setMessage('GitHub account connected.');
    if (params.get('github') === 'error') setError('GitHub connection failed. Please try again.');
    window.history.replaceState({}, '', window.location.pathname);
  }, []);

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
      setMessage('GitHub account disconnected.');
    } catch (err: any) {
      setError(err.message || 'Unable to disconnect GitHub.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 text-left">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-white">Workspace Settings</h2>
        <p className="text-xs text-zinc-500">Manage developer profiles, GitHub credentials, and real-time locking settings.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Left column: Quick Configuration links */}
        <div className="space-y-4 md:col-span-2">
          {/* Card 1: Team profile list */}
          <div className="rounded-xl border border-zinc-800 bg-[#0f0f12] p-5 shadow-sm space-y-4">
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-3">
              <Users size={16} className="text-indigo-400" />
              <h3 className="text-sm font-semibold text-white">Team Members</h3>
            </div>
            
            <div className="divide-y divide-zinc-800/60">
              {sampleUsers.map((user) => (
                <div key={user.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <img
                      src={user.avatarUrl}
                      alt={user.name}
                      className="h-8 w-8 rounded-full border border-zinc-800 object-cover"
                    />
                    <div>
                      <div className="text-xs font-semibold text-white">{user.name}</div>
                      <div className="text-[10px] text-zinc-500">{user.email}</div>
                    </div>
                  </div>
                  <span className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[9px] font-medium text-zinc-400">
                    {user.role}
                  </span>
                </div>
              ))}
            </div>
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
                <p className="text-[11px] text-zinc-400">Your GitHub account is linked. Select a repository to use with a project.</p>
                <div className="max-h-40 space-y-1.5 overflow-y-auto">
                  {repositories.length === 0 ? (
                    <p className="rounded-lg bg-zinc-950/60 p-3 text-[10px] text-zinc-500">No repositories were returned by GitHub.</p>
                  ) : repositories.map((repository: any) => (
                    <div key={repository.id} className="flex items-center justify-between rounded-lg bg-zinc-950/60 border border-zinc-800 px-3 py-2">
                      <div className="min-w-0">
                        <div className="truncate text-[11px] font-medium text-zinc-200">{repository.full_name}</div>
                        <div className="text-[9px] text-zinc-600">{repository.private ? 'Private' : 'Public'}</div>
                      </div>
                      <Link2 size={12} className="text-zinc-600" />
                    </div>
                  ))}
                </div>
                <button onClick={disconnect} disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-lg border border-rose-500/30 py-2 text-[10px] font-semibold text-rose-400 hover:bg-rose-500/10 disabled:opacity-50">
                  <LogOut size={12} /> Disconnect GitHub
                </button>
              </div>
            ) : (
              <button onClick={connect} className="flex w-full items-center justify-center gap-2 rounded-lg bg-white py-2.5 text-[11px] font-bold text-black hover:bg-zinc-200">
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
