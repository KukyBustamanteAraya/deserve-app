'use client';

import { useAuth } from '@/app/components/AuthProvider';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { getMyProfile, updateMyProfile } from '@/lib/db/profiles';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  has_password: boolean;
}

export default function AccountSettingsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [redirecting, setRedirecting] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [updating, setUpdating] = useState(false);
  const [emailUpdating, setEmailUpdating] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Email update state banners
  const emailUpdateSent = searchParams?.get('emailUpdateSent') === '1';
  const emailUpdated = searchParams?.get('emailUpdated') === '1';
  const emailUpdateError = searchParams?.get('emailUpdateError');

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !user && !redirecting) {
      setRedirecting(true);
      router.replace('/login');
    }
  }, [loading, user, router, redirecting]);

  // Load profile data
  useEffect(() => {
    async function loadProfile() {
      if (!user) return;

      try {
        const { user: authUser, profile: profileData, error } = await getMyProfile();
        if (error) {
          console.error('Failed to load profile:', error);
          setErrorMsg('Failed to load profile data');
        } else if (profileData) {
          setProfile(profileData);
          setFullName(profileData.full_name || '');
          setEmail(profileData.email || '');
        }
      } catch (err) {
        console.error('Unexpected error loading profile:', err);
        setErrorMsg('Failed to load profile data');
      } finally {
        setProfileLoading(false);
      }
    }

    if (user) {
      loadProfile();
    }
  }, [user]);

  async function handleUpdateName(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || updating) return;

    setUpdating(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const { data, error } = await updateMyProfile({ full_name: fullName.trim() });
      if (error) {
        setErrorMsg('Failed to update name');
      } else {
        setProfile(prev => prev ? { ...prev, full_name: fullName.trim() || null } : null);
        setSuccessMsg('Name updated successfully');
      }
    } catch (err) {
      setErrorMsg('Failed to update name');
    } finally {
      setUpdating(false);
    }
  }

  async function handleUpdateEmail(e: React.FormEvent) {
    e.preventDefault();
    if (!profile || emailUpdating) return;

    setEmailUpdating(true);

    const form = new FormData();
    form.append('email', email.trim());

    try {
      const response = await fetch('/settings/account/email', {
        method: 'POST',
        body: form,
      });

      // The endpoint redirects, so if we get here it means there was an error
      // But our endpoint always redirects with neutral messaging for security
      if (!response.ok) {
        console.error('Email update failed:', response.status);
      }

      // The page will reload due to redirect, but just in case:
      window.location.reload();
    } catch (err) {
      console.error('Email update error:', err);
      window.location.reload();
    } finally {
      setEmailUpdating(false);
    }
  }

  // Show loading state
  if (loading || redirecting || profileLoading) {
    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Don't render if no user (prevents flash before redirect)
  if (!user || !profile) {
    return null;
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center mb-8">
          <button
            onClick={() => router.back()}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            ← Back
          </button>
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

          <form onSubmit={handleUpdateName} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Enter your full name"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  type="submit"
                  disabled={updating || fullName.trim() === (profile.full_name || '')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updating ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          </form>

          <form onSubmit={handleUpdateEmail} className="mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex gap-3">
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <button
                  type="submit"
                  disabled={emailUpdating || email.trim() === profile.email}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {emailUpdating ? 'Sending...' : 'Change Email'}
                </button>
              </div>
            </div>
          </form>

          {successMsg && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
              {successMsg}
            </div>
          )}

          {errorMsg && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {errorMsg}
            </div>
          )}
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
                  onClick={() => setErrorMsg('Password changes not yet implemented')}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Change Password
                </button>
              </div>
            ) : (
              <div>
                <p className="text-sm text-gray-600 mb-3">
                  You currently sign in using magic links only. Setting a password will allow you to sign in faster.
                </p>
                <button
                  onClick={() => router.push('/onboarding/set-password?next=/settings/account')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Set Password
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}