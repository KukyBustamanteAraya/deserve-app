'use client';

import { AuthProvider } from '@/app/components/AuthProvider';
import { SWRProvider } from '@/lib/swr/provider';

export default function Providers({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser?: any | null;
}) {
  return (
    <SWRProvider>
      <AuthProvider initialUser={initialUser}>
        {children}
      </AuthProvider>
    </SWRProvider>
  );
}