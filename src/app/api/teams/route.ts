// POST /api/teams - Create a new team
import { NextRequest } from 'next/server';
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { CreateTeamRequest, CreateTeamResponse } from '@/types/user';
import { logger } from '@/lib/logger';
import { apiSuccess, apiError, apiUnauthorized, apiValidationError } from '@/lib/api-response';
export async function POST(request: NextRequest) {
  try {
    const supabase = createSupabaseServer();

    // Require authentication
    const user = await requireAuth(supabase);

    // Parse request body
    const body: CreateTeamRequest = await request.json();
    const { name, sport_slug } = body;

    // Validate inputs
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return apiValidationError('Team name is required');
    }

    if (!sport_slug || typeof sport_slug !== 'string') {
      return apiValidationError('Sport slug is required');
    }

    // Check if user is already in a team
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('team_id, display_name, role')
      .eq('id', user.id)
      .single();

    if (userProfile?.team_id) {
      return apiValidationError('You are already in a team. Leave your current team first.');
    }

    // Verify sport exists
    const { data: sport, error: sportError } = await supabase
      .from('sports')
      .select('id, name')
      .eq('slug', sport_slug)
      .single();

    if (sportError || !sport) {
      return apiValidationError('Invalid sport selected');
    }

    // Generate team slug
    const teamSlug = name.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '-')
      .trim() + '-' + Date.now();

    // Create team
    const { data: newTeam, error: teamError } = await supabase
      .from('teams')
      .insert({
        name: name.trim(),
        slug: teamSlug,
        sport_id: sport.id,
        created_by: user.id
      })
      .select('*')
      .single();

    if (teamError) {
      logger.error('Error creating team:', teamError);
      return apiError('Failed to create team', 500);
    }

    // Generate invite code
    const { data: inviteCode } = await supabase
      .rpc('gen_invite_code');

    // Create initial invite
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 14); // 14 days from now

    const { data: newInvite, error: inviteError } = await supabase
      .from('teams_invites')
      .insert({
        team_id: newTeam.id,
        code: inviteCode,
        created_by: user.id,
        max_uses: 100,
        expires_at: expiresAt.toISOString()
      })
      .select('*')
      .single();

    if (inviteError) {
      logger.error('Error creating invite:', inviteError);
      // Team was created but invite failed - still return success
    }

    // Update user's team_id
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ team_id: newTeam.id })
      .eq('id', user.id);

    if (profileError) {
      logger.error('Error updating user profile:', profileError);
    }

    // Prepare response with team details
    const teamWithDetails = {
      id: newTeam.id,
      name: newTeam.name,
      slug: newTeam.slug,
      sport_id: newTeam.sport_id,
      sport_name: sport.name,
      sport_slug: sport_slug,
      created_by: newTeam.created_by,
      member_count: 1,
      members: [{
        id: user.id,
        email: user.email,
        display_name: userProfile?.display_name || null,
        role: userProfile?.role || 'customer'
      }],
      created_at: newTeam.created_at,
      updated_at: newTeam.updated_at
    };

    return apiSuccess({
      team: teamWithDetails,
      invite: newInvite || {
        id: '',
        team_id: newTeam.id,
        code: inviteCode || '',
        created_by: user.id,
        max_uses: 100,
        uses: 0,
        expires_at: expiresAt.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    } as CreateTeamResponse, 'Team created successfully');

  } catch (error) {
    if (error instanceof Error && error.message === 'Authentication required') {
      return apiUnauthorized();
    }

    logger.error('Unexpected error in team creation:', error);
    return apiError('Internal server error');
  }
}