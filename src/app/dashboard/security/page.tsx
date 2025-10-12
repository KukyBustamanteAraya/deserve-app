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
      <div className="mx-auto max-w-xl p-6 space-y-6">
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p className="text-gray-600">{loading ? 'Loading...' : 'Redirecting...'}</p>
          </div>
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
    <div className="mx-auto max-w-xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Security</h1>
      <SetPasswordForm hasPassword={hasPassword} />
    </div>
  );
}