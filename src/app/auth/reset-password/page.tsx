// src/app/auth/reset-password/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canSubmit = useMemo(() => {
    if (loading) return false;
    if (newPassword.length < 8) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [loading, newPassword, confirmPassword]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { error } = await supabaseBrowser.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setSuccessMsg('Your password has been updated.');
      // Optionally wait a moment, then route to dashboard
      setTimeout(() => router.replace('/dashboard'), 500);
    } catch (err: any) {
      setErrorMsg(err?.message ?? 'Could not update password. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Set a new password</h1>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block">
          <span className="text-sm">New password</span>
          <input
            type="password"
            value={newPassword}
            onChange={e => setNewPassword(e.target.value)}
            minLength={8}
            required
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="Min 8 characters"
            autoComplete="new-password"
          />
        </label>

        <label className="block">
          <span className="text-sm">Confirm password</span>
          <input
            type="password"
            value={confirmPassword}
            onChange={e => setConfirmPassword(e.target.value)}
            minLength={8}
            required
            className="mt-1 w-full border rounded px-3 py-2"
            placeholder="Repeat your new password"
            autoComplete="new-password"
          />
        </label>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full py-2 rounded bg-black text-white disabled:opacity-50"
        >
          {loading ? 'Please wait…' : 'Update password'}
        </button>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
        {successMsg && <p className="text-sm text-green-700">{successMsg}</p>}
      </form>

      <p className="text-xs text-gray-600 mt-3">
        This page works after you open the password reset link we emailed you.
      </p>
    </main>
  );
}