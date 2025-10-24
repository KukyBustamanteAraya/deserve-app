'use client';

import { memo } from 'react';
import { useRouter } from 'next/navigation';

interface FormHeaderProps {
  mode: 'create' | 'edit';
}

const FormHeader = memo(function FormHeader({ mode }: FormHeaderProps) {
  const router = useRouter();

  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-3xl font-bold text-white">
          {mode === 'create' ? 'Create New Design' : 'Edit Design'}
        </h1>
        <p className="text-gray-400 mt-1">
          {mode === 'create'
            ? 'Add a new design template to your library'
            : 'Update design details and images'}
        </p>
      </div>
      <button
        type="button"
        onClick={() => router.back()}
        className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group"
        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <span className="relative">Cancel</span>
      </button>
    </div>
  );
});

export default FormHeader;
