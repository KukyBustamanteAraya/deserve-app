// Bundles API - GET all bundles
import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function GET() {
  const supabase = await createSupabaseServer();

  const { data: bundles, error } = await supabase
    .from('bundles')
    .select('*')
    .order('code');

  if (error) {
    logger.error('Error fetching bundles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bundles' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { items: bundles || [] } },
    { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
