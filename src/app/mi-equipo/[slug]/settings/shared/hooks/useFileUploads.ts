import { useState } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { TeamSettings } from '@/types/team-settings';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface Team {
  id: string;
  slug: string;
  name: string;
  sport?: string;
  team_type?: 'single_team' | 'institution';
  institution_name?: string;
  colors: {
    primary: string;
    secondary: string;
    accent: string;
  };
  owner_id: string;
  current_owner_id: string;
}

interface UseFileUploadsProps {
  team: Team | null;
  settings: TeamSettings | null;
  setSettings: (settings: TeamSettings) => void;
  supabase: SupabaseClient;
}

export function useFileUploads({ team, settings, setSettings, supabase }: UseFileUploadsProps) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !team || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB');
      return;
    }

    setUploadingLogo(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}-logo-${Date.now()}.${fileExt}`;
      const filePath = `team-logos/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-branding')
        .getPublicUrl(filePath);

      // Update settings state
      setSettings({ ...settings, logo_url: publicUrl });
      alert('Logo uploaded successfully! Click "Save Settings" to apply changes.');
    } catch (error) {
      logger.error('Error uploading logo:', toError(error));
      alert('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleBannerUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !team || !settings) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size must be less than 5MB');
      return;
    }

    setUploadingBanner(true);
    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop();
      const fileName = `${team.id}-banner-${Date.now()}.${fileExt}`;
      const filePath = `team-banners/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('team-branding')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('team-branding')
        .getPublicUrl(filePath);

      // Update settings state
      setSettings({ ...settings, banner_url: publicUrl });
      alert('Banner uploaded successfully! Click "Save Settings" to apply changes.');
    } catch (error) {
      logger.error('Error uploading banner:', toError(error));
      alert('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  return {
    uploadingLogo,
    uploadingBanner,
    handleLogoUpload,
    handleBannerUpload,
  };
}
