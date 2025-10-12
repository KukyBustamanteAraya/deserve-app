import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  label?: string;
}

const sizeClasses = {
  sm: 'w-4 h-4 border-2',
  md: 'w-8 h-8 border-2',
  lg: 'w-12 h-12 border-3',
  xl: 'w-16 h-16 border-4',
};

/**
 * Loading spinner component
 * Used for inline loading states with SWR
 */
export function LoadingSpinner({ size = 'md', className = '', label }: LoadingSpinnerProps) {
  return (
    <div className={`flex items-center justify-center ${className}`} role="status">
      <div
        className={`${sizeClasses[size]} border-gray-200 border-t-blue-600 rounded-full animate-spin`}
        aria-label={label || 'Loading'}
      />
      {label && <span className="sr-only">{label}</span>}
    </div>
  );
}

/**
 * Full-page loading spinner
 * Used for initial page loads
 */
export function LoadingPage({ message = 'Loading...' }: { message?: string }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <LoadingSpinner size="xl" />
      <p className="mt-4 text-gray-600 text-lg">{message}</p>
    </div>
  );
}

/**
 * Card-level loading spinner
 * Used within cards or sections
 */
export function LoadingCard({ message }: { message?: string }) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-12 flex flex-col items-center justify-center">
      <LoadingSpinner size="lg" />
      {message && <p className="mt-4 text-gray-600">{message}</p>}
    </div>
  );
}

/**
 * Inline loading spinner
 * Used inline with text or buttons
 */
export function LoadingInline({ message }: { message?: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <LoadingSpinner size="sm" />
      {message && <span className="text-gray-600 text-sm">{message}</span>}
    </span>
  );
}
