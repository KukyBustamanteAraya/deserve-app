// src/app/components/withAuthGate.tsx
'use client';

import { ComponentType, PropsWithChildren, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/app/components/AuthProvider';

export function AuthGate({ children }: PropsWithChildren) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Avoid redirect loops: if we're already on /login, do nothing
      if (pathname !== '/login') router.replace('/login');
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return <div className="p-4 text-sm text-gray-600">Loading…</div>;
  }

  if (!user) return null; // redirecting

  return <>{children}</>;
}

export function withAuthGate<T extends object>(Wrapped: ComponentType<T>) {
  const Guarded = (props: T) => (
    <AuthGate>
      <Wrapped {...props} />
    </AuthGate>
  );
  // for display in React DevTools
  (Guarded as any).displayName = `withAuthGate(${Wrapped.displayName || Wrapped.name || 'Component'})`;
  return Guarded;
}