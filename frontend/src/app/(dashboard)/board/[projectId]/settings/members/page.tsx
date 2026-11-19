'use client';

import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Loader2,
  RefreshCw,
  Trash2,
  UserPlus,
  UsersRound,
} from 'lucide-react';
import { GithubIcon as Github } from '@/components/ui/icons';
import {
  api,
  type AssignableProjectRole,
  type GithubCollaboratorPreview,
  type ProjectMembership,
  type ProjectRole,
  type ProjectSummary,
} from '@/lib/api';

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function ProjectMembersPage() {
  const params = useParams();
  const projectSlug = params?.projectId as string;
  const [project, setProject] = useState<ProjectSummary | null>(null);
  const [members, setMembers] = useState<ProjectMembership[]>([]);
  const [currentUserId, setCurrentUserId] = useState('');
  const [currentUserRole, setCurrentUserRole] = useState<ProjectRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [email, setEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<AssignableProjectRole>('member');
  const [collaborators, setCollaborators] = useState<GithubCollaboratorPreview[] | null>(null);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [invitedCollaborators, setInvitedCollaborators] = useState<string[]>([]);
  const [collaboratorEmails, setCollaboratorEmails] = useState<Record<string, string>>({});
  const [importRole, setImportRole] = useState<AssignableProjectRole>('member');

  const loadPageData = useCallback(async () => {
    if (!projectSlug) return;
    try {
      const [projectData, membershipData, user] = await Promise.all([
        api.getProject(projectSlug),
        api.getProjectMemberships(projectSlug),
        api.getMe(),
      ]);
      setProject(projectData);
      setMembers(membershipData.members || []);
      setCurrentUserRole(membershipData.current_user_role);
      setCurrentUserId(user.id);
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Unable to load project members.'));
    } finally {
      setLoading(false);
    }
  }, [projectSlug]);

  useEffect(() => {
    void Promise.resolve().then(loadPageData);
  }, [loadPageData]);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canGrantAdmin = currentUserRole === 'owner';

  const handleInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!email.trim()) return;

    setSaving(true);
    setError('');
    setNotice('');
    try {
      const result = await api.inviteProjectMember(projectSlug, {
        email: email.trim(),
        role: inviteRole,
      });
      setEmail('');
      setNotice(
        result.status === 'added'
          ? `Added ${result.email} to this project.`
          : `Invitation sent to ${result.email}.`,
      );
      await loadPageData();
    } catch (inviteError: unknown) {
      setError(getErrorMessage(inviteError, 'Unable to add or invite this person.'));
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (
    member: ProjectMembership,
    role: AssignableProjectRole,
  ) => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.updateProjectMember(projectSlug, member.user_id, role);
      setNotice(`Updated ${member.user.username}'s project role.`);
      await loadPageData();
    } catch (roleError: unknown) {
      setError(getErrorMessage(roleError, 'Unable to update this member role.'));
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member: ProjectMembership) => {
    if (!window.confirm(`Remove ${member.user.username} from this project?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await api.removeProjectMember(projectSlug, member.user_id);
      setNotice(`Removed ${member.user.username} from this project.`);
      await loadPageData();
    } catch (removeError: unknown) {
      setError(getErrorMessage(removeError, 'Unable to remove this member.'));
    } finally {
      setSaving(false);
    }
  };

  const previewCollaborators = async () => {
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const preview = await api.previewGithubCollaborators(projectSlug);
      setCollaborators(preview);
      setSelectedCollaborators([]);
      setInvitedCollaborators([]);
      setCollaboratorEmails({});
    } catch (previewError: unknown) {
      setError(getErrorMessage(previewError, 'Unable to load GitHub collaborators.'));
    } finally {
      setSaving(false);
    }
  };

  const importSelectedCollaborators = async () => {
    if (!collaborators) return;
    const selected = collaborators.filter(
      (collaborator) =>
        selectedCollaborators.includes(collaborator.login) && !collaborator.is_member,
    );
    if (!selected.length) return;

    setSaving(true);
    setError('');
    setNotice('');
    const failures: string[] = [];
    const addedLogins: string[] = [];
    const invitedLogins: string[] = [];
    let completed = 0;
    for (const collaborator of selected) {
      try {
        if (collaborator.user) {
          await api.addMember(projectSlug, collaborator.user.id, importRole);
          addedLogins.push(collaborator.login);
        } else {
          const inviteEmail = collaboratorEmails[collaborator.login]?.trim();
          if (!inviteEmail) {
            failures.push(`${collaborator.login}: enter an email address`);
            continue;
          }
          const result = await api.inviteProjectMember(projectSlug, {
            email: inviteEmail,
            role: importRole,
          });
          if (result.status === 'added') addedLogins.push(collaborator.login);
          else invitedLogins.push(collaborator.login);
        }
        completed += 1;
      } catch (importError: unknown) {
        failures.push(
          `${collaborator.login}: ${getErrorMessage(importError, 'could not add')}`,
        );
      }
    }

    if (completed) {
      setNotice(`Processed ${completed} selected collaborator${completed === 1 ? '' : 's'}.`);
    }
    if (failures.length) setError(failures.join('; '));
    await loadPageData();
    setSaving(false);
    setCollaborators((current) =>
      current?.map((collaborator) => ({
        ...collaborator,
        is_member:
          collaborator.is_member || addedLogins.includes(collaborator.login),
      })) || null,
    );
    setInvitedCollaborators(invitedLogins);
    if (!failures.length) {
      setSelectedCollaborators([]);
    }
  };

  const toggleCollaborator = (login: string) => {
    setSelectedCollaborators((current) =>
      current.includes(login)
        ? current.filter((value) => value !== login)
        : [...current, login],
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin text-indigo-400" />
        Loading project members...
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href={`/board/${projectSlug}`}
            className="mb-3 inline-flex items-center gap-2 text-xs text-zinc-500 transition hover:text-zinc-200"
          >
            <ArrowLeft size={14} />
            Back to project
          </Link>
          <h1 className="flex items-center gap-2 text-xl font-bold text-white">
            <UsersRound size={20} className="text-indigo-400" />
            Project members
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {project?.name} · Only listed members can access this project.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void loadPageData()}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
        >
          <RefreshCw size={14} />
          Refresh
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-sm text-emerald-300">
          {notice}
        </div>
      )}

      <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
        <h2 className="text-sm font-semibold text-white">Add a teammate</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Existing DevSync users are added directly. Others receive an email invitation.
        </p>
        {canManage ? (
          <form onSubmit={handleInvite} className="mt-4 flex flex-wrap gap-3">
            <input
              type="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="teammate@example.com"
              aria-label="Teammate email"
              className="min-w-[220px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none transition focus:border-indigo-500"
            />
            <select
              value={inviteRole}
              onChange={(event) => setInviteRole(event.target.value as AssignableProjectRole)}
              aria-label="Project role"
              className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-200 outline-none focus:border-indigo-500"
            >
              <option value="member">Member</option>
              {canGrantAdmin && <option value="admin">Admin</option>}
            </select>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500 disabled:opacity-50"
            >
              {saving ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
              Add or invite
            </button>
          </form>
        ) : (
          <p className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-400">
            You need the Owner or Admin role to manage project members.
          </p>
        )}
      </section>

      <section className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950/40">
        <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold text-white">Members</h2>
            <p className="mt-1 text-xs text-zinc-500">{members.length} project members</p>
          </div>
        </div>
        <div className="divide-y divide-zinc-800/80">
          {members.map((member) => {
            const isSelf = member.user_id === currentUserId;
            const canManageMember =
              canManage &&
              member.role !== 'owner' &&
              (currentUserRole === 'owner' || member.role === 'member');
            return (
              <div key={member.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                {member.user.avatar_url ? (
                  <img
                    src={member.user.avatar_url}
                    alt=""
                    className="h-9 w-9 rounded-full border border-zinc-800 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold uppercase text-zinc-300">
                    {member.user.username.slice(0, 2)}
                  </div>
                )}
                <div className="min-w-[160px] flex-1">
                  <div className="text-sm font-medium text-zinc-100">
                    {member.user.full_name || member.user.username}
                    {isSelf && <span className="ml-2 text-xs text-zinc-500">(you)</span>}
                  </div>
                  <div className="text-xs text-zinc-500">
                    @{member.user.username} · {member.user.email}
                  </div>
                </div>
                {canManageMember ? (
                  <select
                    value={member.role}
                    disabled={saving}
                    aria-label={`Role for ${member.user.username}`}
                    onChange={(event) =>
                      void changeRole(member, event.target.value as AssignableProjectRole)
                    }
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500 disabled:opacity-50"
                  >
                    <option value="member">Member</option>
                    {canGrantAdmin && <option value="admin">Admin</option>}
                  </select>
                ) : (
                  <span className="rounded-full border border-zinc-800 px-3 py-1 text-xs capitalize text-zinc-400">
                    {member.role}
                  </span>
                )}
                {canManageMember && (
                  <button
                    type="button"
                    title={`Remove ${member.user.username}`}
                    aria-label={`Remove ${member.user.username}`}
                    disabled={saving}
                    onClick={() => void removeMember(member)}
                    className="rounded-lg p-2 text-zinc-500 transition hover:bg-rose-500/10 hover:text-rose-300 disabled:opacity-50"
                  >
                    <Trash2 size={15} />
                  </button>
                )}
              </div>
            );
          })}
          {members.length === 0 && (
            <p className="px-5 py-8 text-center text-sm text-zinc-500">
              No active members have been added to this project.
            </p>
          )}
        </div>
      </section>

      {canManage && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Github size={16} />
                GitHub collaborators
              </h2>
              <p className="mt-1 text-xs text-zinc-500">
                Preview repository collaborators. Nothing is added until you select and confirm it.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void previewCollaborators()}
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-800 px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-zinc-700 hover:text-white disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
              Preview collaborators
            </button>
          </div>

          {collaborators && (
            <div className="mt-5">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <span className="text-xs text-zinc-400">
                  {collaborators.length} collaborators found
                </span>
                <div className="flex items-center gap-2">
                  <label htmlFor="import-role" className="text-xs text-zinc-500">Role</label>
                  <select
                    id="import-role"
                    value={importRole}
                    onChange={(event) => setImportRole(event.target.value as AssignableProjectRole)}
                    className="rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-2 text-xs text-zinc-300 outline-none focus:border-indigo-500"
                  >
                    <option value="member">Member</option>
                    {canGrantAdmin && <option value="admin">Admin</option>}
                  </select>
                </div>
              </div>

              <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                {collaborators.map((collaborator) => (
                  <div key={collaborator.login} className="flex flex-wrap items-center gap-3 px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        collaborator.is_member ||
                        invitedCollaborators.includes(collaborator.login) ||
                        selectedCollaborators.includes(collaborator.login)
                      }
                      disabled={
                        collaborator.is_member ||
                        invitedCollaborators.includes(collaborator.login) ||
                        saving
                      }
                      onChange={() => toggleCollaborator(collaborator.login)}
                      aria-label={`Select GitHub collaborator ${collaborator.login}`}
                      className="h-4 w-4 accent-indigo-500"
                    />
                    {collaborator.avatar_url ? (
                      <img src={collaborator.avatar_url} alt="" className="h-8 w-8 rounded-full" />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-[10px] text-zinc-300">
                        {collaborator.login.slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-[140px] flex-1">
                      <div className="flex items-center gap-2 text-sm text-zinc-200">
                        {collaborator.login}
                        {collaborator.html_url && (
                          <a
                            href={collaborator.html_url}
                            target="_blank"
                            rel="noreferrer"
                            aria-label={`Open ${collaborator.login} on GitHub`}
                            className="text-zinc-500 hover:text-indigo-300"
                          >
                            <ExternalLink size={12} />
                          </a>
                        )}
                      </div>
                      <div className="text-[11px] text-zinc-500">
                        {collaborator.is_member
                          ? 'Already a project member'
                          : invitedCollaborators.includes(collaborator.login)
                            ? 'Invitation sent'
                          : collaborator.user
                            ? `DevSync account: ${collaborator.user.email}`
                            : 'No matching DevSync account'}
                        {collaborator.permission && ` · ${collaborator.permission}`}
                      </div>
                    </div>
                    {!collaborator.user && !collaborator.is_member && (
                      <input
                        type="email"
                        value={collaboratorEmails[collaborator.login] || ''}
                        onChange={(event) =>
                          setCollaboratorEmails((current) => ({
                            ...current,
                            [collaborator.login]: event.target.value,
                          }))
                        }
                        placeholder="Email to invite"
                        aria-label={`Invitation email for ${collaborator.login}`}
                        className="min-w-[180px] flex-1 rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-200 outline-none focus:border-indigo-500"
                      />
                    )}
                    {collaborator.is_member && (
                      <Check size={15} className="text-emerald-400" aria-label="Already added" />
                    )}
                  </div>
                ))}
                {collaborators.length === 0 && (
                  <p className="px-4 py-6 text-center text-xs text-zinc-500">
                    No repository collaborators were returned by GitHub.
                  </p>
                )}
              </div>
              <div className="mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => void importSelectedCollaborators()}
                  disabled={saving || selectedCollaborators.length === 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />}
                  Add selected
                </button>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
