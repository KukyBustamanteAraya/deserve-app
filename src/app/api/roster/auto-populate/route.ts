import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';
import { autoPopulateRoster } from '@/lib/roster/auto-populate';

const AutoPopulateSchema = z.object({
  sub_team_id: z.string().uuid(),
  estimated_size: z.number().int().min(1).max(200),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Validate request body
    const body = await request.json();
    const validatedData = AutoPopulateSchema.parse(body);

    logger.info('[AutoPopulate API] Received request:', {
      subTeamId: validatedData.sub_team_id,
      estimatedSize: validatedData.estimated_size,
      userId: user.id,
    });

    // Call auto-populate utility
    const result = await autoPopulateRoster(
      supabase,
      validatedData.sub_team_id,
      validatedData.estimated_size,
      user.id
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to auto-populate roster' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: result.count,
      message: `Successfully created ${result.count} placeholder player(s)`,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid input', details: error.issues },
        { status: 400 }
      );
    }

    logger.error('[AutoPopulate API] Unexpected error:', toError(error));
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
