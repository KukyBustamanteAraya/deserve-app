// Bundles API - GET all bundles
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: bundles, error } = await supabase
    .from('bundles')
    .select('*')
    .order('code');

  if (error) {
    console.error('Error fetching bundles:', error);
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
