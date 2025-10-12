'use client';

import React from 'react';
import { logger } from '@/lib/logger';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary component
 * Catches React errors and displays fallback UI
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    logger.error('ErrorBoundary caught error:', { error, errorInfo });
    this.props.onError?.(error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <ErrorDisplay
          error={this.state.error}
          onReset={() => this.setState({ hasError: false, error: undefined })}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Error display component
 * Shows error message with retry button
 */
export function ErrorDisplay({
  error,
  onReset,
  title = 'Something went wrong',
}: {
  error?: Error;
  onReset?: () => void;
  title?: string;
}) {
  return (
    <div className="bg-white rounded-xl shadow-lg p-8 text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
        <svg
          className="w-8 h-8 text-red-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
      </div>

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {error && (
        <p className="text-sm text-gray-600 mb-6 max-w-md mx-auto">
          {error.message || 'An unexpected error occurred'}
        </p>
      )}

      {onReset && (
        <button
          onClick={onReset}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      )}
    </div>
  );
}

/**
 * Inline error display
 * Compact error message for inline usage
 */
export function ErrorInline({
  error,
  onRetry,
}: {
  error?: Error | string;
  onRetry?: () => void;
}) {
  const message = typeof error === 'string' ? error : error?.message || 'An error occurred';

  return (
    <div className="flex items-center gap-2 text-red-600 text-sm">
      <svg
        className="w-4 h-4 flex-shrink-0"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-blue-600 hover:text-blue-800 underline font-medium"
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Page-level error display
 * Full-page error state
 */
export function ErrorPage({
  error,
  onReset,
  title = 'Something went wrong',
}: {
  error?: Error;
  onReset?: () => void;
  title?: string;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full">
        <ErrorDisplay error={error} onReset={onReset} title={title} />
      </div>
    </div>
  );
}
