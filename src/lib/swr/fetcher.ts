// SWR fetcher utilities for API requests
import { logger } from '@/lib/logger';
import type { ApiResponse } from '@/types/api';

/**
 * Standard fetcher for SWR
 * Automatically handles authentication, error responses, and type safety
 */
export async function fetcher<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include', // Include cookies for authentication
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));

    logger.error(`API Error [${response.status}]:`, error);

    // Create error with additional context
    const apiError = new Error(error.error || error.message || 'API request failed');
    (apiError as any).status = response.status;
    (apiError as any).info = error;

    throw apiError;
  }

  const data: ApiResponse<T> = await response.json();

  // Handle standardized API response format
  if ('success' in data) {
    if (data.success && data.data !== undefined) {
      return data.data;
    }
    if (!data.success && data.error) {
      throw new Error(data.error);
    }
  }

  // Fallback for non-standard responses
  return data as unknown as T;
}

/**
 * Fetcher with custom options
 */
export async function fetcherWithOptions<T>(
  url: string,
  options: RequestInit = {}
): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: `HTTP ${response.status}: ${response.statusText}`,
    }));

    logger.error(`API Error [${response.status}]:`, error);

    const apiError = new Error(error.error || error.message || 'API request failed');
    (apiError as any).status = response.status;
    (apiError as any).info = error;

    throw apiError;
  }

  const data: ApiResponse<T> = await response.json();

  if ('success' in data && data.success && data.data !== undefined) {
    return data.data;
  }

  return data as unknown as T;
}

/**
 * POST fetcher for mutations
 */
export async function postFetcher<T, D = any>(
  url: string,
  data: D
): Promise<T> {
  return fetcherWithOptions<T>(url, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * PUT fetcher for updates
 */
export async function putFetcher<T, D = any>(
  url: string,
  data: D
): Promise<T> {
  return fetcherWithOptions<T>(url, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

/**
 * DELETE fetcher
 */
export async function deleteFetcher<T>(url: string): Promise<T> {
  return fetcherWithOptions<T>(url, {
    method: 'DELETE',
  });
}

/**
 * Build query string from params
 */
export function buildQueryString(params: Record<string, any>): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  });

  const queryString = searchParams.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetcher with query params
 */
export async function fetcherWithParams<T>(
  url: string,
  params: Record<string, any>
): Promise<T> {
  const queryString = buildQueryString(params);
  return fetcher<T>(`${url}${queryString}`);
}
