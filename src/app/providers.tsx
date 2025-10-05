'use client';

import { AuthProvider } from '@/app/components/AuthProvider';

export default function Providers({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser?: any | null;
}) {
  return <AuthProvider initialUser={initialUser}>{children}</AuthProvider>;
}