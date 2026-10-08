'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Lock, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('No reset token found. Please request a new password reset link.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Please fill in both fields.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);

    try {
      await api.resetPassword(token, newPassword);
      setSuccess(true);
      // Redirect to login after 3 seconds
      setTimeout(() => router.push('/login'), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 flex items-center justify-center p-6 relative font-sans">
      {/* Background decoration */}
      <div className="absolute top-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-indigo-600/10 blur-[80px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] rounded-full bg-purple-600/10 blur-[80px] pointer-events-none" />

      <div className="w-full max-w-md bg-zinc-950/40 border border-zinc-900 rounded-xl p-8 backdrop-blur-md shadow-2xl relative z-10">
        {/* Header */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shadow-[0_0_15px_rgba(79,70,229,0.5)] mb-4">
            DS
          </Link>
          <h2 className="text-xl font-bold text-white">Set a new password</h2>
          <p className="text-xs text-zinc-500 mt-1">Must be at least 8 characters.</p>
        </div>

        {success ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle className="text-emerald-400" size={40} />
            <p className="text-sm text-zinc-300 leading-relaxed">
              Your password has been updated successfully!
            </p>
            <p className="text-xs text-zinc-500">Redirecting you to sign in...</p>
            <Link href="/login" className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline">
              Go to sign in now
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-medium flex items-start gap-2">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {!token ? (
              <div className="text-center mt-4">
                <Link href="/forgot-password" className="text-sm text-indigo-400 hover:text-indigo-300 hover:underline">
                  Request a new reset link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="new-password">
                    New password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                      id="new-password"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-900 bg-zinc-950/50 text-sm placeholder-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="confirm-password">
                    Confirm new password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                    <input
                      id="confirm-password"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-zinc-900 bg-zinc-950/50 text-sm placeholder-zinc-700 focus:outline-none focus:border-indigo-600 transition-colors"
                      disabled={loading}
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-3 text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.2)] hover:shadow-[0_0_20px_rgba(79,70,229,0.4)] disabled:opacity-50 mt-6"
                >
                  {loading ? (
                    <>
                      <Loader2 className="animate-spin" size={16} />
                      Updating password...
                    </>
                  ) : (
                    'Update password'
                  )}
                </button>

                <div className="mt-4 text-center text-xs text-zinc-500 border-t border-zinc-900 pt-4">
                  Link expired?{' '}
                  <Link href="/forgot-password" className="text-indigo-400 hover:text-indigo-300 hover:underline">
                    Request a new one
                  </Link>
                </div>
              </form>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#060608] flex items-center justify-center">
        <Loader2 className="animate-spin text-indigo-400" size={32} />
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}
