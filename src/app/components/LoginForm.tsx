// src/app/components/LoginForm.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

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
        console.log('[LoginForm] Attempting password sign-in...');
        const { data, error } = await supabaseBrowser.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (error) throw error;
        console.log('[LoginForm] Sign-in successful, session:', data.session ? 'present' : 'missing');
        console.log('[LoginForm] User:', data.user ? data.user.email : 'missing');
        localStorage.setItem('auth:lastEmail', normalizedEmail);

        // Use server redirect to ensure cookies are set before rendering dashboard
        window.location.assign('/auth/redirect?next=/dashboard');
        return;
      } else {
        const { error } = await supabaseBrowser.auth.signInWithOtp({
          email: normalizedEmail,
          options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
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
    <div className="max-w-md mx-auto p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {mode === 'password' ? 'Login with Email & Password' : 'Login with Magic Link'}
        </h2>
        <button
          type="button"
          onClick={() => setMode(m => (m === 'password' ? 'magic' : 'password'))}
          className="text-sm underline"
        >
          {mode === 'password' ? 'Use magic link' : 'Use password'}
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">Email</span>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </label>

        {mode === 'password' && (
          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={8}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Your password"
              autoComplete="current-password"
            />
            <a href="/auth/forgot-password" className="text-xs underline mt-1 inline-block">
              Forgot password?
            </a>
          </label>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          aria-busy={loading}
          className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? 'Please wait…' : mode === 'password' ? 'Log in' : 'Send magic link'}
        </button>

        {errorMsg && (
          <p
            ref={errorRef}
            tabIndex={-1}
            className="text-sm text-red-600"
            aria-live="assertive"
          >
            {errorMsg}
          </p>
        )}
        {successMsg && (
          <p
            ref={successRef}
            tabIndex={-1}
            className="text-sm text-green-700"
            aria-live="polite"
          >
            {successMsg}
          </p>
        )}
      </form>

      <p className="text-xs text-gray-600 mt-3">
        New here? You can register with a password or use a magic link during signup.
      </p>
    </div>
  );
}