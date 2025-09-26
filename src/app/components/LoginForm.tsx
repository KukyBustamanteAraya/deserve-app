// src/app/components/LoginForm.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabaseBrowser } from '@/utils/supabase/client';
import { siteOrigin } from '@/utils/url';
import { getAuthStrings } from '@/lib/i18n/auth';
import { track } from '@/lib/analytics';

type Mode = 'password' | 'magic';

function Spinner() {
  return <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent align-[-2px] animate-spin mr-2" />;
}

export default function LoginForm({ next = '/dashboard', onSuccess }: { next?: string; onSuccess?: () => void }) {
  const searchParams = useSearchParams();
  const strings = getAuthStrings();
  const [mode, setMode] = useState<Mode>('magic');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [resendCooldown, setResendCooldown] = useState(0);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // Check if there's an error from expired/invalid magic link
  const urlError = searchParams?.get('error');
  const isLinkError = urlError?.includes('expired') || urlError?.includes('invalid') || urlError?.includes('already used');

  // Load preferred mode and prefill email
  useEffect(() => {
    try {
      const saved = localStorage.getItem('loginMode') as Mode | null;
      if (saved === 'password' || saved === 'magic') setMode(saved);
      else setMode('magic');

      // If there's a link error, try to prefill email from last attempt
      if (isLinkError && !email) {
        const lastEmail = localStorage.getItem('last_login_email');
        if (lastEmail) setEmail(lastEmail);
      } else {
        const lastEmail = localStorage.getItem('auth:lastEmail');
        if (lastEmail && !email) setEmail(lastEmail);
      }
    } catch {}
  }, [isLinkError, email]);

  // Persist preferred mode
  useEffect(() => {
    try { localStorage.setItem('loginMode', mode); } catch {}
  }, [mode]);

  const canSubmit = useMemo(() => {
    if (!/\S+@\S+\.\S+/.test(email.trim())) return false;
    if (mode === 'password' && password.length < 8) return false;
    return !loading && resendCooldown === 0;
  }, [email, password, mode, loading, resendCooldown]);

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
        track('auth_password_login_attempt', { email: normalizedEmail });

        const { error } = await supabaseBrowser.auth.signInWithPassword({
          email: normalizedEmail,
          password
        });
        if (error) throw error;

        track('auth_password_login_success', { email: normalizedEmail });
        setSuccessMsg('Logged in successfully.');
        localStorage.setItem('auth:lastEmail', normalizedEmail);
        onSuccess?.();
      } else {
        track('auth_magic_requested', { email: normalizedEmail });

        const { error } = await supabaseBrowser.auth.signInWithOtp({
          email: normalizedEmail,
          options: {
            emailRedirectTo: `${siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`
          },
        });
        if (error) throw error;

        setSuccessMsg('Magic link sent! Check your email.');
        localStorage.setItem('auth:lastEmail', normalizedEmail);
        localStorage.setItem('last_login_email', normalizedEmail);
      }
    } catch (err: any) {
      // Don't leak raw server errors for security
      const message = mode === 'password'
        ? 'Invalid email or password. Please try again.'
        : 'Failed to send magic link. Please try again.';
      setErrorMsg(message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResend() {
    if (!email || resendCooldown > 0) return;

    const normalizedEmail = email.trim().toLowerCase();

    track('auth_magic_resent', { email: normalizedEmail });

    setResendCooldown(60);
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    try {
      const { error } = await supabaseBrowser.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          emailRedirectTo: `${siteOrigin()}/auth/confirm?next=${encodeURIComponent(next)}`
        },
      });
      if (error) throw error;

      setSuccessMsg(strings.resend_banner_neutral);
      setErrorMsg(null);
      localStorage.setItem('last_login_email', normalizedEmail);
    } catch (err: any) {
      setErrorMsg('Failed to send magic link. Please try again.');
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 border rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {mode === 'password' ? strings.login_with_password : strings.login_with_magic}
        </h2>
        <button
          type="button"
          onClick={() => setMode(m => (m === 'password' ? 'magic' : 'password'))}
          className="text-sm underline"
        >
          {mode === 'password' ? 'Use magic link' : 'Use password'}
        </button>
      </div>

      {/* Show helpful tips for link errors */}
      {isLinkError && (
        <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm">
          <p className="text-amber-800 font-medium mb-2">{strings.error_link_invalid}</p>
          <p className="text-amber-700 text-xs mb-1">{strings.tip_same_device}</p>
          <p className="text-amber-700 text-xs">Links expire quickly—request a fresh one.</p>
        </div>
      )}

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
            <a href={`/auth/forgot?next=${encodeURIComponent(next)}`} className="text-xs underline mt-1 inline-block">
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

        {/* Resend button for magic link mode or when there's a link error */}
        {(mode === 'magic' || isLinkError) && email && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendCooldown > 0 || !email.trim()}
            className="w-full py-2 rounded border border-gray-300 text-gray-700 disabled:opacity-50 text-sm"
          >
            {resendCooldown > 0 ? `Wait ${resendCooldown}s` : strings.resend_cta}
          </button>
        )}

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