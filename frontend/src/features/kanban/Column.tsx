'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';
import { Plus, MoreHorizontal } from 'lucide-react';
import IssueCard from './IssueCard';
import { Issue } from '@/data/sample';
import { cn } from '@/lib/utils';

interface ColumnProps {
  id: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
  title: string;
  issues: Issue[];
  activeEditingIssues?: Record<string, { username: string; fullName?: string }>;
  onCardClick?: (issue: Issue) => void;
}

export default function Column({ 
  id, 
  title, 
  issues, 
  activeEditingIssues,
  onCardClick 
}: ColumnProps) {
  return (
    <div className="flex w-72 flex-col rounded-xl bg-[#09090b]/80 border border-zinc-800/80 p-3 h-full max-h-full">
      {/* Column Header */}
      <div className="flex items-center justify-between px-2 pb-3 pt-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            "h-1.5 w-1.5 rounded-full",
            id === 'backlog' ? 'bg-zinc-500' :
            id === 'todo' ? 'bg-amber-500' :
            id === 'in_progress' ? 'bg-indigo-500' :
            id === 'review' ? 'bg-blue-500' :
            'bg-emerald-500'
          )} />
          <h3 className="text-xs font-semibold text-zinc-200">{title}</h3>
          <span className="rounded-full bg-zinc-900 border border-zinc-800 px-2 py-0.2 text-[10px] font-bold text-zinc-500">
            {issues.length}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-500">
          <button className="rounded p-1 hover:bg-zinc-800 hover:text-white transition-colors">
            <Plus size={14} />
          </button>
          <button className="rounded p-1 hover:bg-zinc-800 hover:text-white transition-colors">
            <MoreHorizontal size={14} />
          </button>
        </div>
      </div>

      {/* Column Body - Droppable Area */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "flex-1 overflow-y-auto space-y-3 rounded-lg p-1.5 transition-colors duration-200 min-h-[400px] max-h-full scrollbar-thin scrollbar-thumb-zinc-800 scrollbar-track-transparent",
              snapshot.isDraggingOver ? "bg-zinc-900/30" : "bg-transparent"
            )}
          >
            {issues.length > 0 ? (
              issues.map((issue, index) => {
                const editor = activeEditingIssues?.[issue.id];
                return (
                  <IssueCard
                    key={issue.id}
                    issue={issue}
                    index={index}
                    isEditingByOther={editor ? (editor.fullName || editor.username) : undefined}
                    onClick={() => onCardClick?.(issue)}
                  />
                );
              })
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-zinc-800/80 rounded-lg bg-zinc-950/20">
                <p className="text-[10px] text-zinc-600 font-medium">No tasks in column</p>
              </div>
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  );
}
