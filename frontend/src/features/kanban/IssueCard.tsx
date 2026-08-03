'use client';

import React from 'react';
import { Draggable } from '@hello-pangea/dnd';
import { GitBranch, GitPullRequest, Layers, AlertCircle } from 'lucide-react';
import { Issue, sampleUsers } from '@/data/sample';
import { cn } from '@/lib/utils';

interface IssueCardProps {
  issue: Issue;
  index: number;
  isEditingByOther?: string;
  users?: any[];
  onClick?: () => void;
}

export default function IssueCard({ issue, index, isEditingByOther, users = [], onClick }: IssueCardProps) {
  const allUsers = users.length > 0 ? users : sampleUsers;
  const assignee = allUsers.find((u) => u.id === (issue.assigneeId || (issue as any).assignee_id));
  const assigneeName = assignee?.full_name || assignee?.username || assignee?.name;
  const assigneeAvatar = assignee?.avatar_url || assignee?.avatarUrl;

  const getPriorityStyles = (p: string) => {
    switch (p) {
      case 'urgent':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      case 'high':
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
      case 'medium':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      default:
        return 'bg-zinc-800 text-zinc-400 border-zinc-700/50';
    }
  };

  return (
    <Draggable draggableId={issue.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={cn(
            "group rounded-xl border p-4 bg-[#111113] hover:bg-[#151518] shadow-sm transition-all duration-200 cursor-grab active:cursor-grabbing relative flex flex-col gap-3",
            snapshot.isDragging ? "border-indigo-500 bg-[#151518] rotate-1 shadow-[0_8px_20px_rgba(99,102,241,0.15)]" : "border-zinc-800",
            isEditingByOther ? "border-amber-700/80 shadow-[0_0_12px_rgba(245,158,11,0.06)]" : ""
          )}
        >
          {/* Active collision indicator */}
          {isEditingByOther && (
            <div className="absolute -top-1.5 -right-1.5 flex h-5 w-5 animate-bounce items-center justify-center rounded-full bg-amber-500 text-zinc-950 border border-zinc-900 shadow">
              <AlertCircle size={12} strokeWidth={3} />
            </div>
          )}

          {/* Card Header: Key & Priority */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono font-bold text-zinc-500 group-hover:text-zinc-400">
              {issue.id}
            </span>
            <div className="flex gap-1.5 items-center">
              {/* Lock/Version tag */}
              <span className="text-[9px] font-mono text-zinc-500 bg-zinc-900 border border-zinc-800 px-1 py-0.2 rounded">
                v{issue.version}
              </span>
              <span className={cn(
                "rounded-md border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider",
                getPriorityStyles(issue.priority)
              )}>
                {issue.priority}
              </span>
            </div>
          </div>

          {/* Card Content */}
          <div className="text-left space-y-1">
            <h4 className="text-xs font-semibold text-zinc-100 group-hover:text-white line-clamp-1">
              {issue.title}
            </h4>
            <p className="text-[11px] text-zinc-500 line-clamp-2">
              {issue.description}
            </p>
          </div>

          {/* Linked Branch or PR */}
          {(issue.branchName || issue.prUrl) && (
            <div className="flex flex-col gap-1 border-t border-zinc-800/60 pt-2 text-[10px] text-zinc-400">
              {issue.branchName && (
                <div className="flex items-center gap-1.5 font-mono text-[9px] text-indigo-400 bg-indigo-950/20 px-1.5 py-0.5 rounded border border-indigo-900/30 w-fit max-w-full">
                  <GitBranch size={10} />
                  <span className="truncate">{issue.branchName}</span>
                </div>
              )}
              {issue.prUrl && (
                <a
                  href={issue.prUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-purple-400 hover:text-purple-300 font-medium w-fit transition-colors"
                >
                  <GitPullRequest size={10} />
                  <span>Pull Request #42</span>
                </a>
              )}
            </div>
          )}

          {/* Card Footer: Labels & Assignee */}
          <div className="flex items-center justify-between border-t border-zinc-800/40 pt-2">
            <div className="flex flex-wrap gap-1">
              {issue.labels.map((lbl) => (
                <span 
                  key={lbl} 
                  className="rounded bg-zinc-900 border border-zinc-800/80 px-1.5 py-0.5 text-[9px] text-zinc-400 font-medium"
                >
                  {lbl}
                </span>
              ))}
            </div>

            {assignee ? (
              assigneeAvatar ? (
                <img
                  src={assigneeAvatar}
                  alt={assigneeName}
                  className="h-6 w-6 rounded-full border border-zinc-800 object-cover"
                  title={`Assigned to ${assigneeName}`}
                />
              ) : (
                <div 
                  className="flex h-6 w-6 items-center justify-center rounded-full border border-zinc-800 bg-indigo-950 text-indigo-300 text-[9px] font-bold uppercase"
                  title={`Assigned to ${assigneeName}`}
                >
                  {assigneeName ? assigneeName.substring(0, 2) : '??'}
                </div>
              )
            ) : (
              <div className="flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-zinc-700 bg-zinc-900 text-zinc-600">
                <Layers size={10} />
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  );
}
