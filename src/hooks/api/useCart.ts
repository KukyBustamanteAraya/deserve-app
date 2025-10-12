'use client';

// SWR hooks for shopping cart
import useSWR from 'swr';
import { useSWRConfig } from 'swr';
import { postFetcher, deleteFetcher } from '@/lib/swr/fetcher';
import type { CartResponse } from '@/types/orders';

interface UseCartReturn {
  cart: CartResponse | undefined;
  isLoading: boolean;
  error: Error | undefined;
  addItem: (productId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  mutate: () => void;
}

/**
 * Fetch and manage shopping cart
 * Includes optimistic updates for better UX
 */
export function useCart(): UseCartReturn {
  const { mutate: globalMutate } = useSWRConfig();
  const { data, error, isLoading, mutate } = useSWR<CartResponse>('/api/cart');

  /**
   * Add item to cart with optimistic update
   */
  const addItem = async (productId: string, quantity: number) => {
    // Optimistic update - show result immediately
    await mutate(
      async (currentCart) => {
        const result = await postFetcher<CartResponse>('/api/cart/items', {
          productId,
          quantity,
        });
        return result;
      },
      {
        optimisticData: data, // Keep current data while loading
        rollbackOnError: true, // Rollback on error
        populateCache: true, // Update cache with result
        revalidate: false, // Don't revalidate immediately
      }
    );
  };

  /**
   * Remove item from cart with optimistic update
   */
  const removeItem = async (itemId: string) => {
    await mutate(
      async (currentCart) => {
        await deleteFetcher(`/api/cart/items/${itemId}`);
        // Refetch cart after deletion
        const response = await fetch('/api/cart');
        return response.json();
      },
      {
        optimisticData: data,
        rollbackOnError: true,
        populateCache: true,
        revalidate: false,
      }
    );
  };

  return {
    cart: data,
    isLoading,
    error,
    addItem,
    removeItem,
    mutate,
  };
}
