import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = createSupabaseServerClient();

  const { data: sports, error } = await supabase
    .from('sports')
    .select('id, name, slug')
    .order('name');

  if (error) {
    console.error('Error fetching sports:', error);
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
