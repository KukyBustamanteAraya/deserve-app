// Fabric recommendations API
import { NextRequest, NextResponse } from 'next/server';
import { getFabricRecommendations } from '@/lib/catalog/fabrics';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const productType = searchParams.get('type');
  const sport = searchParams.get('sport');

  if (!productType) {
    return NextResponse.json(
      { error: 'Product type is required' },
      { status: 400 }
    );
  }

  try {
    const recommendations = await getFabricRecommendations(productType, sport);
    return NextResponse.json(
      { data: { items: recommendations } },
      { status: 200, headers: { 'Cache-Control': 'public, max-age=3600' } }
    );
  } catch (error) {
    logger.error('Error fetching fabric recommendations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommendations' },
      { status: 500 }
    );
  }
}
