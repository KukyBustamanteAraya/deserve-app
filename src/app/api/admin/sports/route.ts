import { NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { requireAdmin } from '@/lib/auth/requireAdmin';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

export async function GET() {
  try {
    await requireAdmin();
    const supabase = await createSupabaseServer();

    const { data: sports, error } = await supabase
      .from('sports')
      .select('id, slug, name')
      .order('name', { ascending: true });

    if (error) {
      logger.error('Error fetching sports:', toError(error));
      return NextResponse.json(
        { error: 'Failed to fetch sports' },
        { status: 500 }
      );
    }

    return NextResponse.json({ sports });
  } catch (error) {
    logger.error('Admin sports GET error:', toError(error));
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }
}