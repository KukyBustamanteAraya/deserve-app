// Admin authentication helpers
import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import type { UserProfile } from '@/types/user';

export class AdminRequiredError extends Error {
  constructor(message = 'Admin privileges required') {
    super(message);
    this.name = 'AdminRequiredError';
  }
}

export class UserNotFoundError extends Error {
  constructor(message = 'User profile not found') {
    super(message);
    this.name = 'UserNotFoundError';
  }
}

/**
 * Require admin authentication for server components/route handlers
 * Throws AdminRequiredError if user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<{ user: any; profile: UserProfile }> {
  const supabase = await createSupabaseServer();

  // First require basic authentication
  const user = await requireAuth(supabase);

  // Get user profile to check role
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    throw new UserNotFoundError('User profile not found');
  }

  // Check is_admin field (boolean) instead of role
  if (!profile.is_admin) {
    throw new AdminRequiredError('Admin privileges required');
  }

  return { user, profile };
}

/**
 * Check if current user is admin (non-throwing version)
 * Returns null if not authenticated or not admin
 */
export async function isAdmin(): Promise<{ user: any; profile: UserProfile } | null> {
  try {
    return await requireAdmin();
  } catch {
    return null;
  }
}

/**
 * Check if a specific user ID is admin
 */
export async function isUserAdmin(userId: string): Promise<boolean> {
  const supabase = await createSupabaseServer();

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', userId)
      .single();

    return !error && profile?.is_admin === true;
  } catch {
    return false;
  }
}

/**
 * Get user profile by ID (admin only)
 */
export async function getUserProfile(userId: string): Promise<UserProfile> {
  // Require admin to access other user profiles
  await requireAdmin();

  const supabase = await createSupabaseServer();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !profile) {
    throw new UserNotFoundError(`User profile not found for ID: ${userId}`);
  }

  return profile;
}

/**
 * List all users (admin only)
 */
export async function listUsers(limit = 50, offset = 0): Promise<UserProfile[]> {
  // Require admin to list users
  await requireAdmin();

  const supabase = await createSupabaseServer();

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    throw new Error(`Failed to list users: ${error.message}`);
  }

  return profiles || [];
}

/**
 * Server action to set user role (admin only)
 */
export async function setUserRole(userId: string, role: 'customer' | 'admin'): Promise<void> {
  const supabase = await createSupabaseServer();

  // This will use the admin RPC which includes its own permission checks
  const { data: result, error } = await supabase
    .rpc('admin_set_user_role', {
      target_user_id: userId,
      new_role: role
    });

  if (error) {
    throw new Error(`Failed to set user role: ${error.message}`);
  }

  if (result && !result.success) {
    throw new Error(result.error || 'Failed to set user role');
  }
}