'use client';

import { useAuth } from '@/app/components/AuthProvider';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import SetPasswordForm from './set-password-form';
import { logger } from '@/lib/logger';

export default function SecurityPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(false);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user && !redirecting) {
      logger.debug('Security: Not authenticated, redirecting to login');
      setRedirecting(true);
      router.replace('/login');
    }
  }, [loading, user, router, redirecting]);

  // Show loading state
  if (loading || redirecting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
          <p className="text-gray-300">{loading ? 'Loading...' : 'Redirecting...'}</p>
        </div>
      </div>
    );
  }

  // Don't render if no user (prevents flash before redirect)
  if (!user) {
    return null;
  }

  const hasPassword = (user.identities ?? []).some((i: any) => i.provider === 'email');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="mx-auto max-w-2xl p-6 space-y-6">
        <h1 className="text-3xl font-bold text-white">Security</h1>
        <SetPasswordForm hasPassword={hasPassword} />
      </div>
    </div>
  );
}