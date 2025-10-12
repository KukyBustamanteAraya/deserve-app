'use client';

// SWR hook for design requests
import useSWR from 'swr';
import { swrRealtimeConfig } from '@/lib/swr/config';
import { buildQueryString } from '@/lib/swr/fetcher';

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  product_slug: string;
  sport_slug: string;
  created_at: string;
  output_url?: string;
  mockup_urls?: string[];
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  order_id?: string;
  user_type?: string; // 'player' or 'manager'
  approval_status?: string;
}

interface UseDesignRequestsOptions {
  teamId?: string | null;
  status?: string;
  userId?: string;
}

interface UseDesignRequestsReturn {
  designRequests: DesignRequest[] | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch design requests with optional filters
 * Revalidates frequently for real-time updates (especially for rendering status)
 */
export function useDesignRequests(
  options: UseDesignRequestsOptions = {}
): UseDesignRequestsReturn {
  const { teamId, status, userId } = options;

  // Build query parameters
  const params: Record<string, any> = {};
  if (teamId) params.team_id = teamId;
  if (status) params.status = status;
  if (userId) params.user_id = userId;

  const queryString = buildQueryString(params);
  const shouldFetch = teamId !== null;

  const { data, error, isLoading, mutate } = useSWR<DesignRequest[]>(
    shouldFetch ? `/api/design-requests${queryString}` : null,
    swrRealtimeConfig
  );

  return {
    designRequests: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch a single design request by ID
 */
export function useDesignRequest(requestId: string | null) {
  const { data, error, isLoading, mutate } = useSWR<DesignRequest>(
    requestId ? `/api/design-requests/${requestId}` : null
  );

  return {
    designRequest: data,
    isLoading,
    error,
    mutate,
  };
}
