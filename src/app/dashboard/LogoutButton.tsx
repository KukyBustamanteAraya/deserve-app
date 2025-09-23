'use client';

import { useTransition } from 'react';
import { signOut } from '../(auth)/actions';

export default function LogoutButton() {
  const [isPending, startTransition] = useTransition();

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
    });
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