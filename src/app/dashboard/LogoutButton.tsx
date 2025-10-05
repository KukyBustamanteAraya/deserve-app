'use client';

import { useTransition } from 'react';

export default function LogoutButton() {
  const [pending, startTransition] = useTransition();

  const onLogout = () => {
    startTransition(async () => {
      try {
        await fetch('/logout', { method: 'GET' });
        window.location.href = '/login';
      } catch (error) {
        console.error('Logout error:', error);
        // Fallback: redirect anyway
        window.location.href = '/login';
      }
    });
  };

  return (
    <button
      onClick={onLogout}
      disabled={pending}
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {pending ? 'Cerrando sesión...' : 'Cerrar Sesión'}
    </button>
  );
}