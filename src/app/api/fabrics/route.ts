import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError } from '@/lib/api-response';

/**
 * GET /api/fabrics
 * Returns all available fabrics with pricing modifiers
 *
 * Response:
 * {
 *   fabrics: [
 *     {
 *       id: UUID,
 *       name: string,
 *       composition: string,
 *       gsm: number,
 *       description: string,
 *       use_case: string,
 *       price_modifier_cents: number,
 *       video_url: string | null,
 *       sort_order: number
 *     }
 *   ]
 * }
 */
export async function GET() {
  const supabase = createSupabaseServer();

  try {
    const { data: fabrics, error } = await supabase
      .from('fabrics')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      logger.error('Fabrics fetch error:', error);
      return apiError('Failed to fetch fabrics', 500);
    }

    const response = apiSuccess({ items: fabrics || [] });

    // Add cache headers
    response.headers.set('Cache-Control', 'public, max-age=3600');

    return response;
  } catch (error: any) {
    logger.error('Unexpected error fetching fabrics:', error);
    return apiError('Internal server error');
  }
}
