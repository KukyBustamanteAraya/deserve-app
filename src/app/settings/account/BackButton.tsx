'use client';

import { useRouter } from 'next/navigation';

export function BackButton() {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className="mr-4 text-gray-600 hover:text-gray-900"
    >
      ← Back
    </button>
  );
}