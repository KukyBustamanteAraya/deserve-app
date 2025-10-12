import { useState, useEffect } from 'react';
import { useAuth } from '@/app/components/AuthProvider';
import { supabaseBrowser } from '@/lib/supabase/client';
import type { UserProfile } from '@/types/user';
import { logger } from '@/lib/logger';

export function useUserProfile() {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchProfile() {
      if (!user) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabaseBrowser
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!mounted) return;

        if (fetchError) {
          logger.error('Error fetching profile:', fetchError);
          setError(fetchError.message);
        } else {
          setProfile(data as UserProfile);
        }
      } catch (err) {
        if (!mounted) return;
        logger.error('Unexpected error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    if (!authLoading) {
      fetchProfile();
    }

    return () => {
      mounted = false;
    };
  }, [user, authLoading]);

  return { profile, loading: loading || authLoading, error };
}

export function getDisplayName(profile: UserProfile | null, userEmail?: string | null): string {
  if (profile?.full_name) {
    return profile.full_name;
  }
  if (userEmail) {
    return userEmail.split('@')[0];
  }
  return 'User';
}
