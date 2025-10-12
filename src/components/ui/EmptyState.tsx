import React from 'react';

interface EmptyStateProps {
  title: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

/**
 * Empty state component
 * Displays when no data is available
 */
export function EmptyState({
  title,
  message,
  icon,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`bg-white rounded-xl shadow-lg p-12 text-center ${className}`}>
      {icon ? (
        <div className="mb-4 flex justify-center">{icon}</div>
      ) : (
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
          <svg
            className="w-8 h-8 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
            />
          </svg>
        </div>
      )}

      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>

      {message && (
        <p className="text-gray-600 mb-6 max-w-sm mx-auto">{message}</p>
      )}

      {action && (
        <button
          onClick={action.onClick}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}

/**
 * Empty cart state
 */
export function EmptyCart({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      title="Your cart is empty"
      message="Start adding products to see them here"
      icon={
        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full">
          <svg
            className="w-8 h-8 text-blue-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
            />
          </svg>
        </div>
      }
      action={
        onBrowse
          ? {
              label: 'Browse products',
              onClick: onBrowse,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty orders state
 */
export function EmptyOrders({ onBrowse }: { onBrowse?: () => void }) {
  return (
    <EmptyState
      title="No orders yet"
      message="You haven't placed any orders. Start shopping to see your order history here."
      icon={
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
            />
          </svg>
        </div>
      }
      action={
        onBrowse
          ? {
              label: 'Start shopping',
              onClick: onBrowse,
            }
          : undefined
      }
    />
  );
}

/**
 * Empty search results state
 */
export function EmptySearch({ query, onClear }: { query?: string; onClear?: () => void }) {
  return (
    <EmptyState
      title="No results found"
      message={
        query
          ? `We couldn't find any results for "${query}". Try adjusting your search.`
          : 'Try adjusting your filters or search terms.'
      }
      icon={
        <div className="inline-flex items-center justify-center w-16 h-16 bg-yellow-100 rounded-full">
          <svg
            className="w-8 h-8 text-yellow-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      }
      action={
        onClear
          ? {
              label: 'Clear filters',
              onClick: onClear,
            }
          : undefined
      }
    />
  );
}

/**
 * Inline empty state
 * Compact version for inline usage
 */
export function EmptyInline({ message }: { message: string }) {
  return (
    <div className="text-center py-8">
      <p className="text-gray-500 text-sm">{message}</p>
    </div>
  );
}
