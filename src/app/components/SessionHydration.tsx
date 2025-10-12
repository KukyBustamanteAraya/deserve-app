'use client';

import { useEffect } from 'react';
import { createBrowserClient } from '@supabase/ssr';
import { logger } from '@/lib/logger';

/**
 * Session Hydration Component
 * Ensures the browser client reads cookies and hydrates its internal state
 * This allows onAuthStateChange listeners to work properly client-side
 */
export default function SessionHydration() {
  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Hydrate session from cookies
    supabase.auth.getSession().catch((error) => {
      logger.error('[SessionHydration] Failed to hydrate session:', error);
    });
  }, []);

  return null;
}
