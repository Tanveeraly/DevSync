'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  KanbanSquare, 
  Settings, 
  ChevronLeft, 
  ChevronRight, 
  FolderDot
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';
import { cn } from '@/lib/utils';
import { sampleProjects } from '@/data/sample';

interface SidebarProps {
  className?: string;
  user?: any;
  projects?: any[];
}

export default function Sidebar({ className, user, projects = [] }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const pathname = usePathname();

  // Pick first project to link default Kanban board, fallback to empty string
  const firstProjectSlug = projects.length > 0 ? projects[0].slug : '';

  const mainNav = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    ...(firstProjectSlug ? [{ name: 'Kanban Board', href: `/board/${firstProjectSlug}`, icon: KanbanSquare }] : []),
  ];

  const getInitials = () => {
    if (!user) return '??';
    if (user.full_name) {
      const parts = user.full_name.trim().split(/\s+/);
      if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
      return user.full_name.substring(0, 2).toUpperCase();
    }
    return user.username.substring(0, 2).toUpperCase();
  };

  return (
    <div 
      className={cn(
        "flex flex-col border-r border-[var(--border)] bg-[var(--surface)] text-[var(--muted)] transition-all duration-300 relative",
        collapsed ? "w-16" : "w-64",
        className
      )}
    >
      {/* Brand Header */}
      <div className="flex h-16 items-center px-4 border-b border-[var(--border)] justify-between">
        <Link href="/dashboard" className="flex items-center gap-3 font-semibold text-[var(--foreground)]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-[0_0_15px_rgba(99,102,241,0.5)]">
            <span className="font-bold text-sm">DS</span>
          </div>
          {!collapsed && (
            <span className="tracking-tight text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--foreground)] to-[var(--muted)]">
              DevSync
            </span>
          )}
        </Link>
        {!collapsed && (
          <button 
            onClick={() => setCollapsed(true)}
            className="p-1 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] rounded-md transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
        )}
      </div>

      {/* Main Nav */}
      <div className="flex-1 py-6 px-3 space-y-7 overflow-y-auto">
        <div className="space-y-1">
          {mainNav.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                  isActive 
                    ? "bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold border-l-2 border-indigo-500 rounded-l-none" 
                    : "hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                )}
              >
                <item.icon size={18} className={isActive ? "text-indigo-400" : "text-[var(--muted)]"} />
                {!collapsed && <span>{item.name}</span>}
              </Link>
            );
          })}
        </div>

        {/* Projects Section */}
        <div>
          {!collapsed && (
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-[var(--muted)]">
              Active Projects
            </div>
          )}
          <div className="space-y-1">
            {projects.length > 0 ? (
              projects.map((project) => {
                const projectPath = `/board/${project.slug}`;
                const isActive = pathname === projectPath;
                const repoName = project.github_repo_url 
                  ? project.github_repo_url.replace(/https?:\/\/(www\.)?github\.com\//, '') 
                  : 'No Git Link';
                
                return (
                  <Link
                    key={project.id}
                    href={projectPath}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                      isActive 
                        ? "bg-[var(--surface-muted)] text-[var(--foreground)] font-semibold" 
                        : "hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)]"
                    )}
                  >
                    <FolderDot size={18} className={isActive ? "text-indigo-400" : "text-[var(--muted)]"} />
                    {!collapsed && (
                      <div className="truncate flex-1">
                        <div className="truncate font-medium">{project.name}</div>
                        <div className="text-[10px] text-[var(--muted)] truncate">{repoName}</div>
                      </div>
                    )}
                  </Link>
                );
              })
            ) : (
              !collapsed && (
                <div className="px-3 py-2 text-xs text-zinc-600 italic">
                  No projects active.
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* Sidebar Footer */}
      <div className="p-4 border-t border-[var(--border)] flex items-center justify-between">
        {!collapsed ? (
          <>
            <div className="flex items-center gap-2">
              {user?.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name || user.username}
                  className="h-8 w-8 rounded-full border border-[var(--border)] object-cover"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-[var(--surface-muted)] border border-[var(--border)] flex items-center justify-center text-xs font-bold text-[var(--foreground)] uppercase">
                  {getInitials()}
                </div>
              )}
              <div className="text-left">
                <div className="text-xs font-semibold text-[var(--foreground)] truncate max-w-[120px]">
                  {user?.full_name || user?.username || 'Developer'}
                </div>
                <div className="text-[10px] text-[var(--muted)]">
                  @{user?.username || 'devsync'}
                </div>
              </div>
            </div>
            <Link 
              href="/settings" 
              className="p-1.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--surface-muted)] rounded-md transition-colors"
            >
              <Settings size={16} />
            </Link>
          </>
        ) : (
          <button 
            onClick={() => setCollapsed(false)}
            className="mx-auto p-1.5 hover:bg-[var(--surface-muted)] hover:text-[var(--foreground)] rounded-md transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
    </div>
  );
}
