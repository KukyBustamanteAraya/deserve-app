import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

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
  const supabase = createSupabaseServerClient();

  try {
    const { data: fabrics, error } = await supabase
      .from('fabrics')
      .select('*')
      .order('sort_order', { ascending: true });

    if (error) {
      console.error('Fabrics fetch error:', error);
      return NextResponse.json(
        { data: { items: [] }, error: 'Failed to fetch fabrics' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { data: { items: fabrics || [] } },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error: any) {
    console.error('Unexpected error fetching fabrics:', error);
    return NextResponse.json(
      { data: { items: [] }, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
