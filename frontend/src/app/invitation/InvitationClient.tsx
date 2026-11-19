'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { UsersRound } from 'lucide-react';
import { api } from '@/lib/api';

interface InvitationClientProps {
  token: string;
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to accept this invitation.';
}

function getErrorStatus(error: unknown): number | undefined {
  if (typeof error === 'object' && error !== null && 'status' in error) {
    const status = error.status;
    return typeof status === 'number' ? status : undefined;
  }
  return undefined;
}

export default function InvitationClient({ token }: InvitationClientProps) {
  const router = useRouter();
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !localStorage.getItem('access_token')) return;

    let active = true;
    api.acceptProjectInvitation(token)
      .then((result) => {
        if (active) router.replace(`/board/${result.project_slug}`);
      })
      .catch((acceptError: unknown) => {
        if (!active) return;
        if (getErrorStatus(acceptError) === 401) {
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          router.replace(`/login?invite=${encodeURIComponent(token)}`);
          return;
        }
        setError(getErrorMessage(acceptError));
      });

    return () => {
      active = false;
    };
  }, [router, token]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#060608] p-6 text-zinc-100">
      <section className="w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950/60 p-8 text-center">
        <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300">
          <UsersRound size={20} />
        </div>
        <h1 className="text-lg font-bold text-white">Project invitation</h1>
        <p
          role={error || !token ? 'alert' : 'status'}
          className="mt-2 text-sm text-zinc-400"
        >
          {!token
            ? 'This invitation link is missing its token.'
            : error ||
              'Sign in or create an account with the email address that received this invitation. If you are already signed in, DevSync will accept it automatically.'}
        </p>
        {token && (
          <div className="mt-6 flex justify-center gap-3">
            <Link
              href={`/login?invite=${encodeURIComponent(token)}`}
              className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
            >
              Sign in
            </Link>
            <Link
              href={`/register?invite=${encodeURIComponent(token)}`}
              className="rounded-lg border border-zinc-700 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:border-zinc-500"
            >
              Create account
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
