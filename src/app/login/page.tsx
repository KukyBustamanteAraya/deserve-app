// src/app/login/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LoginForm from '@/app/components/LoginForm';
import { useAuth } from '@/app/components/AuthProvider';

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  // If already authenticated, bounce to dashboard
  useEffect(() => {
    if (!loading && user && !redirecting) {
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
      <LoginForm onSuccess={() => {
        setRedirecting(true);
        router.replace('/dashboard');
      }} />
    </main>
  );
}