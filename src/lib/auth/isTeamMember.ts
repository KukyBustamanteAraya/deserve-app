// Check if authenticated user is team member or captain
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function isTeamMember(teamId: string, userId?: string): Promise<boolean> {
  const supabase = await createSupabaseServer();

  // Get current user if not provided
  let currentUserId = userId;
  if (!currentUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    currentUserId = user.id;
  }

  // Check if user is team creator (captain)
  const { data: team } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', teamId)
    .single();

  if (team?.created_by === currentUserId) return true;

  // Check if user is in team_members
  const { data: membership } = await supabase
    .from('team_members')
    .select('id')
    .eq('team_id', teamId)
    .eq('user_id', currentUserId)
    .single();

  return !!membership;
}

export async function requireTeamMember(teamId: string, userId?: string): Promise<void> {
  const isMember = await isTeamMember(teamId, userId);
  if (!isMember) {
    throw new Error('Unauthorized: Only team members can access this resource');
  }
}
