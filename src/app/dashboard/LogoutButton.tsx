'use client';

import Link from 'next/link';

export default function LogoutButton() {
  return (
    <Link
      href="/logout"
      className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 inline-block text-center"
    >
      Cerrar Sesión
    </Link>
  );
}