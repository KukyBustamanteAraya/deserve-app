import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';
import DeleteAccountButton from './DeleteAccountButton';
import { logger } from '@/lib/logger';

export default async function AccountPage() {
  try {
    const supabase = createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get user profile
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching profile:', error);
      redirect('/dashboard?error=profile_not_found');
    }

    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Account Settings</h1>
            <p className="text-gray-600">
              Manage your profile information and preferences
            </p>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-xl font-semibold mb-6 text-gray-900">
              Profile Information
            </h2>

            <ProfileForm
              user={user}
              profile={profile}
            />

            <DeleteAccountButton user={user} />
          </div>
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Account page error:', error);
    redirect('/login?redirect=/dashboard/account');
  }
}

export const metadata = {
  title: 'Account Settings | Deserve',
  description: 'Manage your account settings and profile information.',
};