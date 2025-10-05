// Server Component
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import DashboardClient from './DashboardClient';

export default async function DashboardPage() {
  const supabase = createSupabaseServer();

  // Get user on server side
  const { data: { user }, error } = await supabase.auth.getUser();

  // Redirect if not authenticated
  if (error || !user) {
    redirect('/login');
  }

  // Get user profile with display_name
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  // Pass user data and profile to client component
  return <DashboardClient user={user} profile={profile} />;
}

export const metadata = {
  title: 'Dashboard | Deserve',
  description: 'Your personal dashboard for managing your account and orders.',
};