'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';

interface FormActionsProps {
  loading: boolean;
  mode: 'create' | 'edit';
}

const FormActions = memo(function FormActions({ loading, mode }: FormActionsProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-700">
      <button
        type="button"
        onClick={() => router.back()}
        className="relative px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        disabled={loading}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">Cancel</span>
      </button>
      <button
        type="submit"
        disabled={loading}
        className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        {loading ? (
          <>
            <svg
              className="animate-spin h-5 w-5 relative"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span className="relative">{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
          </>
        ) : (
          <span className="relative">{mode === 'create' ? 'Create Design' : 'Save Changes'}</span>
        )}
      </button>
    </div>
  );
});

export default FormActions;
