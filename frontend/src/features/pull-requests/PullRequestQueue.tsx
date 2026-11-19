'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DragDropContext,
  Draggable,
  Droppable,
  type DraggableProvidedDragHandleProps,
  type DropResult,
} from '@hello-pangea/dnd';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitPullRequest,
  GripVertical,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { api, type PullRequestQueueItem } from '@/lib/api';
import { useWebSocket } from '@/hooks/useWebSocket';

type QueueFilter = 'all' | 'blocked' | 'needs-review' | 'failing-checks' | 'recently-updated';

const RECENTLY_UPDATED_DAYS = 7;

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to update the pull request queue.';
}

function getQueuePosition(pullRequest: PullRequestQueueItem): number {
  return pullRequest.queue_position + 1;
}

function isRecentlyUpdated(pullRequest: PullRequestQueueItem): boolean {
  if (!pullRequest.github_updated_at) return false;
  const updatedAt = new Date(pullRequest.github_updated_at).getTime();
  return (
    Number.isFinite(updatedAt) &&
    updatedAt >= Date.now() - RECENTLY_UPDATED_DAYS * 24 * 60 * 60 * 1000
  );
}

export default function PullRequestQueue({ projectSlug }: { projectSlug: string }) {
  const [pullRequests, setPullRequests] = useState<PullRequestQueueItem[]>([]);
  const [issueOptions, setIssueOptions] = useState<{ id: string; title: string }[]>([]);
  const [projectId, setProjectId] = useState('');
  const [filter, setFilter] = useState<QueueFilter>('all');
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [savingAction, setSavingAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedIssues, setSelectedIssues] = useState<Record<number, string>>({});
  const [selectedBlockers, setSelectedBlockers] = useState<Record<number, number | ''>>({});

  const refreshQueue = useCallback(async () => {
    const [items, issues] = await Promise.all([
      api.listPullRequests(projectSlug),
      api.listPullRequestIssues(projectSlug),
    ]);
    setPullRequests(items);
    setIssueOptions(issues);
  }, [projectSlug]);

  useEffect(() => {
    let active = true;
    Promise.all([
      api.getProject(projectSlug),
      api.listPullRequests(projectSlug),
      api.listPullRequestIssues(projectSlug),
    ])
      .then(([project, items, issues]) => {
        if (!active) return;
        setProjectId(project.id);
        setPullRequests(items);
        setIssueOptions(issues);
      })
      .catch((loadError: unknown) => {
        if (active) setError(getErrorMessage(loadError));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [projectSlug]);

  const handleWebSocketEvent = useCallback(
    (event: string) => {
      if (event !== 'pull_request_updated' && event !== 'pull_request_queue_updated') return;
      refreshQueue().catch((refreshError: unknown) => setError(getErrorMessage(refreshError)));
    },
    [refreshQueue],
  );

  useWebSocket({ projectId, onEvent: handleWebSocketEvent });

  const openPullRequests = useMemo(
    () =>
      pullRequests
        .filter((pullRequest) => pullRequest.state === 'open')
        .sort(
          (left, right) =>
            left.queue_position - right.queue_position ||
            left.github_number - right.github_number,
        ),
    [pullRequests],
  );
  const readyPullRequests = useMemo(
    () => openPullRequests.filter((pullRequest) => pullRequest.ready),
    [openPullRequests],
  );
  const blockedPullRequests = useMemo(
    () => openPullRequests.filter((pullRequest) => !pullRequest.ready),
    [openPullRequests],
  );
  const closedPullRequests = useMemo(
    () =>
      pullRequests
        .filter((pullRequest) => pullRequest.state !== 'open')
        .sort(
          (left, right) =>
            left.queue_position - right.queue_position ||
            left.github_number - right.github_number,
        ),
    [pullRequests],
  );

  const matchesFilter = useCallback(
    (pullRequest: PullRequestQueueItem) => {
      switch (filter) {
        case 'blocked':
          return !pullRequest.ready;
        case 'needs-review':
          return pullRequest.review_summary !== 'approved';
        case 'failing-checks':
          return pullRequest.check_summary === 'failure';
        case 'recently-updated':
          return isRecentlyUpdated(pullRequest);
        default:
          return true;
      }
    },
    [filter],
  );

  const filteredReady = readyPullRequests.filter(matchesFilter);
  const filteredBlocked = blockedPullRequests.filter(matchesFilter);

  const runMutation = async (
    key: string,
    mutation: () => Promise<PullRequestQueueItem[]>,
  ) => {
    setSavingAction(key);
    setError(null);
    try {
      setPullRequests(await mutation());
    } catch (mutationError) {
      setError(getErrorMessage(mutationError));
    } finally {
      setSavingAction(null);
    }
  };

  const syncPullRequests = async () => {
    setSyncing(true);
    setError(null);
    try {
      setPullRequests(await api.syncPullRequests(projectSlug));
    } catch (syncError) {
      setError(getErrorMessage(syncError));
    } finally {
      setSyncing(false);
    }
  };

  const reorderReadyPullRequests = async (result: DropResult) => {
    if (
      result.reason !== 'DROP' ||
      !result.destination ||
      result.destination.index === result.source.index ||
      filter !== 'all'
    ) {
      return;
    }

    const reorderedReady = [...readyPullRequests];
    const [movedPullRequest] = reorderedReady.splice(result.source.index, 1);
    reorderedReady.splice(result.destination.index, 0, movedPullRequest);

    let readyIndex = 0;
    const order = openPullRequests.map((pullRequest) =>
      pullRequest.ready
        ? reorderedReady[readyIndex++].github_number
        : pullRequest.github_number,
    );
    setError(null);
    setSavingAction('reorder');
    try {
      setPullRequests(await api.reorderPullRequests(projectSlug, order));
    } catch (reorderError) {
      setError(getErrorMessage(reorderError));
    } finally {
      setSavingAction(null);
    }
  };

  const updateIssueSelection = (pullRequestNumber: number, issueId: string) => {
    setSelectedIssues((current) => ({ ...current, [pullRequestNumber]: issueId }));
  };

  const updateBlockerSelection = (pullRequestNumber: number, blockerNumber: string) => {
    setSelectedBlockers((current) => ({
      ...current,
      [pullRequestNumber]: blockerNumber ? Number(blockerNumber) : '',
    }));
  };

  const renderPullRequest = (
    pullRequest: PullRequestQueueItem,
    draggable = false,
    dragHandleProps?: DraggableProvidedDragHandleProps | null,
  ) => {
    const selectedIssueId =
      selectedIssues[pullRequest.github_number] ?? pullRequest.linked_issue_id ?? '';
    const selectedBlocker = selectedBlockers[pullRequest.github_number] ?? '';
    const availableBlockers = pullRequests.filter(
      (candidate) =>
        candidate.github_number !== pullRequest.github_number &&
        !candidate.merged_at &&
        !pullRequest.blocked_by.some((blocker) => blocker.id === candidate.id),
    );
    const row = (
      <article
        className="rounded-xl border border-white/10 bg-white/[0.03] p-4"
        aria-label={`Pull request #${pullRequest.github_number}`}
      >
        <div className="flex flex-wrap items-start gap-3">
          {draggable && (
            <span
              {...dragHandleProps}
              className="mt-1 cursor-grab text-gray-500"
              aria-label="Drag to reorder"
            >
              <GripVertical size={18} />
            </span>
          )}
          <span className="mt-0.5 text-xs font-semibold text-gray-500">
            #{getQueuePosition(pullRequest)}
          </span>
          <GitPullRequest className="mt-0.5 shrink-0 text-purple-300" size={18} />
          <div className="min-w-[220px] flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={pullRequest.url}
                target="_blank"
                rel="noreferrer"
                className="font-medium text-white hover:text-purple-200"
              >
                {pullRequest.title}
              </a>
              <a
                href={pullRequest.url}
                target="_blank"
                rel="noreferrer"
                aria-label={`Open pull request #${pullRequest.github_number} on GitHub`}
                className="text-gray-500 hover:text-gray-300"
              >
                <ExternalLink size={14} />
              </a>
            </div>
            <p className="mt-1 text-xs text-gray-500">
              {pullRequest.head_branch || 'Branch unavailable'} · #{pullRequest.github_number}
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              {pullRequest.state === 'open' ? (
                pullRequest.ready ? (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300">
                    Ready
                  </span>
                ) : (
                  <span className="rounded-full bg-amber-500/10 px-2.5 py-1 font-medium text-amber-300">
                    Blocked
                  </span>
                )
              ) : (
                <span className="rounded-full bg-gray-500/10 px-2.5 py-1 font-medium text-gray-300">
                  {pullRequest.merged_at ? 'Merged' : 'Closed'}
                </span>
              )}
              {pullRequest.is_draft && (
                <span className="rounded-full bg-gray-500/10 px-2.5 py-1 text-gray-400">
                  Draft
                </span>
              )}
              <span className="text-gray-400">
                Review: {pullRequest.review_summary?.replaceAll('_', ' ') || 'Unknown'}
              </span>
              <span className="text-gray-400">
                Checks: {pullRequest.check_summary || 'Unknown'}
              </span>
            </div>
            {pullRequest.blocked_by.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {pullRequest.blocked_by.map((blocker) => (
                  <span
                    key={blocker.id}
                    className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1 text-xs text-amber-200"
                  >
                    Blocked by{' '}
                    <a href={blocker.url} target="_blank" rel="noreferrer" className="underline">
                      #{blocker.github_number}
                    </a>
                    {pullRequest.state === 'open' && (
                      <button
                        type="button"
                        disabled={savingAction !== null}
                        onClick={() =>
                          void runMutation(
                            `remove-${pullRequest.github_number}-${blocker.github_number}`,
                            () =>
                              api.removePullRequestDependency(
                                projectSlug,
                                pullRequest.github_number,
                                blocker.github_number,
                              ),
                          )
                        }
                        aria-label={`Remove blocker #${blocker.github_number}`}
                        className="text-amber-200/70 hover:text-white disabled:opacity-50"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}
          </div>
          {pullRequest.linked_issue_id && (
            <span className="max-w-full rounded-md bg-blue-500/10 px-2.5 py-1 text-xs text-blue-200">
              Issue: {pullRequest.linked_issue_title || pullRequest.linked_issue_id}
            </span>
          )}
        </div>

        {pullRequest.state === 'open' && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-white/5 pt-3">
            <div className="flex min-w-[220px] flex-1 gap-2">
              <select
                value={selectedIssueId}
                onChange={(event) =>
                  updateIssueSelection(pullRequest.github_number, event.target.value)
                }
                disabled={savingAction !== null}
                aria-label={`Choose an issue for pull request #${pullRequest.github_number}`}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-xs text-gray-200 outline-none focus:border-purple-400"
              >
                <option value="">Select an issue to link</option>
                {issueOptions.map((issue) => (
                  <option key={issue.id} value={issue.id}>
                    {issue.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={
                  savingAction !== null ||
                  !selectedIssueId ||
                  selectedIssueId === pullRequest.linked_issue_id
                }
                onClick={() =>
                  void runMutation(`link-${pullRequest.github_number}`, () =>
                    api.linkPullRequestIssue(
                      projectSlug,
                      pullRequest.github_number,
                      selectedIssueId,
                    ),
                  )
                }
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Link issue
              </button>
            </div>
            <div className="flex min-w-[240px] flex-1 gap-2">
              <select
                value={selectedBlocker}
                onChange={(event) =>
                  updateBlockerSelection(pullRequest.github_number, event.target.value)
                }
                disabled={savingAction !== null}
                aria-label={`Choose a blocker for pull request #${pullRequest.github_number}`}
                className="min-w-0 flex-1 rounded-lg border border-white/10 bg-[#151515] px-3 py-2 text-xs text-gray-200 outline-none focus:border-purple-400"
              >
                <option value="">Select a PR that blocks this one</option>
                {availableBlockers.map((blocker) => (
                  <option key={blocker.id} value={blocker.github_number}>
                    #{blocker.github_number} · {blocker.title}
                  </option>
                ))}
              </select>
              <button
                type="button"
                disabled={savingAction !== null || selectedBlocker === ''}
                onClick={() => {
                  if (selectedBlocker === '') return;
                  void runMutation(
                    `block-${pullRequest.github_number}`,
                    () =>
                      api.addPullRequestDependency(
                        projectSlug,
                        pullRequest.github_number,
                        selectedBlocker,
                      ),
                  );
                }}
                className="rounded-lg border border-white/10 px-3 py-2 text-xs font-medium text-gray-200 hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Add blocker
              </button>
            </div>
          </div>
        )}
      </article>
    );

    return draggable ? row : <div key={pullRequest.id}>{row}</div>;
  };

  const filterOptions: { value: QueueFilter; label: string }[] = [
    { value: 'all', label: 'All open' },
    { value: 'blocked', label: 'Blocked' },
    { value: 'needs-review', label: 'Needs review' },
    { value: 'failing-checks', label: 'Failing checks' },
    { value: 'recently-updated', label: 'Recently updated' },
  ];

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        <Loader2 className="mr-2 animate-spin" size={18} />
        Loading pull requests…
      </div>
    );
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pb-8">
      <header className="flex flex-wrap items-center justify-between gap-4 py-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Pull Requests</h1>
          <p className="mt-1 text-sm text-gray-400">
            Set review order, track blockers, and link PRs to issues.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncPullRequests()}
          disabled={syncing || savingAction !== null}
          className="inline-flex items-center gap-2 rounded-lg bg-purple-500 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-purple-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {syncing ? (
            <Loader2 className="animate-spin" size={16} />
          ) : (
            <RefreshCw size={16} />
          )}
          {syncing ? 'Syncing…' : 'Sync from GitHub'}
        </button>
      </header>

      {error && (
        <div
          role="alert"
          className="mb-4 flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-200"
        >
          <AlertCircle className="mt-0.5 shrink-0" size={16} />
          <span>{error}</span>
        </div>
      )}

      <nav aria-label="Pull request filters" className="mb-5 flex flex-wrap gap-2">
        {filterOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            aria-pressed={filter === option.value}
            title={
              option.value === 'recently-updated'
                ? `Updated in the last ${RECENTLY_UPDATED_DAYS} days`
                : undefined
            }
            onClick={() => setFilter(option.value)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === option.value
                ? 'border-purple-400/50 bg-purple-500/15 text-purple-200'
                : 'border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {option.label}
          </button>
        ))}
      </nav>

      {filter === 'all' && readyPullRequests.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <CheckCircle2 className="text-emerald-300" size={16} />
            Ready to review
            <span className="text-xs font-normal text-gray-500">
              Drag to adjust the priority order
            </span>
          </h2>
          <DragDropContext onDragEnd={(result) => void reorderReadyPullRequests(result)}>
            <Droppable droppableId="ready-pull-requests">
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-3"
                >
                  {filteredReady.map((pullRequest, index) => (
                    <Draggable
                      key={pullRequest.id}
                      draggableId={pullRequest.id}
                      index={index}
                      isDragDisabled={savingAction !== null}
                    >
                      {(draggableProvided, snapshot) => (
                        <div
                          ref={draggableProvided.innerRef}
                          {...draggableProvided.draggableProps}
                          className={snapshot.isDragging ? 'relative z-10 opacity-90' : ''}
                        >
                          {renderPullRequest(
                            pullRequest,
                            true,
                            draggableProvided.dragHandleProps,
                          )}
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      )}

      {filteredBlocked.length > 0 && (
        <div className="mb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-200">
            <AlertCircle className="text-amber-300" size={16} />
            Blocked
          </h2>
          <div className="space-y-3">
            {filteredBlocked.map((pullRequest) => (
              <div key={pullRequest.id}>{renderPullRequest(pullRequest)}</div>
            ))}
          </div>
        </div>
      )}

      {filter === 'all' && openPullRequests.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-12 text-center">
          <GitPullRequest className="mx-auto mb-3 text-gray-600" size={26} />
          <p className="font-medium text-gray-300">No open pull requests synced</p>
          <p className="mt-1 text-sm text-gray-500">
            Sync from GitHub to load the project’s open pull requests.
          </p>
        </div>
      )}

      {filter !== 'all' && filteredReady.length === 0 && filteredBlocked.length === 0 && (
        <div className="rounded-xl border border-dashed border-white/10 px-6 py-10 text-center text-sm text-gray-500">
          No open pull requests match this filter.
        </div>
      )}

      {filter === 'all' && closedPullRequests.length > 0 && (
        <section className="mt-2 border-t border-white/10 pt-5">
          <h2 className="mb-3 text-sm font-semibold text-gray-400">Closed and merged</h2>
          <div className="space-y-3">
            {closedPullRequests.map((pullRequest) => (
              <div key={pullRequest.id}>{renderPullRequest(pullRequest)}</div>
            ))}
          </div>
        </section>
      )}
    </section>
  );
}
