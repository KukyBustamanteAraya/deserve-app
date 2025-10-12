'use client';

import { logger } from '@/lib/logger';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  logger.error('Team detail route error:', error);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Team</h1>
        <p className="text-gray-700 mb-2">Something went wrong loading this team page.</p>
        <p className="text-sm text-gray-500 mb-6">{error.message}</p>
        <div className="flex gap-3">
          <button
            onClick={reset}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          <a
            href="/mi-equipo"
            className="flex-1 px-4 py-2 border border-gray-300 text-center rounded-lg hover:bg-gray-50 transition-colors"
          >
            My Teams
          </a>
        </div>
      </div>
    </div>
  );
}
