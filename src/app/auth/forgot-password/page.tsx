// src/app/auth/forgot-password/page.tsx
'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

function Spinner() {
  return <span aria-hidden className="inline-block h-4 w-4 rounded-full border-2 border-current border-t-transparent align-[-2px] animate-spin mr-2" />;
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const successRef = useRef<HTMLParagraphElement>(null);

  // Prefill email from localStorage
  useEffect(() => {
    try {
      const lastEmail = localStorage.getItem('auth:lastEmail');
      if (lastEmail && !email) setEmail(lastEmail);
    } catch {}
  }, []);

  const canSubmit = useMemo(() => /\S+@\S+\.\S+/.test(email.trim()) && !loading, [email, loading]);

  // Focus management for error/success messages
  useEffect(() => {
    if (errorMsg && errorRef.current) {
      errorRef.current.focus();
    }
  }, [errorMsg]);

  useEffect(() => {
    if (success && successRef.current) {
      successRef.current.focus();
    }
  }, [success]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || loading) return;

    const normalizedEmail = email.trim().toLowerCase();
    setLoading(true);
    setSuccess(null);
    setErrorMsg(null);

    try {
      const { error } = await supabaseBrowser.auth.resetPasswordForEmail(normalizedEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
      });
      if (error) throw error;
      localStorage.setItem('auth:lastEmail', normalizedEmail);
      setSuccess('We sent you a password reset link. Please check your email.');
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Could not send reset link. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Forgot your password?</h1>
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
        <button
          type="submit"
          disabled={!canSubmit || loading}
          aria-busy={loading}
          className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading && <Spinner />}
          {loading ? 'Please wait…' : 'Send reset link'}
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
        {success && (
          <p
            ref={successRef}
            tabIndex={-1}
            className="text-sm text-green-700"
            aria-live="polite"
          >
            {success}
          </p>
        )}
      </form>
      <p className="text-xs text-gray-600 mt-3">
        We'll email you a link to reset your password securely.
      </p>
    </main>
  );
}