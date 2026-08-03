'use client';

import React, { useState, useEffect } from 'react';
import { X, FolderPlus, Link2, Loader2, Check } from 'lucide-react';
import { api } from '@/lib/api';

interface CreateProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (project: any) => void;
}

function slugify(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40);
}

export default function CreateProjectModal({ open, onClose, onCreated }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [slugEdited, setSlugEdited] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from name unless user manually edited it
  useEffect(() => {
    if (!slugEdited) {
      setSlug(slugify(name));
    }
  }, [name, slugEdited]);

  const handleClose = () => {
    setName('');
    setSlug('');
    setDescription('');
    setGithubUrl('');
    setSlugEdited(false);
    setError('');
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    setError('');

    try {
      const project = await api.createProject({
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim() || undefined,
        github_repo_url: githubUrl.trim() || undefined,
      });
      onCreated(project);
      handleClose();
    } catch (err: any) {
      setError(err.message || 'Failed to create project. The slug may already be taken.');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-[#0f0f12] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/20 border border-indigo-500/30">
              <FolderPlus size={18} className="text-indigo-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">New Project</h2>
              <p className="text-[10px] text-zinc-500">Set up a new workspace for your team</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. DevSync Core"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30 transition-all"
            />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Project Slug <span className="text-rose-500">*</span>
              <span className="text-zinc-600 font-normal ml-2">(used in board URLs)</span>
            </label>
            <div className="flex items-center rounded-lg border border-zinc-800 bg-zinc-950 overflow-hidden focus-within:border-indigo-600 focus-within:ring-1 focus-within:ring-indigo-600/30 transition-all">
              <span className="px-3 py-2.5 text-xs text-zinc-600 font-mono border-r border-zinc-800 bg-zinc-900/50 select-none">
                /board/
              </span>
              <input
                type="text"
                required
                placeholder="devsync-core"
                value={slug}
                onChange={(e) => {
                  setSlug(slugify(e.target.value));
                  setSlugEdited(true);
                }}
                className="flex-1 bg-transparent px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none font-mono"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              Description <span className="text-zinc-600 font-normal">(optional)</span>
            </label>
            <textarea
              rows={2}
              placeholder="What is this project about?"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30 transition-all resize-none"
            />
          </div>

          {/* GitHub URL */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5">
              <span className="flex items-center gap-1.5">
                <Link2 size={12} />
                GitHub Repository URL <span className="text-zinc-600 font-normal">(optional)</span>
              </span>
            </label>
            <input
              type="url"
              placeholder="https://github.com/org/repo"
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 placeholder-zinc-600 outline-none focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600/30 transition-all"
            />
          </div>

          {/* Error */}
          {error && (
            <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2.5 text-xs text-rose-400">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              className="flex-1 rounded-lg border border-zinc-800 bg-transparent py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !name.trim() || !slug.trim()}
              className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2.5 text-xs font-semibold text-white hover:bg-indigo-500 shadow-md hover:shadow-[0_0_15px_rgba(99,102,241,0.4)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Check size={13} />
                  Create Project
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
