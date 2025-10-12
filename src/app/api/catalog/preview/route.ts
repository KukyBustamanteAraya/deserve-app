// src/app/api/catalog/preview/route.ts
// Shim endpoint - uses queryProducts helper (no DB view dependency)
import { NextRequest, NextResponse } from 'next/server';
import { queryProducts } from '@/lib/catalog/queryProducts';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sport = searchParams.get('sport');
    const limit = Number(searchParams.get('limit') || 8);

    const result = await queryProducts({ sport, limit });

    return NextResponse.json(
      { data: result },
      {
        status: 200,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  } catch (error: any) {
    logger.error('preview api error:', error);
    return NextResponse.json(
      {
        data: { items: [], total: 0, nextCursor: null },
        error: 'Failed to load preview'
      },
      {
        status: 500,
        headers: { 'Cache-Control': 'no-store' }
      }
    );
  }
}

// Optional: Handle other HTTP methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}