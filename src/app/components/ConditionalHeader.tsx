'use client';

import { usePathname } from 'next/navigation';
import HeaderClient from './HeaderClient';

export default function ConditionalHeader() {
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin') || false;

  if (isAdminRoute) {
    return null;
  }

  return <HeaderClient />;
}
