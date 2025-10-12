// GET /api/catalog/sports - Returns all sports
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { Sport } from '@/types/catalog';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized } from '@/lib/api-response';
export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Fetch sports with optimized query (no auth required for public data)
    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching sports:', error);
      return apiError('Failed to fetch sports', 500);
    }

    const response = apiSuccess(
      sports as Sport[],
      `Found ${sports?.length || 0} sports`
    );

    // Add cache headers
    response.headers.set('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=120');

    return response;

  } catch (error) {
    logger.error('Unexpected error in sports endpoint:', error);
    return apiError('An unexpected error occurred while fetching sports');
  }
}

// Explicitly disable other methods
export async function POST() {
  return apiError('Method not allowed', 405);
}

export async function PUT() {
  return apiError('Method not allowed', 405);
}

export async function DELETE() {
  return apiError('Method not allowed', 405);
}