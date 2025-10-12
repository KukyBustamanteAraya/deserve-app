'use client';

// SWR Provider for global configuration
import { SWRConfig } from 'swr';
import { swrConfig } from './config';
import type { ReactNode } from 'react';

interface SWRProviderProps {
  children: ReactNode;
}

/**
 * SWR Provider with global configuration
 * Wrap your app with this to enable SWR globally
 */
export function SWRProvider({ children }: SWRProviderProps) {
  return (
    <SWRConfig value={swrConfig}>
      {children}
    </SWRConfig>
  );
}
