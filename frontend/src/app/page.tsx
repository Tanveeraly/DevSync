'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShieldAlert, 
  Lock, 
  GitMerge, 
  Zap, 
  ArrowRight, 
  CheckCircle, 
  Terminal, 
  Code, 
  Users, 
  Sparkles,
  GitPullRequest
} from 'lucide-react';

export default function LandingPage() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    // Check if user is logged in via local storage token
    const token = localStorage.getItem('access_token');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-[#060608] text-zinc-100 selection:bg-indigo-500/20 selection:text-indigo-200 overflow-x-hidden font-sans">
      {/* Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-30">
        <div className="absolute -top-[20%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 blur-[120px]" />
        <div className="absolute -top-[10%] right-[10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-purple-500 to-pink-500 blur-[150px]" />
      </div>

      {/* Header Navigation */}
      <header className="sticky top-0 z-50 w-full border-b border-zinc-900 bg-[#060608]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600 text-white font-black shadow-[0_0_15px_rgba(79,70,229,0.5)]">
              DS
            </div>
            <span className="font-semibold text-lg tracking-tight bg-gradient-to-r from-white to-zinc-400 bg-clip-text text-transparent">
              DevSync
            </span>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#architecture" className="hover:text-white transition-colors">Architecture</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
          </nav>

          <div className="flex items-center gap-4">
            {isLoggedIn ? (
              <Link 
                href="/dashboard" 
                className="flex items-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:-translate-y-0.5"
              >
                Go to Console
                <ArrowRight size={15} />
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors">
                  Sign In
                </Link>
                <Link 
                  href="/register" 
                  className="rounded-lg bg-indigo-600 hover:bg-indigo-500 px-4 py-2 text-sm font-semibold text-white transition-all shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] hover:-translate-y-0.5"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28">
        <div className="container mx-auto px-6 text-center max-w-4xl relative z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-6 animate-pulse">
            <Sparkles size={12} />
            Version 1.0 Launching Now
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Where Code Meets{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Real-Time
            </span>{' '}
            Coordination
          </h1>

          <p className="text-lg sm:text-xl text-zinc-400 mb-10 max-w-2xl mx-auto font-light leading-relaxed">
            Prevent collisions before they break your codebase. Keep your task boards, branches, and team in absolute sync automatically.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Link 
              href={isLoggedIn ? "/dashboard" : "/register"} 
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 px-8 py-4 text-base font-semibold text-white transition-all shadow-[0_0_20px_rgba(79,70,229,0.4)] hover:shadow-[0_0_30px_rgba(79,70,229,0.6)] hover:-translate-y-0.5"
            >
              Start Syncing Free
              <ArrowRight size={18} />
            </Link>
            <a 
              href="#features" 
              className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/40 hover:bg-zinc-950/80 px-8 py-4 text-base font-semibold text-zinc-300 hover:text-white transition-all hover:border-zinc-700"
            >
              Explore Features
            </a>
          </div>

          {/* Interactive Screen Mockup */}
          <div className="relative rounded-xl border border-zinc-800 bg-zinc-950/40 p-2 shadow-[0_0_50px_rgba(0,0,0,0.8)] max-w-5xl mx-auto group">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            {/* Mockup Topbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-900 bg-zinc-950/80 rounded-t-lg">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-zinc-800" />
                <span className="w-3 h-3 rounded-full bg-zinc-800" />
                <span className="w-3 h-3 rounded-full bg-zinc-800" />
              </div>
              <div className="flex items-center gap-2 rounded bg-zinc-900 px-6 py-1 text-[11px] text-zinc-500 font-mono">
                <Terminal size={10} /> devsync.io/board/devsync-core
              </div>
              <div className="w-12" />
            </div>

            {/* Mockup Canvas */}
            <div className="p-4 bg-[#0a0a0d] rounded-b-lg overflow-hidden text-left font-sans">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-900">
                <div>
                  <h3 className="text-sm font-semibold text-white">DevSync Kanban Board</h3>
                  <p className="text-xs text-zinc-500">Live Workspace Synchronized</p>
                </div>
                <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Live Broadcast Active
                </div>
              </div>

              {/* Columns */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Column 1 */}
                <div className="rounded-lg bg-zinc-950/60 border border-zinc-900 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">In Progress</span>
                    <span className="text-[10px] rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-400">2</span>
                  </div>
                  <div className="space-y-3">
                    <div className="rounded border border-indigo-500/30 bg-indigo-500/5 p-3 relative">
                      <div className="absolute top-2 right-2 flex items-center gap-1 text-[10px] text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded font-mono">
                        <Lock size={8} /> LOCKED
                      </div>
                      <span className="text-[10px] text-indigo-400 font-semibold tracking-wider font-mono">DS-101</span>
                      <h4 className="text-xs font-bold text-white mt-1">Set up JWT Auth Middleware</h4>
                      <p className="text-[10px] text-zinc-400 mt-1">Sara Khan is currently editing this card...</p>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-900/60">
                        <div className="h-5 w-5 rounded-full bg-indigo-600 text-[10px] font-bold flex items-center justify-center text-white">SK</div>
                        <span className="text-[10px] text-zinc-400 font-mono">feature/jwt-auth</span>
                      </div>
                    </div>

                    <div className="rounded border border-zinc-900 bg-zinc-950 p-3">
                      <span className="text-[10px] text-zinc-500 font-semibold tracking-wider font-mono">DS-104</span>
                      <h4 className="text-xs font-bold text-white mt-1">Drag-and-Drop Kanban interface</h4>
                      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-zinc-900/60">
                        <div className="h-5 w-5 rounded-full bg-purple-600 text-[10px] font-bold flex items-center justify-center text-white">AR</div>
                        <span className="text-[10px] text-zinc-500 font-mono">feat/kanban-dnd</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column 2 */}
                <div className="rounded-lg bg-zinc-950/60 border border-zinc-900 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">In Review</span>
                    <span className="text-[10px] rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-400">1</span>
                  </div>
                  <div className="rounded border border-zinc-900 bg-zinc-950 p-3">
                    <span className="text-[10px] text-zinc-500 font-semibold tracking-wider font-mono">DS-105</span>
                    <h4 className="text-xs font-bold text-white mt-1">Add Websocket Room Routing</h4>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-zinc-400 font-mono">
                      <GitPullRequest size={10} className="text-purple-400" />
                      PR #48 opened
                    </div>
                  </div>
                </div>

                {/* Column 3 */}
                <div className="rounded-lg bg-zinc-950/60 border border-zinc-900 p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Done</span>
                    <span className="text-[10px] rounded bg-zinc-900 px-1.5 py-0.5 text-zinc-400">1</span>
                  </div>
                  <div className="rounded border border-emerald-500/20 bg-emerald-500/5 p-3 opacity-70">
                    <span className="text-[10px] text-emerald-400 font-semibold tracking-wider font-mono">DS-103</span>
                    <h4 className="text-xs font-bold text-white mt-1">Configure Alembic Async Migrations</h4>
                    <div className="flex items-center gap-1.5 mt-2 text-[10px] text-emerald-400 font-mono">
                      <GitMerge size={10} />
                      PR #42 merged
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-20 border-t border-zinc-900 bg-zinc-950/20">
        <div className="container mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">
              Prevent Collisions. Keep Focus.
            </h2>
            <p className="text-zinc-400 font-light">
              We built the safety rails directly into your collaboration workspace, keeping your task board fully aligned with what your team is writing in their terminals.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {/* Feature 1 */}
            <div className="group rounded-xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-indigo-500/30 transition-all hover:shadow-[0_0_30px_rgba(79,70,229,0.1)] hover:-translate-y-1">
              <div className="h-12 w-12 rounded-lg bg-indigo-600/10 text-indigo-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Lock size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Assignment Locking</h3>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                When a developer begins editing or dragging a task, it dynamically locks for everyone else on the board. Visual indicators prevent duplication of work instantly.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="group rounded-xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-purple-500/30 transition-all hover:shadow-[0_0_30px_rgba(139,92,246,0.1)] hover:-translate-y-1">
              <div className="h-12 w-12 rounded-lg bg-purple-600/10 text-purple-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ShieldAlert size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Optimistic Locking</h3>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                Database-level version tracking checks every update request. Stale updates from outdated UI sessions receive a structured 409 conflict code rather than causing silent overwrites.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="group rounded-xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-pink-500/30 transition-all hover:shadow-[0_0_30px_rgba(236,72,153,0.1)] hover:-translate-y-1">
              <div className="h-12 w-12 rounded-lg bg-pink-600/10 text-pink-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Zap size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Live WebSockets</h3>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                A persistent WebSockets connection streams changes immediately. Moving issues, comment updates, and task assignments appear live on your teammates' monitors without refreshing.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="group rounded-xl border border-zinc-900 bg-zinc-950/40 p-8 hover:border-emerald-500/30 transition-all hover:shadow-[0_0_30px_rgba(16,185,129,0.1)] hover:-translate-y-1">
              <div className="h-12 w-12 rounded-lg bg-emerald-600/10 text-emerald-400 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <GitMerge size={22} />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">GitHub Webhooks</h3>
              <p className="text-zinc-400 text-sm font-light leading-relaxed">
                Connect your repositories directly. Merging a pull request auto-advances the corresponding issue card to Done, logging branch URLs and merge details in your activity feed.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section id="architecture" className="py-20 border-t border-zinc-900 bg-zinc-950/10">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-12 items-center">
            <div className="lg:col-span-2 text-left">
              <span className="text-indigo-400 text-xs font-semibold tracking-widest uppercase mb-3 block">Under the Hood</span>
              <h2 className="text-3xl font-extrabold text-white mb-4">Robust Full Stack Architecture</h2>
              <p className="text-zinc-400 text-sm font-light leading-relaxed mb-6">
                DevSync connects a lightning-fast FastAPI asynchronous backend with a responsive Next.js frontend, routing real-time operations over WebSockets and integrating webhook services seamlessly.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-indigo-500" />
                  <span className="text-zinc-300 text-sm">Async SQLAlchemy 2.0 Database Connection</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-indigo-500" />
                  <span className="text-zinc-300 text-sm">Strict JWT Auth Handlers & Password Encryption</span>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircle size={16} className="text-indigo-500" />
                  <span className="text-zinc-300 text-sm">Dynamic Room-Based WebSockets Routing</span>
                </div>
              </div>
            </div>

            {/* Architecture diagram representation */}
            <div className="lg:col-span-3 rounded-xl border border-zinc-800 bg-zinc-950/60 p-6 font-mono text-xs text-indigo-300 relative">
              <div className="absolute top-2 right-4 text-[10px] text-zinc-500">System Flow</div>
              <div className="space-y-6 pt-4">
                <div className="flex items-center justify-between">
                  <div className="rounded border border-indigo-500/30 bg-indigo-500/5 px-4 py-2.5 text-center w-[120px] shadow-[0_0_15px_rgba(79,70,229,0.1)]">
                    <span className="font-bold text-white block">Next.js</span>
                    <span className="text-[9px] text-indigo-400">Frontend Client</span>
                  </div>
                  <div className="flex-1 flex flex-col items-center justify-center font-bold text-[9px] text-zinc-500">
                    <span>REST API + WS</span>
                    <span className="w-full h-0.5 border-t border-dashed border-zinc-800 mt-1 relative">
                      <span className="absolute right-0 -top-1 font-sans">➔</span>
                      <span className="absolute left-0 -top-1 font-sans">#</span>
                    </span>
                  </div>
                  <div className="rounded border border-purple-500/30 bg-purple-500/5 px-4 py-2.5 text-center w-[120px] shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                    <span className="font-bold text-white block">FastAPI</span>
                    <span className="text-[9px] text-purple-400">API Backend</span>
                  </div>
                </div>

                <div className="flex items-center justify-end">
                  <div className="flex-1 flex flex-col items-end pr-8 font-bold text-[9px] text-zinc-500">
                    <span>SQLAlchemy Async</span>
                    <span className="w-1/2 h-0.5 border-t border-dashed border-zinc-800 mt-1 relative">
                      <span className="absolute left-0 -top-1 font-sans">➔</span>
                    </span>
                  </div>
                  <div className="rounded border border-emerald-500/30 bg-emerald-500/5 px-4 py-2.5 text-center w-[120px] shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                    <span className="font-bold text-white block">Database</span>
                    <span className="text-[9px] text-emerald-400">SQLite / PG</span>
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-4 flex items-center justify-between text-zinc-500 text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <Code size={12} className="text-zinc-600" />
                    <span>Python 3.11+</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Users size={12} className="text-zinc-600" />
                    <span>WebSocket Rooms</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 border-t border-zinc-900 bg-zinc-950/20">
        <div className="container mx-auto px-6 max-w-5xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-extrabold text-white mb-4">Flexible Plans for Growing Teams</h2>
            <p className="text-zinc-400 font-light">
              Get started for free or scale to support larger developer workflows.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch">
            {/* Tier 1 */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Free</span>
                <h3 className="text-xl font-bold text-white mt-1">Developer</h3>
                <p className="text-zinc-400 text-xs font-light mt-2 mb-6">Perfect for individual developers working on side projects.</p>
                <div className="mb-6">
                  <span className="text-3xl font-black text-white">$0</span>
                  <span className="text-zinc-500 text-xs font-medium">/mo</span>
                </div>
                <ul className="space-y-3.5 mb-8 text-zinc-400 text-xs font-light">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> 1 Board / 2 Collaborators
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> Assignment Locking
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> SQLite Local DB
                  </li>
                </ul>
              </div>
              <Link 
                href="/register" 
                className="w-full text-center rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2.5 text-xs font-semibold transition-colors"
              >
                Sign Up Free
              </Link>
            </div>

            {/* Tier 2 */}
            <div className="rounded-xl border border-indigo-500/40 bg-indigo-500/5 p-8 flex flex-col justify-between relative shadow-[0_0_30px_rgba(79,70,229,0.15)]">
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-indigo-600 text-white font-bold text-[9px] tracking-widest uppercase">
                Most Popular
              </div>
              <div>
                <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider">Startup</span>
                <h3 className="text-xl font-bold text-white mt-1">Team Sync</h3>
                <p className="text-zinc-400 text-xs font-light mt-2 mb-6">Designed to keep growing engineering teams in complete harmony.</p>
                <div className="mb-6">
                  <span className="text-3xl font-black text-white">$19</span>
                  <span className="text-zinc-500 text-xs font-medium">/mo</span>
                </div>
                <ul className="space-y-3.5 mb-8 text-zinc-300 text-xs font-light">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> Unlimited Boards & Projects
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> GitHub Webhook Syncing
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> Persistent Websocket Rooms
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> PostgreSQL Async Engine
                  </li>
                </ul>
              </div>
              <Link 
                href="/register" 
                className="w-full text-center rounded bg-indigo-600 hover:bg-indigo-500 text-white py-2.5 text-xs font-semibold transition-colors shadow-[0_0_15px_rgba(79,70,229,0.3)]"
              >
                Start Trial
              </Link>
            </div>

            {/* Tier 3 */}
            <div className="rounded-xl border border-zinc-900 bg-zinc-950/30 p-8 flex flex-col justify-between">
              <div>
                <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Enterprise</span>
                <h3 className="text-xl font-bold text-white mt-1">Custom</h3>
                <p className="text-zinc-400 text-xs font-light mt-2 mb-6">Built for large organizations requiring scale and dedicated controls.</p>
                <div className="mb-6">
                  <span className="text-3xl font-black text-white">Custom</span>
                </div>
                <ul className="space-y-3.5 mb-8 text-zinc-400 text-xs font-light">
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> Single Sign-On (SAML / OIDC)
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> Dedicated Staging / Prod Pools
                  </li>
                  <li className="flex items-center gap-2.5">
                    <CheckCircle size={12} className="text-indigo-500" /> 24/7 Priority SLAs
                  </li>
                </ul>
              </div>
              <a 
                href="mailto:sales@devsync.io" 
                className="w-full text-center rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 py-2.5 text-xs font-semibold transition-colors"
              >
                Contact Sales
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-12 bg-zinc-950/40 text-center text-xs text-zinc-600">
        <div className="container mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <span className="font-bold text-zinc-500">DevSync</span>
            <span>&copy; {new Date().getFullYear()} All rights reserved.</span>
          </div>
          <div className="flex gap-6 text-zinc-500">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="https://github.com" className="hover:text-white transition-colors">GitHub</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
