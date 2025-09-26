// src/app/login/page.tsx
'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import LoginForm from '@/app/components/LoginForm';
import { useAuth } from '@/app/components/AuthProvider';

function LoginPageForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);
  const errorParam = searchParams.get('error');

  // Capture and validate the next parameter
  const next = (searchParams.get('next') || '/dashboard').startsWith('/')
    ? searchParams.get('next')!
    : '/dashboard';

  // If already authenticated, bounce to next destination
  useEffect(() => {
    if (!loading && user && !redirecting) {
      setRedirecting(true);
      router.replace(next);
    }
  }, [loading, user, router, redirecting, next]);

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
      {errorParam && (
        <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 mb-4">
          {decodeURIComponent(errorParam)}
        </div>
      )}
      <LoginForm
        next={next}
        onSuccess={() => {
          setRedirecting(true);
          router.replace(next);
        }}
      />
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoginPageForm />
    </Suspense>
  );
}