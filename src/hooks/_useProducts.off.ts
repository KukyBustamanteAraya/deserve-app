import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { supabaseClient } from '../lib/supabaseClient';

interface Product {
  id: number;
  name: string;
  price: string;
  sport: string;
  category: string;
  image_url: string;
  image_filename: string;
  created_at: string;
}

// Fetcher function for SWR
async function fetchProducts(key: string, sport?: string, limit?: number): Promise<Product[]> {
  let query = supabaseClient
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (sport) {
    query = query.eq('sport', sport);
  }

  if (limit) {
    query = query.limit(limit);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data || [];
}

export function useProducts(sport?: string, limit?: number) {
  const cacheKey = ['products', sport, limit];

  const { data, error, isLoading } = useSWR(
    cacheKey,
    () => fetchProducts(cacheKey[0], sport, limit),
    {
      revalidateOnFocus: true,
      dedupingInterval: 1000 * 60 * 5, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    products: data || [],
    loading: isLoading,
    error: error?.message || null
  };
}

// Fetcher function for products by sport
async function fetchProductsBySport(): Promise<Record<string, Product[]>> {
  const sports = ['fútbol', 'básquetbol', 'voleibol', 'rugby', 'golf', 'equipo'];

  // Fetch all products in a single query instead of 6 separate queries
  const { data: allProducts, error } = await supabaseClient
    .from('products')
    .select('*')
    .in('sport', sports)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  // Group products by sport and limit to 4 per sport
  const results: Record<string, Product[]> = {};

  sports.forEach(sport => {
    results[sport] = (allProducts || [])
      .filter(product => product.sport === sport)
      .slice(0, 4);
  });

  return results;
}

export function useProductsBySport() {
  const { data, error, isLoading } = useSWR(
    'products-by-sport',
    fetchProductsBySport,
    {
      revalidateOnFocus: true,
      dedupingInterval: 1000 * 60 * 5, // 5 minutes
      errorRetryCount: 3,
      errorRetryInterval: 1000,
    }
  );

  return {
    productsBySport: data || {},
    loading: isLoading,
    error: error?.message || null
  };
}