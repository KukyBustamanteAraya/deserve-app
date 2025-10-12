// src/app/components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

type AuthValue = {
  user: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({ user: null, loading: true });

export function AuthProvider({
  children,
  initialUser
}: {
  children: React.ReactNode;
  initialUser?: any | null;
}) {
  const [user, setUser] = useState<any | null>(initialUser ?? null);
  const [loading, setLoading] = useState(false); // Not loading if seeded from server

  useEffect(() => {
    let mounted = true;

    // Realtime subscription to auth state changes (no debounce needed with SSR seeding)
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((_event: any, session: any) => {
      if (!mounted) return;

      logger.debug('Auth: State change event:', _event, session?.user ? 'user present' : 'no user');
      setUser(session?.user ?? null);
    });

    return () => {
      mounted = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  // Optional idle sign-out
  useEffect(() => {
    const minutes = Number(process.env.NEXT_PUBLIC_IDLE_TIMEOUT_MINUTES || '0');
    if (!user || !minutes) return;

    let timer: any;
    const ms = minutes * 60 * 1000;

    const reset = () => {
      clearTimeout(timer);
      timer = setTimeout(async () => {
        try { await supabaseBrowser.auth.signOut(); } finally {
          window.location.replace('/login');
        }
      }, ms);
    };

    const events = ['mousemove', 'keydown', 'click', 'touchstart', 'scroll'];
    events.forEach(ev => window.addEventListener(ev, reset, { passive: true }));

    reset(); // start timer immediately

    return () => {
      clearTimeout(timer);
      events.forEach(ev => window.removeEventListener(ev, reset));
    };
  }, [user]);

  const value = useMemo(() => ({ user, loading }), [user, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}