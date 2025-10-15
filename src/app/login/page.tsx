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
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21]"></div>
          <p className="mt-2 text-gray-300">Loading...</p>
        </div>
      </main>
    );
  }

  if (redirecting) {
    return (
      <main className="max-w-md mx-auto p-4">
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#e21c21]"></div>
          <p className="mt-2 text-gray-300">Redirecting...</p>
        </div>
      </main>
    );
  }

  // Only show form if definitely not authenticated
  if (user) return null;

  return (
    <main className="max-w-md mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6 text-white">Iniciar Sesión</h1>
      {loggedOut && (
        <div role="status" aria-live="polite" className="rounded-lg border px-4 py-3 text-sm mb-6 bg-green-500/20 border-green-500/50 text-green-400 backdrop-blur-sm">
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