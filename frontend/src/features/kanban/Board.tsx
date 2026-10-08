'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, DropResult } from '@hello-pangea/dnd';
import { useParams } from 'next/navigation';
import { 
  Layers, 
  RefreshCw, 
  Sparkles, 
  Filter, 
  ShieldAlert, 
  Loader2, 
  Plus, 
  AlertCircle, 
  Check, 
  X 
} from 'lucide-react';
import Column from './Column';
import ConflictBanner from './ConflictBanner';
import { ColumnData } from './types';
import { Issue } from '@/data/sample';
import { api } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

export default function Board() {
  const params = useParams();
  const projectSlug = params?.projectId as string;

  const [loading, setLoading] = useState(true);
  const [project, setProject] = useState<any>(null);
  const [board, setBoard] = useState<any>(null);
  const [columns, setColumns] = useState<ColumnData[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  
  // Real-time editor tracking
  const [activeEditingIssues, setActiveEditingIssues] = useState<Record<string, { username: string; fullName?: string }>>({});
  
  // Conflict Alert state
  const [conflictInfo, setConflictInfo] = useState<{ userEditing: string; issueKey: string; version: number } | null>(null);
  const [showConflictBanner, setShowConflictBanner] = useState(false);
  
  // Selection & Form states
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [showNewIssueModal, setShowNewIssueModal] = useState(false);
  const [newIssueTitle, setNewIssueTitle] = useState('');
  const [newIssueDesc, setNewIssueDesc] = useState('');
  const [newIssuePriority, setNewIssuePriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [newIssueStatus, setNewIssueStatus] = useState<'backlog' | 'todo' | 'in_progress' | 'review' | 'done'>('todo');
  const [newIssueAssignee, setNewIssueAssignee] = useState('');

  // Keep track of the UUID column ID to slug mapping (backlog, todo, etc.)
  const colIdMapRef = useRef<Record<string, string>>({});
  const colSlugToIdMapRef = useRef<Record<string, string>>({});

  const loadBoardData = useCallback(async () => {
    if (!projectSlug) return;
    try {
      setLoading(true);
      
      // 1. Fetch project info and team users
      const [proj, userList] = await Promise.all([
        api.getProject(projectSlug),
        api.listUsers()
      ]);
      setProject(proj);
      setUsers(userList);

      // 2. Fetch boards (or create a default board if it doesn't exist)
      let boards = await api.listBoards(projectSlug);
      if (boards.length === 0) {
        await api.createBoard(projectSlug, 'Development Board');
        boards = await api.listBoards(projectSlug);
      }
      
      const currentBoard = boards[0];
      setBoard(currentBoard);

      // 3. Map column IDs to slugs
      const colIdMap: Record<string, string> = {};
      const colSlugToIdMap: Record<string, string> = {};
      
      currentBoard.columns.forEach((col: any) => {
        const slug = col.name.toLowerCase().replace(' ', '_');
        colIdMap[col.id] = slug;
        colSlugToIdMap[slug] = col.id;
      });
      
      colIdMapRef.current = colIdMap;
      colSlugToIdMapRef.current = colSlugToIdMap;

      // 4. Fetch issues for the project
      const rawIssues = await api.listIssues(projectSlug);

      // Initialize grouped columns structured matching ColumnData
      const grouped: ColumnData[] = [
        { id: 'backlog', title: 'Backlog', issues: [] },
        { id: 'todo', title: 'To Do', issues: [] },
        { id: 'in_progress', title: 'In Progress', issues: [] },
        { id: 'review', title: 'In Review', issues: [] },
        { id: 'done', title: 'Done', issues: [] },
      ];

      rawIssues.forEach((issue: any) => {
        let statusSlug = (issue.column_id && colIdMap[issue.column_id])
          ? colIdMap[issue.column_id]
          : (issue.status || 'todo').toLowerCase();

        if (statusSlug === 'to_do') statusSlug = 'todo';

        let targetCol = grouped.find((c) => c.id === statusSlug);
        if (!targetCol) {
          targetCol = grouped.find((c) => c.id === 'todo') || grouped[1] || grouped[0];
        }
        
        targetCol.issues.push({
          id: issue.id,
          title: issue.title,
          description: issue.description || '',
          status: targetCol.id as any,
          priority: (issue.priority || 'medium').toLowerCase(),
          assigneeId: issue.assignee_id,
          reporterId: issue.reporter_id,
          version: issue.version,
          branchName: issue.branch_name,
          prUrl: issue.pr_url,
          labels: issue.labels || [],
          createdAt: issue.created_at,
          updatedAt: issue.updated_at,
        });
      });

      // Sort issue positions
      grouped.forEach((c) => {
        c.issues.sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
      });

      setColumns(grouped);
    } catch (err) {
      console.error('Error loading board data:', err);
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    loadBoardData();
  }, [loadBoardData]);

  // WebSocket real-time subscription
  const handleWebSocketEvent = useCallback((event: string, payload: any) => {
    console.log('WS Event received:', event, payload);
    
    if (event === 'issue_created' || event === 'issue_updated' || event === 'issue_moved' || event === 'issue_deleted') {
      // Reload board data from backend on state updates
      loadBoardData();
    } else if (event === 'user_editing') {
      // Don't show editing presence indicators if current user
      setActiveEditingIssues((prev) => ({
        ...prev,
        [payload.issue_id]: {
          username: payload.username,
          fullName: payload.full_name,
        },
      }));
    } else if (event === 'user_stopped_editing') {
      setActiveEditingIssues((prev) => {
        const copy = { ...prev };
        delete copy[payload.issue_id];
        return copy;
      });
    }
  }, [loadBoardData]);

  const { sendEditing, sendStoppedEditing } = useWebSocket({
    projectId: project?.id || '',
    onEvent: handleWebSocketEvent,
  });

  // Track select transitions to broadcast editing locks
  const handleCardClick = (issue: Issue) => {
    if (selectedIssue && selectedIssue.id !== issue.id) {
      sendStoppedEditing(selectedIssue.id);
    }
    sendEditing(issue.id);
    setSelectedIssue(issue);
  };

  const handleCloseDetail = () => {
    if (selectedIssue) {
      sendStoppedEditing(selectedIssue.id);
      setSelectedIssue(null);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    const { source, destination, draggableId } = result;

    if (!destination) return;

    if (
      source.droppableId === destination.droppableId &&
      source.index === destination.index
    ) return;

    const sourceColIndex = columns.findIndex((c) => c.id === source.droppableId);
    const destColIndex = columns.findIndex((c) => c.id === destination.droppableId);

    const sourceCol = columns[sourceColIndex];
    const destCol = columns[destColIndex];

    const sourceIssues = [...sourceCol.issues];
    const destIssues = source.droppableId === destination.droppableId 
      ? sourceIssues 
      : [...destCol.issues];

    const [movedIssue] = sourceIssues.splice(source.index, 1);
    const originalStatus = movedIssue.status;
    const targetStatus = destination.droppableId as any;

    // Optimistically update positions & status locally
    movedIssue.status = targetStatus;
    destIssues.splice(destination.index, 0, movedIssue);

    const backupColumns = [...columns];
    const newColumns = [...columns];
    newColumns[sourceColIndex] = { ...sourceCol, issues: sourceIssues };
    if (source.droppableId !== destination.droppableId) {
      newColumns[destColIndex] = { ...destCol, issues: destIssues };
    }
    setColumns(newColumns);

    try {
      // Resolve UUID target column ID
      const targetColumnId = colSlugToIdMapRef.current[targetStatus] || null;
      
      // Save changes back to database with expected version
      await api.moveIssue(draggableId, {
        column_id: targetColumnId,
        position: destination.index,
        version: movedIssue.version
      });
    } catch (err: any) {
      console.error('Failed to move issue:', err);
      // Revert state on error
      setColumns(backupColumns);
      
      if (err.status === 409) {
        // Trigger optimistic lock collision banner
        const otherUser = activeEditingIssues[draggableId]?.fullName || activeEditingIssues[draggableId]?.username || 'Another developer';
        setConflictInfo({
          userEditing: otherUser,
          issueKey: `Issue #${draggableId.substring(0, 8)}`,
          version: movedIssue.version
        });
        setShowConflictBanner(true);
      }
    }
  };

  const [newIssueError, setNewIssueError] = useState('');
  const [creatingIssue, setCreatingIssue] = useState(false);

  const handleCreateIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newIssueTitle.trim()) return;

    setCreatingIssue(true);
    setNewIssueError('');

    try {
      await api.createIssue(projectSlug, {
        title: newIssueTitle.trim(),
        description: newIssueDesc.trim() || undefined,
        status: newIssueStatus.toLowerCase() as any,
        priority: newIssuePriority.toLowerCase() as any,
        assignee_id: newIssueAssignee || undefined,
        labels: []
      });

      // Clear input fields & close modal
      setNewIssueTitle('');
      setNewIssueDesc('');
      setNewIssuePriority('medium');
      setNewIssueStatus('todo');
      setNewIssueAssignee('');
      setNewIssueError('');
      setShowNewIssueModal(false);
      
      // Reload board data
      loadBoardData();
    } catch (err: any) {
      console.error('Failed to create issue:', err);
      setNewIssueError(err.message || 'Failed to create issue. Please try again.');
    } finally {
      setCreatingIssue(false);
    }
  };

  const handleSync = () => {
    loadBoardData();
    setShowConflictBanner(false);
    setConflictInfo(null);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 py-24">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500 mb-3" />
        <span className="text-xs font-semibold tracking-wider uppercase text-zinc-500 animate-pulse">
          Loading Board Data...
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5 h-full flex flex-col">
      {/* Title & Board Options */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {project?.name || 'Project Board'}
          </h2>
          <p className="text-xs text-zinc-500">Manage tasks, prevent overwrites, and view live status changes</p>
        </div>
        
        {/* Buttons / Filters */}
        <div className="flex items-center gap-3">
          <button 
            onClick={handleSync}
            className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-[#0f0f12] px-3 py-1.5 text-xs text-zinc-400 hover:bg-zinc-900 hover:text-white transition-colors"
          >
            <RefreshCw size={14} />
            Sync Board
          </button>
          <div className="h-6 w-px bg-zinc-800" />
          <button 
            onClick={() => setShowNewIssueModal(true)}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-md hover:bg-indigo-500 hover:shadow-[0_0_12px_rgba(99,102,241,0.4)] transition-all"
          >
            <Sparkles size={13} />
            New Issue
          </button>
        </div>
      </div>

      {/* Collision Alert Banner */}
      {showConflictBanner && conflictInfo && (
        <ConflictBanner
          userEditing={conflictInfo.userEditing}
          issueKey={conflictInfo.issueKey}
          version={conflictInfo.version}
          onRefresh={handleSync}
          onClose={() => setShowConflictBanner(false)}
        />
      )}

      {/* Kanban Board Grid */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="flex-1 flex gap-4 overflow-x-auto pb-4 max-w-full">
          {columns.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              issues={col.issues}
              users={users}
              activeEditingIssues={activeEditingIssues}
              onCardClick={handleCardClick}
            />
          ))}
        </div>
      </DragDropContext>

      {/* Issue Detail Sidebar */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg h-full bg-[#0f0f12] border-l border-zinc-800 p-6 flex flex-col justify-between text-left shadow-2xl animate-in slide-in-from-right duration-200">
            <div className="space-y-6 overflow-y-auto pr-2">
              {/* Modal Header */}
              <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
                <span className="text-xs font-mono font-bold text-indigo-400 bg-indigo-950/20 px-2 py-0.5 border border-indigo-900/30 rounded">
                  Issue ID: {selectedIssue.id.substring(0, 8)}...
                </span>
                <button
                  onClick={handleCloseDetail}
                  className="rounded-lg border border-zinc-800 p-1.5 text-zinc-500 hover:text-white hover:bg-zinc-900 transition-all text-xs font-medium"
                >
                  Close
                </button>
              </div>

              {/* Title & Description */}
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white leading-snug">{selectedIssue.title}</h3>
                <p className="text-xs text-zinc-400 leading-relaxed whitespace-pre-wrap">
                  {selectedIssue.description || 'No description provided.'}
                </p>
              </div>

              {/* Lock Mechanism Details */}
              <div className="rounded-xl border border-zinc-800 bg-[#070709] p-4 space-y-3">
                <div className="flex items-center gap-2 border-b border-zinc-800/80 pb-2">
                  <ShieldAlert className="text-indigo-400" size={16} />
                  <span className="text-xs font-bold text-white">Collision Prevention Mechanics</span>
                </div>
                <div className="space-y-2.5 text-[11px] text-zinc-400">
                  <div className="flex justify-between">
                    <span>Database Version (Lock):</span>
                    <span className="font-mono text-white font-semibold">v{selectedIssue.version}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Optimistic State:</span>
                    <span className="text-emerald-500 font-semibold">Healthy</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Branch Linked:</span>
                    <span className="font-mono text-indigo-400">{selectedIssue.branchName || 'none'}</span>
                  </div>
                  <p className="text-[10px] text-zinc-500 leading-normal border-t border-zinc-800/60 pt-2 italic">
                    If another developer updates this issue, the version counter bumps. If you try to save with version v{selectedIssue.version}, the server will reject it with a 409 conflict.
                  </p>
                </div>
              </div>

              {/* Labels & Dates */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-zinc-500 block mb-1">Labels</span>
                  <div className="flex flex-wrap gap-1">
                    {selectedIssue.labels.length > 0 ? (
                      selectedIssue.labels.map((l) => (
                        <span key={l} className="rounded bg-zinc-900 border border-zinc-800 px-2 py-0.5 text-[10px] font-semibold text-zinc-300">
                          {l}
                        </span>
                      ))
                    ) : (
                      <span className="text-zinc-600 italic">None</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-zinc-500 block mb-1">Priority</span>
                  <span className="font-semibold text-white capitalize">{selectedIssue.priority}</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="border-t border-zinc-800 pt-4 flex gap-3">
              <button 
                onClick={handleCloseDetail}
                className="flex-1 rounded-lg border border-zinc-800 bg-[#0f0f12] py-2.5 text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
              >
                Back to Board
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Issue Modal */}
      {showNewIssueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0f0f12] border border-zinc-800 rounded-xl p-6 shadow-2xl space-y-4 text-left">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                <Plus size={16} className="text-indigo-400" />
                Create New Issue
              </h3>
              <button 
                onClick={() => setShowNewIssueModal(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreateIssue} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Summarize the work..."
                  value={newIssueTitle}
                  onChange={(e) => setNewIssueTitle(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200 placeholder-zinc-700 outline-none focus:border-indigo-600 transition-colors"
                />
              </div>

              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Description</label>
                <textarea
                  rows={3}
                  placeholder="Provide details about this task..."
                  value={newIssueDesc}
                  onChange={(e) => setNewIssueDesc(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-200 placeholder-zinc-700 outline-none focus:border-indigo-600 transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Priority</label>
                  <select
                    value={newIssuePriority}
                    onChange={(e) => setNewIssuePriority(e.target.value as any)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300 outline-none focus:border-indigo-600 transition-colors"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-zinc-400 mb-1">Initial Column</label>
                  <select
                    value={newIssueStatus}
                    onChange={(e) => setNewIssueStatus(e.target.value as any)}
                    className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300 outline-none focus:border-indigo-600 transition-colors"
                  >
                    <option value="backlog">Backlog</option>
                    <option value="todo">To Do</option>
                    <option value="in_progress">In Progress</option>
                    <option value="review">In Review</option>
                    <option value="done">Done</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-zinc-400 mb-1">Assignee</label>
                <select
                  value={newIssueAssignee}
                  onChange={(e) => setNewIssueAssignee(e.target.value)}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-zinc-300 outline-none focus:border-indigo-600 transition-colors"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.full_name || u.username}
                    </option>
                  ))}
                </select>
              </div>

              {newIssueError && (
                <div className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-400">
                  {newIssueError}
                </div>
              )}

              <div className="flex gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewIssueModal(false)}
                  disabled={creatingIssue}
                  className="flex-1 rounded-lg border border-zinc-800 bg-transparent py-2 text-center text-zinc-400 hover:text-white transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingIssue || !newIssueTitle.trim()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-indigo-600 py-2 font-semibold text-white hover:bg-indigo-500 shadow-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingIssue ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Issue'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
