'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

export default function LogoutButton() {
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    if (isPending) return;

    setIsPending(true);
    try {
      console.log('Logging out...');
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        console.error('Sign out error:', error);
      } else {
        console.log('Successfully signed out, redirecting to login');
        router.replace('/login');
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleSignOut}
      disabled={isPending}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Cerrando...' : 'Cerrar Sesión'}
    </button>
  );
}