import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';

export async function GET() {
  const supabase = createSupabaseServer();

  const { data: sports, error } = await supabase
    .from('sports')
    .select('id, name, slug')
    .order('name');

  if (error) {
    logger.error('Error fetching sports:', error);
    return NextResponse.json(
      { error: 'Failed to fetch sports' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { data: { items: sports || [] } },
    { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
  );
}
