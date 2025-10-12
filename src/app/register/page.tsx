// src/app/register/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

type Mode = 'password' | 'magic';

function Spinner() {
  return <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent align-[-2px] animate-spin mr-2" />;
}

export default function RegisterPage({ onSuccess }: { onSuccess?: () => void }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // Get redirect parameter from URL
  const redirectUrl = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect');
  }, []);

  // Load preferred mode and prefill email
  useEffect(() => {
    try {
      const saved = localStorage.getItem('registerMode') as Mode | null;
      if (saved === 'password' || saved === 'magic') setMode(saved);

      const lastEmail = localStorage.getItem('auth:lastEmail');
      if (lastEmail && !email) setEmail(lastEmail);
    } catch {}
  }, []);

  // Persist preferred mode
  useEffect(() => {
    try { localStorage.setItem('registerMode', mode); } catch {}
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
        // Preserve redirect parameter for invite flow
        const callbackUrl = redirectUrl
          ? `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectUrl)}`
          : `${window.location.origin}/auth/callback`;

        const { data, error } = await supabaseBrowser.auth.signUp({
          email: normalizedEmail,
          password,
          options: { emailRedirectTo: callbackUrl },
        });
        if (error) throw error;

        // Create profile for new user
        if (data.user) {
          try {
            await supabaseBrowser.from('profiles').insert({
              id: data.user.id,
              full_name: data.user.user_metadata?.full_name || 'New User',
            }).select().single();
          } catch (profileError) {
            // Ignore if profile already exists (conflict)
            console.log('Profile creation:', profileError);
          }
        }

        localStorage.setItem('auth:lastEmail', normalizedEmail);
        if (!data.session) {
          setSuccessMsg('Check your email to confirm your account.');
        } else {
          setSuccessMsg('Account created. Redirecting…');
          onSuccess?.();
          setTimeout(() => router.replace(redirectUrl || '/dashboard'), 400);
        }
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
        localStorage.setItem('auth:lastEmail', normalizedEmail);
        setSuccessMsg('Magic link sent! Check your email to complete registration.');
      }
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Sign up failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-semibold">
          {mode === 'password' ? 'Create your account' : 'Register with Magic Link'}
        </h1>
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
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="you@example.com"
            autoComplete="email"
            required
          />
        </label>

        {mode === 'password' && (
          <label className="block">
            <span className="text-sm">Password</span>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2"
              placeholder="Min 8 characters"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>
        )}

        <button
          type="submit"
          disabled={!canSubmit || loading}
          aria-busy={loading}
          className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? 'Please wait…' : mode === 'password' ? 'Create account' : 'Send magic link'}
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
        Already have an account? <a href="/login" className="underline">Log in</a>
      </p>
    </main>
  );
}
