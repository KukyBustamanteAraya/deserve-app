'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  const onLogout = () => {
    startTransition(async () => {
      try {
        // Use Supabase signOut
        const { error } = await supabaseBrowser.auth.signOut();

        if (error) {
          throw error;
        }

        logger.info('User logged out successfully');

        // Redirect to homepage after successful logout
        router.push('/');
      } catch (error) {
        logger.error('Logout error:', toError(error));
        // Fallback: still try to redirect
        router.push('/');
      }
    });
  };

  return (
    <button
      onClick={onLogout}
      disabled={pending}
      className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <span className="relative">{pending ? 'Cerrando sesión...' : 'Cerrar Sesión'}</span>
    </button>
  );
}