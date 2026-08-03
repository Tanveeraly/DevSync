'use client';

import React, { useState } from 'react';
import { X, Link2, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface SetGithubRepoModalProps {
  open: boolean;
  projectSlug: string;
  currentRepoUrl?: string;
  onClose: () => void;
  onSaved: () => void;
}

export default function SetGithubRepoModal({
  open,
  projectSlug,
  currentRepoUrl = '',
  onClose,
  onSaved,
}: SetGithubRepoModalProps) {
  const [repoUrl, setRepoUrl] = useState(currentRepoUrl);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repoUrl.trim()) return;

    setLoading(true);
    setError('');

    try {
      await api.updateProject(projectSlug, {
        github_repo_url: repoUrl.trim(),
      });
      onSaved();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update GitHub repository URL.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0f0f12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden text-left">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30">
              <Link2 size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Link GitHub Repository</h2>
              <p className="text-[10px] text-zinc-500">Connect a repository to fetch live commits & PRs</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              GitHub Repository URL or Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. https://github.com/Tanveeraly/DevSync or owner/repo"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30 transition-all font-mono"
            />
            <p className="text-[10px] text-zinc-500 mt-1.5">
              Accepts full URL (<code className="text-indigo-300 font-mono">https://github.com/owner/repo</code>) or shorthand (<code className="text-indigo-300 font-mono">owner/repo</code>).
            </p>
          </div>

          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-800 bg-transparent py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check size={13} />
                  Save & Connect
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
