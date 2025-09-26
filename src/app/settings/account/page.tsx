import { redirect } from 'next/navigation';
import { getMyProfile } from '@/lib/db/profiles';
import { BackButton } from './BackButton';

interface SearchParams {
  emailUpdateSent?: string;
  emailUpdated?: string;
  emailUpdateError?: string;
}

interface Props {
  searchParams: SearchParams;
}

export default async function AccountSettingsPage({ searchParams }: Props) {
  // Load profile data on server
  const { user, profile, error } = await getMyProfile();

  if (!user) {
    redirect('/login?next=/settings/account');
  }

  if (error || !profile) {
    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="text-center py-20">
            <p className="text-red-600">Failed to load profile data</p>
          </div>
        </div>
      </main>
    );
  }

  // Email update state banners
  const emailUpdateSent = searchParams.emailUpdateSent === '1';
  const emailUpdated = searchParams.emailUpdated === '1';
  const emailUpdateError = searchParams.emailUpdateError;

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <BackButton />
          <h1 className="text-3xl font-bold text-gray-900">Account Settings</h1>
        </div>

        {/* Email Update Banners */}
        {emailUpdateSent && (
          <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-md text-blue-700 text-sm" aria-live="polite">
            Check your inbox to confirm your new email.
          </div>
        )}

        {emailUpdated && (
          <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm" aria-live="polite">
            Your email was updated.
          </div>
        )}

        {emailUpdateError === 'missing_token' && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm" aria-live="assertive">
            That link is missing required information. Request a new one.
          </div>
        )}

        {emailUpdateError === 'link_invalid_or_expired' && (
          <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm" aria-live="assertive">
            That link is invalid or expired. Request a new one.
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Profile Information</h2>

          <form action="/settings/account/name" method="post" className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  name="full_name"
                  defaultValue={profile.full_name || ''}
                  placeholder="Enter your full name"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Save
                </button>
              </div>
            </div>
          </form>

          <form action="/settings/account/email" method="post" className="mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  name="email"
                  defaultValue={profile.email || ''}
                  placeholder="Enter your email address"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Change Email
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Account Status */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Account Status</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">User ID:</span>
              <span className="font-mono text-gray-900">{profile.id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Password Set:</span>
              <span className={profile.has_password ? 'text-green-600' : 'text-amber-600'}>
                {profile.has_password ? 'Yes' : 'No (Magic Link Only)'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Member Since:</span>
              <span className="text-gray-900">
                {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Password Management */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-900">Password & Security</h2>
          <div className="space-y-4">
            {profile.has_password ? (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  You can sign in with either your password or magic links.
                </p>
                <button
                  disabled
                  className="px-4 py-2 border border-gray-300 text-gray-500 rounded-md cursor-not-allowed"
                >
                  Change Password (Coming Soon)
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  You currently sign in using magic links only. Setting a password will allow you to sign in faster.
                </p>
                <a
                  href="/onboarding/set-password?next=/settings/account"
                  className="inline-block px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Set Password
                </a>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}