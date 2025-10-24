// Server Component
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';
import { logger } from '@/lib/logger';

export default async function DashboardPage() {
  const supabase = await createSupabaseServer();

  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (error || !user) {
    redirect('/login');
  }

  // Get user profile with full_name
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Debug: Log profile to check is_admin field
  logger.debug('Dashboard - User profile:', {
    id: profile?.id,
    email: profile?.email,
    is_admin: profile?.is_admin,
    role: profile?.role,
    full_name: profile?.full_name
  });

  if (profileError) {
    logger.error('Dashboard - Profile fetch error:', profileError);
  }

  // Pass user data and profile to client component
  return <DashboardClient user={user} profile={profile} />;
}

export const metadata = {
  title: 'Configuración | Deserve',
  description: 'Manage your account settings, profile, and preferences.',
};