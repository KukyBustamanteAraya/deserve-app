import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const productType = searchParams.get('product_type');

  if (!productType) {
    return NextResponse.json({ error: 'product_type is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('product_fabric_recommendations')
    .select('fabric_name')
    .eq('product_type_slug', productType);

  if (error) {
    logger.error('Error fetching fabric recommendations:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recommendations: data });
}
