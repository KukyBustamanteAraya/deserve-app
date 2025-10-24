// src/app/components/LoginForm.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import GoogleSignInButton from '@/app/components/GoogleSignInButton';

type Mode = 'password' | 'magic';

function Spinner() {
  return <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent align-[-2px] animate-spin mr-2" />;
}

export default function LoginForm({ onSuccess }: { onSuccess?: () => void }) {
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [waitingForAuth, setWaitingForAuth] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // Get redirect parameter from URL for invite flow
  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect');
  }, []);

  // Load preferred mode and prefill email
  useEffect(() => {
    try {
      const saved = localStorage.getItem('loginMode') as Mode | null;
      if (saved === 'password' || saved === 'magic') setMode(saved);
      else setMode('magic');

      const lastEmail = localStorage.getItem('auth:lastEmail');
      if (lastEmail && !email) setEmail(lastEmail);
    } catch {}
  }, []);

  // Persist preferred mode
  useEffect(() => {
    try { localStorage.setItem('loginMode', mode); } catch {}
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (!/\S+@\S+\.\S+/.test(email.trim())) return false;
    if (mode === 'password' && password.length < 8) return false;
    return !loading;
  }, [email, password, mode, loading]);

  // Focus management for error/success messages
  useEffect(() => {
    if (errorMsg && errorRef.current) {
      errorRef.current.focus();
    }
  }, [errorMsg]);

  useEffect(() => {
    if (successMsg && successRef.current) {
      successRef.current.focus();
    }
  }, [successMsg]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === 'password') {
        logger.debug('[LoginForm] Attempting password sign-in...');
        const { data, error } = await supabaseBrowser.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (error) throw error;
        logger.debug('[LoginForm] Sign-in successful, session:', { status: data.session ? 'present' : 'missing' });
        logger.debug('[LoginForm] User:', { email: data.user ? data.user.email : 'missing' });
        localStorage.setItem('auth:lastEmail', normalizedEmail);

        // Use server redirect to ensure cookies are set before rendering dashboard
        // Preserve redirect parameter for invite flow
        const nextUrl = redirectUrl || '/dashboard';
        window.location.assign(`/auth/redirect?next=${encodeURIComponent(nextUrl)}`);
        return;
      } else {
        // Preserve redirect parameter for invite flow
        const callbackUrl = redirectUrl
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`
          : `${window.location.origin}/auth/callback`;

        const { error } = await supabaseBrowser.auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;
        setSuccessMsg('Magic link sent! Check your email.');
        localStorage.setItem('auth:lastEmail', normalizedEmail);
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative max-w-md mx-auto p-6 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden group">
      {/* Glass shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      <div className="flex items-center justify-between mb-6 relative">
        <h2 className="text-lg font-semibold text-white">
          {mode === 'password' ? 'Login with Email & Password' : 'Login with Magic Link'}
        </h2>
        <button
          type="button"
          onClick={() => setMode(m => (m === 'password' ? 'magic' : 'password'))}
          className="text-sm text-[#e21c21] hover:text-white transition-colors underline"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          {mode === 'password' ? 'Use magic link' : 'Use password'}
        </button>
      </div>

      {/* Google Sign-In Button */}
      <div className="mb-6 relative">
        <GoogleSignInButton text="Sign in with Google" />
      </div>

      {/* Divider */}
      <div className="relative flex items-center my-6">
        <div className="flex-grow border-t border-gray-600"></div>
        <span className="flex-shrink mx-4 text-sm text-gray-400">OR</span>
        <div className="flex-grow border-t border-gray-600"></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 relative">
        <label className="block">
          <span className="text-sm text-gray-300 font-medium">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-2 w-full bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#e21c21]/50 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/30 transition-all backdrop-blur-sm"
            placeholder="you@example.com"
            autoComplete="email"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          />
        </label>

        {mode === 'password' && (
          <label className="block">
            <span className="text-sm text-gray-300 font-medium">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-2 w-full bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:border-[#e21c21]/50 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/30 transition-all backdrop-blur-sm"
              placeholder="Your password"
              autoComplete="current-password"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
            <a href="/auth/forgot-password" className="text-xs text-gray-400 hover:text-[#e21c21] underline mt-2 inline-block transition-colors" style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}>
              Forgot password?
            </a>
          </label>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          aria-busy={loading}
          className="relative w-full py-3 rounded-lg bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">
            {loading && <Spinner />}
            {loading ? 'Please wait…' : mode === 'password' ? 'Log in' : 'Send magic link'}
          </span>
        </button>

        {errorMsg && (
          <p
            ref={errorRef}
            tabIndex={-1}
            className="text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2 backdrop-blur-sm"
            aria-live="assertive"
          >
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p
            ref={successRef}
            tabIndex={-1}
            className="text-sm text-green-400 bg-green-500/10 border border-green-500/30 rounded-lg px-3 py-2 backdrop-blur-sm"
            aria-live="polite"
          >
            {successMsg}
          </p>
        )}
      </form>

      <p className="text-xs text-gray-400 mt-4 relative">
        New here? You can register with a password or use a magic link during signup.
      </p>
    </div>
  );
}