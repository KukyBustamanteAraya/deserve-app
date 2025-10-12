// Check if authenticated user is team captain (creator)
import { createSupabaseServer } from '@/lib/supabase/server-client';

export async function isTeamCaptain(teamId: string, userId?: string): Promise<boolean> {
  const supabase = createSupabaseServer();

  // Get current user if not provided
  let currentUserId = userId;
  if (!currentUserId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;
    currentUserId = user.id;
  }

  // Check if user is team creator
  const { data: team, error } = await supabase
    .from('teams')
    .select('created_by')
    .eq('id', teamId)
    .single();

  if (error || !team) return false;

  return team.created_by === currentUserId;
}

export async function requireTeamCaptain(teamId: string, userId?: string): Promise<void> {
  const isCaptain = await isTeamCaptain(teamId, userId);
  if (!isCaptain) {
    throw new Error('Unauthorized: Only team captain can perform this action');
  }
}
