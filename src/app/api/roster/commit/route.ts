// Roster commit API - validates and inserts roster members
import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { RosterMemberSchema, type RosterCommitResult } from '@/types/roster';
import { logger } from '@/lib/logger';

export async function POST(request: NextRequest) {
  const supabase = createSupabaseServer();
  
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  try {
    const { teamId, members } = await request.json();

    if (!teamId || !members || !Array.isArray(members)) {
      return NextResponse.json(
        { error: 'teamId and members array are required' },
        { status: 400 }
      );
    }

    // Verify user is team captain
    const { data: team } = await supabase
      .from('teams')
      .select('created_by')
      .eq('id', teamId)
      .single();

    if (!team || team.created_by !== user.id) {
      return NextResponse.json(
        { error: 'Only team captain can commit roster' },
        { status: 403 }
      );
    }

    const result: RosterCommitResult = {
      inserted: 0,
      skipped: 0,
      errors: []
    };

    // Validate and insert each member
    for (let i = 0; i < members.length; i++) {
      const member = members[i];
      try {
        const validated = RosterMemberSchema.parse(member);

        const { error: insertError } = await supabase
          .from('roster_members')
          .insert({
            team_id: teamId,
            full_name: validated.full_name,
            email: validated.email || null,
            phone: validated.phone || null,
            size: validated.size || null,
            number: validated.number || null
          });

        if (insertError) {
          result.errors.push({
            line: i + 1,
            message: `Failed to insert ${validated.full_name}: ${insertError.message}`
          });
          result.skipped++;
        } else {
          result.inserted++;
        }
      } catch (validationError) {
        result.errors.push({
          line: i + 1,
          message: 'Validation failed for member'
        });
        result.skipped++;
      }
    }

    return NextResponse.json({ data: result });
  } catch (error) {
    logger.error('Roster commit error:', error);
    return NextResponse.json(
      { error: 'Failed to commit roster' },
      { status: 500 }
    );
  }
}
