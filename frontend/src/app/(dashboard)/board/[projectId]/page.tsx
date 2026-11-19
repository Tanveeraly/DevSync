'use client';

import React, { useState } from 'react';
import Board from '@/features/kanban/Board';
import PullRequestQueue from '@/features/pull-requests/PullRequestQueue';
import { useParams } from 'next/navigation';

export default function BoardPage() {
  const params = useParams();
  const projectSlug = params?.projectId as string;
  const [activeTab, setActiveTab] = useState<'board' | 'pull-requests'>('board');

  return (
    <div className="h-full flex flex-col">
      <nav
        aria-label="Project views"
        role="tablist"
        className="flex shrink-0 gap-1 border-b border-white/10 px-6 pt-3"
      >
        <button
          type="button"
          id="board-tab"
          role="tab"
          aria-selected={activeTab === 'board'}
          aria-controls="project-view-panel"
          onClick={() => setActiveTab('board')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'board'
              ? 'border-purple-400 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Board
        </button>
        <button
          type="button"
          id="pull-requests-tab"
          role="tab"
          aria-selected={activeTab === 'pull-requests'}
          aria-controls="project-view-panel"
          onClick={() => setActiveTab('pull-requests')}
          className={`border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
            activeTab === 'pull-requests'
              ? 'border-purple-400 text-white'
              : 'border-transparent text-gray-400 hover:text-gray-200'
          }`}
        >
          Pull Requests
        </button>
      </nav>
      <div
        id="project-view-panel"
        role="tabpanel"
        aria-labelledby={activeTab === 'board' ? 'board-tab' : 'pull-requests-tab'}
        className="flex min-h-0 flex-1 flex-col"
      >
        {activeTab === 'board' ? (
          <Board />
        ) : (
          <PullRequestQueue projectSlug={projectSlug} />
        )}
      </div>
    </div>
  );
}
