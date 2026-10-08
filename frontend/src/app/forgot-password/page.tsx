'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await api.forgotPassword(email);
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong. Please try again.');
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
          <h2 className="text-xl font-bold text-white">Forgot your password?</h2>
          <p className="text-xs text-zinc-500 mt-1 text-center">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        {submitted ? (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <CheckCircle className="text-emerald-400" size={40} />
            <p className="text-sm text-zinc-300 leading-relaxed">
              If <span className="text-white font-medium">{email}</span> is registered,
              you&apos;ll receive a password reset link shortly.
            </p>
            <p className="text-xs text-zinc-500">
              Check your spam folder if you don&apos;t see it within a few minutes.
            </p>
            <Link
              href="/login"
              className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 hover:underline flex items-center gap-1"
            >
              <ArrowLeft size={12} /> Back to sign in
            </Link>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-6 p-3 rounded-lg border border-red-500/20 bg-red-500/5 text-xs text-red-400 font-medium text-center">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1.5" htmlFor="email">
                  Email address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600" size={16} />
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
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
                    Sending link...
                  </>
                ) : (
                  'Send reset link'
                )}
              </button>
            </form>

            <div className="mt-8 text-center text-xs text-zinc-500 border-t border-zinc-900 pt-6">
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 hover:underline flex items-center justify-center gap-1">
                <ArrowLeft size={12} /> Back to sign in
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
