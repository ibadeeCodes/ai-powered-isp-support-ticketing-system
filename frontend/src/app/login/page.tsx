'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Wifi, AlertCircle, LogIn, Loader2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { login } from '@/lib/auth';

export default function LoginPage() {
  const { session, loading, login: setSession } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // If already authenticated, redirect to the appropriate dashboard
  useEffect(() => {
    if (!loading && session) {
      if (session.role === 'AGENT' || session.role === 'ADMIN') {
        router.replace('/agent');
      } else {
        router.replace('/');
      }
    }
  }, [loading, session, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Email address is required.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setSubmitting(true);
    try {
      const session = await login(email, password);
      setSession(session);

      // Route to the correct portal based on role
      if (session.role === 'AGENT' || session.role === 'ADMIN') {
        router.push('/agent');
      } else {
        router.push('/');
      }
    } catch (err: unknown) {
      const errorMsg =
        err instanceof Error ? err.message : 'Invalid email or password. Please try again.';
      setError(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Logo */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-600/30 mb-4">
          <Wifi className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">ISP AI Support</h1>
        <p className="text-sm text-slate-400 mt-1">Sign in to continue to the support portal</p>
      </div>

      <div className="w-full max-w-sm bg-slate-900 rounded-2xl border border-slate-800 shadow-xl shadow-black/40 p-8 space-y-5">
        <form onSubmit={handleLogin} className="space-y-4">
          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Email Address
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setError(null);
              }}
              placeholder="you@example.com"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5"
            >
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError(null);
                }}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 pr-10 rounded-xl border border-slate-800 bg-slate-950 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 flex items-center text-slate-500 hover:text-slate-300 transition-colors"
                tabIndex={-1}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-950/80 border border-rose-800/80 text-rose-300 text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-blue-800/50 text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <LogIn className="w-4 h-4" />
                Sign In
              </>
            )}
          </button>
        </form>

        {/* Demo credentials hint */}
        <div className="border-t border-slate-800 pt-4 space-y-2 text-xs text-slate-400">
          <p className="font-semibold text-slate-400 uppercase tracking-wider text-[10px]">
            Demo Accounts
          </p>
          <div className="space-y-1">
            <p>
              <span className="font-medium text-slate-300">Customer:</span>{' '}
              ali@example.com / customer123
            </p>
            <p>
              <span className="font-medium text-slate-300">Agent:</span>{' '}
              haris@example.com / agent123
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
