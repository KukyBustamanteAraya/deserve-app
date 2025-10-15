'use client';

import { useEffect } from 'react';
import { ErrorPage } from '@/components/ui/ErrorBoundary';
import { logger } from '@/lib/logger';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to our logging service
    logger.error('Catalog page error:', { error, digest: error.digest });
  }, [error]);

  return (
    <ErrorPage
      error={error}
      onReset={reset}
      title="Error loading catalog"
    />
  );
}
