import { createSupabaseServer, requireAuth } from '@/lib/supabase/server-client';
import { redirect } from 'next/navigation';
import ProfileForm from './ProfileForm';
import DeleteAccountButton from './DeleteAccountButton';
import EnhancedProfileSection from './EnhancedProfileSection';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { EnhancedProfile } from '@/types/profile';

export default async function AccountPage() {
  try {
    const supabase = await createSupabaseServer();
    const user = await requireAuth(supabase);

    // Get user profile with enhanced fields
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      logger.error('Error fetching profile:', toError(error));
      redirect('/dashboard?error=profile_not_found');
    }

    // Cast to EnhancedProfile type
    const enhancedProfile = profile as EnhancedProfile;

    return (
      <main className="min-h-screen p-6 bg-gradient-to-br from-gray-900 via-black to-gray-900">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Account Settings</h1>
            <p className="text-gray-300">
              Manage your profile information and preferences
            </p>
          </div>

          {/* Basic Profile Information */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6 mb-8">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold mb-6 text-white relative">
              Basic Information
            </h2>

            <ProfileForm
              user={user}
              profile={profile}
            />

            <DeleteAccountButton user={user} />
          </div>

          {/* Enhanced Profile Sections */}
          <EnhancedProfileSection initialProfile={enhancedProfile} />
        </div>
      </main>
    );

  } catch (error) {
    logger.error('Account page error:', toError(error));
    redirect('/login?redirect=/dashboard/account');
  }
}

export const metadata = {
  title: 'Account Settings | Deserve',
  description: 'Manage your account settings and profile information.',
};