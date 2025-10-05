// GET /api/catalog/sports - Returns all sports
import { NextResponse } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { Sport } from '@/types/catalog';
import type { ApiResponse } from '@/types/api';
export const revalidate = 60; // Cache for 1 minute

export async function GET() {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    await requireAuth(supabase);

    // Fetch sports with optimized query
    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name, created_at')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching sports:', error);
      return NextResponse.json(
        {
          error: 'Failed to fetch sports',
          message: error.message,
        } as ApiResponse<null>,
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        data: sports as Sport[],
        message: `Found ${sports?.length || 0} sports`,
      } as ApiResponse<Sport[]>,
      {
        status: 200,
        headers: {
          'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
        },
      }
    );

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return NextResponse.json(
        {
          error: 'Authentication required',
          message: 'You must be logged in to access sports data',
        } as ApiResponse<null>,
        { status: 401 }
      );
    }

    console.error('Unexpected error in sports endpoint:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: 'An unexpected error occurred while fetching sports',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// Explicitly disable other methods
export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'POST is not supported on this endpoint' },
    { status: 405 }
  );
}

export async function PUT() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'PUT is not supported on this endpoint' },
    { status: 405 }
  );
}

export async function DELETE() {
  return NextResponse.json(
    { error: 'Method not allowed', message: 'DELETE is not supported on this endpoint' },
    { status: 405 }
  );
}