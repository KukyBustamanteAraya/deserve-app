// src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/app/components/LoginForm';
import { useAuth } from '@/app/components/AuthProvider';
import { logger } from '@/lib/logger';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const searchParams = useSearchParams();
  const loggedOut = searchParams.get("logout") === "1";

  // If already authenticated, bounce to dashboard
  useEffect(() => {
    if (!loading && user && !redirecting) {
      logger.debug('[LoginPage] User detected, redirecting to dashboard...');
      setRedirecting(true);
      router.replace('/dashboard');
    }
  }, [loading, user, router, redirecting]);

  // Show loading during auth check or redirect
  if (loading) {
    return (
      <main className="max-w-md mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </main>
    );
  }

  if (redirecting) {
    return (
      <main className="max-w-md mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
          <p className="mt-2 text-gray-600">Redirecting...</p>
        </div>
      </main>
    );
  }

  // Only show form if definitely not authenticated
  if (user) return null;

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-xl font-semibold mb-4">Iniciar Sesión</h1>
      {loggedOut && (
        <div role="status" aria-live="polite" className="rounded-md border px-3 py-2 text-sm mb-4 bg-green-50 border-green-200 text-green-800">
          You've been signed out.
        </div>
      )}
      <LoginForm onSuccess={() => {
        // Don't redirect immediately - let the useEffect handle it
        // once the AuthProvider confirms the user state is updated
        logger.debug('[LoginPage] Login successful, waiting for auth state...');
      }} />
    </main>
  );
}