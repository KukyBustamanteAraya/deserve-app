'use client';

// SWR hooks for orders
import useSWR from 'swr';
import { buildQueryString } from '@/lib/swr/fetcher';
import type { OrdersListResponse } from '@/types/orders';

interface UseOrdersOptions {
  page?: number;
  limit?: number;
}

interface UseOrdersReturn {
  orders: OrdersListResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  mutate: () => void;
}

/**
 * Fetch user's orders with pagination
 */
export function useOrders(options: UseOrdersOptions = {}): UseOrdersReturn {
  const { page = 1, limit = 10 } = options;

  const params = { page, limit };
  const queryString = buildQueryString(params);

  const { data, error, isLoading, mutate } = useSWR<OrdersListResponse>(
    `/api/orders${queryString}`
  );

  return {
    orders: data,
    isLoading,
    error,
    mutate,
  };
}

/**
 * Fetch a single order by ID
 */
export function useOrder(orderId: string | null) {
  const { data, error, isLoading, mutate } = useSWR(
    orderId ? `/api/orders/${orderId}` : null
  );

  return {
    order: data,
    isLoading,
    error,
    mutate,
  };
}
