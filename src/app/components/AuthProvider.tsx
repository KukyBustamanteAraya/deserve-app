// src/app/components/AuthProvider.tsx
'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabaseBrowser } from '@/lib/supabase/client';

type AuthValue = {
  user: any | null;
  loading: boolean;
};

const AuthContext = createContext<AuthValue>({ user: null, loading: true });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial fetch with error handling
    supabaseBrowser.auth.getUser().then(({ data, error }) => {
      if (!mounted) return;

      if (error) {
        console.log('Auth: Initial getUser error:', error.message);
        setUser(null);
      } else {
        console.log('Auth: Initial user loaded:', data.user ? 'authenticated' : 'not authenticated');
        setUser(data.user ?? null);
      }
      setLoading(false);
    });

    // Realtime subscription to auth state changes with debouncing
    const { data: subscription } = supabaseBrowser.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      console.log('Auth: State change event:', event, session?.user ? 'user present' : 'no user');

      // Debounce rapid auth state changes to prevent flickering
      setTimeout(() => {
        if (!mounted) return;
        setUser(session?.user ?? null);
      }, 50);
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