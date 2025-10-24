/**
 * useProfile Hook
 *
 * Global hook to access user profile data including:
 * - user_type (player, manager, athletic_director, hybrid)
 * - athletic_profile (sports, positions, sizes, measurements)
 * - manager_profile (organization, shipping addresses)
 * - preferences (language, notifications)
 *
 * This hook provides real-time profile data and a reload function
 * to refresh the profile after updates.
 *
 * Usage:
 * ```typescript
 * const { profile, loading, error, reload } = useProfile();
 *
 * if (loading) return <div>Loading...</div>;
 * if (error) return <div>Error: {error}</div>;
 *
 * console.log(profile.user_type); // 'player' | 'manager' | 'athletic_director' | 'hybrid'
 * console.log(profile.athletic_profile); // Athletic data
 * ```
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { getBrowserClient } from '@/lib/supabase/client';
import { useAuth } from '@/app/components/AuthProvider';

// Profile type matching database schema
export interface UserProfile {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  user_type: 'player' | 'manager' | 'athletic_director' | 'hybrid' | null;
  athletic_profile: AthleticProfile | null;
  manager_profile: ManagerProfile | null;
  preferences: UserPreferences;
  is_admin: boolean;
  role: 'customer' | 'admin';
  created_at: string;
  updated_at: string;
}

export interface AthleticProfile {
  sports?: string[];
  primary_sport?: string;
  positions?: string[];
  jersey_number?: string;
  gender?: 'male' | 'female' | 'other';
  height_cm?: number;
  weight_kg?: number;
  chest_cm?: number;
  waist_cm?: number;
  shoe_size_eu?: number;
  preferred_sizes?: {
    jersey?: string;
    shorts?: string;
    jacket?: string;
  };
}

export interface ManagerProfile {
  organization_name?: string;
  role?: string;
  department?: string;
  phone?: string;
  shipping_addresses?: ShippingAddress[];
}

export interface ShippingAddress {
  id?: string;
  label?: string;
  recipient_name: string;
  recipient_phone: string;
  street_address: string;
  address_line_2?: string;
  commune: string;
  city: string;
  region: string;
  postal_code?: string;
  is_default?: boolean;
  delivery_instructions?: string;
}

export interface UserPreferences {
  language?: string;
  notifications?: {
    email?: boolean;
    sms?: boolean;
    push?: boolean;
  };
}

interface UseProfileReturn {
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
}

/**
 * Hook to fetch and manage user profile data
 */
export function useProfile(): UseProfileReturn {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Function to load profile data
  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const supabase = getBrowserClient();

      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (fetchError) {
        throw new Error(fetchError.message);
      }

      if (!data) {
        throw new Error('Profile not found');
      }

      // Ensure preferences has default structure
      const preferences = data.preferences || {
        language: 'es',
        notifications: {
          email: true,
        },
      };

      setProfile({
        ...data,
        preferences,
      } as UserProfile);

    } catch (err: any) {
      console.error('[useProfile] Error loading profile:', err);
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load profile on mount and when user changes
  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Memoize return object to prevent infinite re-renders in components
  return useMemo(() => ({
    profile,
    loading,
    error,
    reload: loadProfile,
  }), [profile, loading, error, loadProfile]);
}

/**
 * Helper hook to check if user has completed profile setup
 */
export function useProfileSetupStatus() {
  const { profile, loading } = useProfile();

  const isSetupComplete = profile?.user_type !== null && profile?.user_type !== undefined;

  const needsSetup = !loading && !isSetupComplete;

  return {
    isSetupComplete,
    needsSetup,
    userType: profile?.user_type,
    loading,
  };
}
