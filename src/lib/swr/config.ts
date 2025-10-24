// Global SWR configuration
import type { SWRConfiguration } from 'swr';
import { fetcher } from './fetcher';
import { logger } from '@/lib/logger';

/**
 * Global SWR configuration
 * Applied to all useSWR hooks unless overridden
 */
export const swrConfig: SWRConfiguration = {
  // Default fetcher
  fetcher,

  // Revalidation settings
  revalidateOnFocus: true, // Revalidate when window regains focus
  revalidateOnReconnect: true, // Revalidate when network reconnects
  revalidateIfStale: true, // Revalidate if data is stale
  dedupingInterval: 2000, // Dedupe requests within 2 seconds

  // Retry settings
  shouldRetryOnError: true,
  errorRetryCount: 3,
  errorRetryInterval: 5000, // Wait 5s between retries

  // Cache settings
  focusThrottleInterval: 5000, // Throttle focus revalidation to 5s

  // Loading delay (prevents flash of loading state)
  loadingTimeout: 3000,

  // Global error handler
  onError: (error, key) => {
    // Don't log 404s as errors (expected for some queries)
    if ((error as any)?.status === 404) {
      logger.debug(`SWR: Resource not found [${key}]`);
      return;
    }

    // Log other errors
    logger.error(`SWR Error [${key}]:`, {
      message: error.message,
      status: (error as any)?.status,
      info: (error as any)?.info,
    });
  },

  // Global success handler
  onSuccess: (data, key, config) => {
    logger.debug(`SWR: Data loaded [${key}]`, {
      hasData: !!data,
    });
  },
};

/**
 * Configuration for immutable data (rarely changes)
 * Use for reference data like sports, fabrics, etc.
 */
export const swrImmutableConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateOnFocus: false,
  revalidateOnReconnect: false,
  revalidateIfStale: false,
  dedupingInterval: 60000, // 1 minute
};

/**
 * Configuration for frequently changing data
 * Use for dashboards, real-time data, etc.
 */
export const swrRealtimeConfig: SWRConfiguration = {
  ...swrConfig,
  refreshInterval: 30000, // Refresh every 30s
  revalidateOnFocus: true,
  dedupingInterval: 1000, // 1 second
};

/**
 * Configuration for paginated data
 */
export const swrPaginatedConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateIfStale: false, // Don't revalidate if data is stale
  // Note: persistSize removed - no longer supported in current SWR version
};

/**
 * Configuration for infinite loading
 */
export const swrInfiniteConfig: SWRConfiguration = {
  ...swrConfig,
  revalidateIfStale: true,
  // Note: revalidateAll removed - no longer supported in current SWR version
};
