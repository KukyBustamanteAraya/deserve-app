'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { EnhancedProfile, UserType, AthleticProfile, ManagerProfile, UserPreferences } from '@/types/profile';
import RoleSelector from '@/components/profile/RoleSelector';
import AthleticProfileForm from '@/components/profile/AthleticProfileForm';
import ManagerProfileForm from '@/components/profile/ManagerProfileForm';
import PreferencesForm from '@/components/profile/PreferencesForm';

interface EnhancedProfileSectionProps {
  initialProfile: EnhancedProfile;
}

export default function EnhancedProfileSection({ initialProfile }: EnhancedProfileSectionProps) {
  const router = useRouter();
  const [profile, setProfile] = useState<EnhancedProfile>(initialProfile);
  const [loading, setLoading] = useState(false);

  // Handler for user type selection
  const handleRoleSelect = async (role: UserType) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile/user-type', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_type: role }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update user type');
      }

      const result = await response.json();

      // Update local state
      setProfile(prev => ({ ...prev, user_type: result.data.user_type }));

      // Refresh the page data
      router.refresh();
    } catch (error) {
      console.error('Error updating user type:', error);
      throw error; // Re-throw to let RoleSelector handle the error
    } finally {
      setLoading(false);
    }
  };

  // Handler for athletic profile save
  const handleAthleticSave = async (data: Partial<AthleticProfile>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile/athletic', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update athletic profile');
      }

      const result = await response.json();

      // Update local state
      setProfile(prev => ({
        ...prev,
        athletic_profile: { ...prev.athletic_profile, ...data },
      }));

      router.refresh();
    } catch (error) {
      console.error('Error updating athletic profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handler for manager profile save
  const handleManagerSave = async (data: Partial<ManagerProfile>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile/manager', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update manager profile');
      }

      const result = await response.json();

      // Update local state
      setProfile(prev => ({
        ...prev,
        manager_profile: { ...prev.manager_profile, ...data },
      }));

      router.refresh();
    } catch (error) {
      console.error('Error updating manager profile:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Handler for preferences save
  const handlePreferencesSave = async (data: Partial<UserPreferences>) => {
    setLoading(true);
    try {
      const response = await fetch('/api/profile/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update preferences');
      }

      const result = await response.json();

      // Update local state
      setProfile(prev => ({
        ...prev,
        preferences: { ...prev.preferences, ...data },
      }));

      router.refresh();
    } catch (error) {
      console.error('Error updating preferences:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Determine if user should see athletic profile form
  const showAthleticProfile = profile.user_type === 'player' || profile.user_type === 'hybrid';

  // Determine if user should see manager profile form
  const showManagerProfile =
    profile.user_type === 'manager' ||
    profile.user_type === 'athletic_director' ||
    profile.user_type === 'hybrid';

  return (
    <div className="space-y-8">
      {/* Role Selection Section */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <RoleSelector
          currentRole={profile.user_type || null}
          onRoleSelect={handleRoleSelect}
          disabled={loading}
        />
      </div>

      {/* Athletic Profile Section - Only show for players and hybrid */}
      {showAthleticProfile && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <AthleticProfileForm
            initialData={profile.athletic_profile || {}}
            onSave={handleAthleticSave}
            disabled={loading}
          />
        </div>
      )}

      {/* Manager Profile Section - Only show for managers, athletic directors, and hybrid */}
      {showManagerProfile && (
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6">
          <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <ManagerProfileForm
            initialData={profile.manager_profile || {}}
            onSave={handleManagerSave}
            disabled={loading}
          />
        </div>
      )}

      {/* Preferences Section - Always show */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group p-6">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <PreferencesForm
          initialData={profile.preferences || {
            notifications: { email: true },
            language: 'es',
            theme: 'auto',
            email_frequency: 'instant',
          }}
          onSave={handlePreferencesSave}
          disabled={loading}
        />
      </div>
    </div>
  );
}
