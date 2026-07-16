'use client';

import { Shield, Users, Lock, Database } from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';
import { sampleUsers } from '@/data/sample';

export default function SettingsPage() {
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
            <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
              <Github size={16} className="text-white" />
              <h3 className="text-sm font-semibold text-white">GitHub Integration</h3>
            </div>
            <p className="text-[11px] text-zinc-400 leading-normal">
              Your account is successfully linked to GitHub. Live status checks map push messages and merge alerts directly to task columns.
            </p>
            <div className="rounded-lg bg-zinc-950/60 border border-zinc-800/80 p-2.5 text-[10px] space-y-1">
              <div className="flex justify-between">
                <span className="text-zinc-500">Scope:</span>
                <span className="font-mono text-zinc-300">repo, user:email</span>
              </div>
              <div className="flex justify-between">
                <span className="text-zinc-500">Rate Limit:</span>
                <span className="text-zinc-300">4,992 / 5,000</span>
              </div>
            </div>
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
