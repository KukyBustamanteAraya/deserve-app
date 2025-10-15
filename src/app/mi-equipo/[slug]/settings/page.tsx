'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamSettings, ApprovalMode, PlayerInfoMode, AccessMode, PaymentMode } from '@/types/team-settings';
import { logger } from '@/lib/logger';
import { useSports } from '@/hooks/api/useSports';
import { getSportInfo } from '@/lib/sports/sportsMapping';
import { PaymentSettingsCard } from '@/components/team/PaymentSettingsCard';
import { HexColorPicker } from 'react-colorful';

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

export default function TeamSettingsPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const { sports, isLoading: sportsLoading } = useSports();

  const [team, setTeam] = useState<Team | null>(null);
  const [settings, setSettings] = useState<TeamSettings | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'player'>('player');
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  // Team branding state
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showTertiaryPicker, setShowTertiaryPicker] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  useEffect(() => {
    loadData();
  }, [params.slug]);

  const loadData = async () => {
    try {
      // Get current user
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (!currentUser) {
        router.push('/login');
        return;
      }
      setUser(currentUser);

      // Get team with sport info (join with sports table)
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select(`
          *,
          sports:sport_id (
            id,
            slug,
            name
          )
        `)
        .eq('slug', params.slug)
        .single();

      if (teamError) throw teamError;

      // Extract sport slug from joined data
      const sportSlug = (teamData as any).sports?.slug || null;
      setTeam({ ...teamData, sport: sportSlug });

      // Check if user is owner
      const owner = teamData.current_owner_id === currentUser.id || teamData.owner_id === currentUser.id;
      setIsOwner(owner);

      if (!owner) {
        alert('Only team owners can access settings');
        router.push(`/mi-equipo?team=${teamData.id}`);
        return;
      }

      // Get team settings - use maybeSingle() instead of single() to avoid 406 errors
      const { data: settingsData, error: settingsError } = await supabase
        .from('team_settings')
        .select('*')
        .eq('team_id', teamData.id)
        .maybeSingle();

      if (settingsError) {
        logger.error('Error fetching settings:', settingsError);
        throw settingsError;
      }

      if (settingsData) {
        setSettings(settingsData);
      } else {
        // Create default settings if they don't exist
        const defaultSettings: Partial<TeamSettings> = {
          team_id: teamData.id,
          approval_mode: 'any_member',
          min_approvals_required: 1,
          player_info_mode: 'hybrid',
          self_service_enabled: true,
          access_mode: 'invite_only',
          allow_member_invites: false,
          payment_mode: 'individual',
          notify_on_design_ready: true,
          notify_on_vote_required: true,
        };

        // Use upsert to avoid conflicts if settings were created elsewhere
        const { data: newSettings, error: createError } = await supabase
          .from('team_settings')
          .upsert(defaultSettings, { onConflict: 'team_id' })
          .select()
          .single();

        if (createError) {
          logger.error('Error creating settings:', createError);
          throw createError;
        }
        setSettings(newSettings);
      }

      // Load team members
      await loadMembers(teamData.id);
    } catch (error) {
      logger.error('Error loading settings:', error);
      alert('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async (teamId: string) => {
    try {
      console.log('[loadMembers] Loading unified member list for team:', teamId);

      // 1. Fetch all team memberships (active members)
      const { data: membershipsData, error: membershipsError } = await supabase
        .from('team_memberships')
        .select('role, user_id, created_at')
        .eq('team_id', teamId);

      if (membershipsError) {
        console.error('[loadMembers] Error fetching memberships:', membershipsError);
        throw membershipsError;
      }

      // 2. Fetch all player info submissions (roster)
      const { data: playersData, error: playersError } = await supabase
        .from('player_info_submissions')
        .select('id, player_name, user_id, created_at')
        .eq('team_id', teamId);

      if (playersError) {
        console.error('[loadMembers] Error fetching players:', playersError);
        throw playersError;
      }

      // 3. Fetch all pending invites
      const { data: invitesData, error: invitesError } = await supabase
        .from('team_invites')
        .select('id, player_submission_id, email, status, created_at')
        .eq('team_id', teamId);

      if (invitesError) {
        console.error('[loadMembers] Error fetching invites:', invitesError);
        throw invitesError;
      }

      console.log('[loadMembers] Fetched:', {
        memberships: membershipsData?.length || 0,
        players: playersData?.length || 0,
        invites: invitesData?.length || 0
      });
      console.log('[loadMembers] membershipsData:', membershipsData);
      console.log('[loadMembers] playersData:', playersData);
      console.log('[loadMembers] invitesData:', invitesData);

      // Create unified member list
      const unifiedMembers: any[] = [];
      const processedUserIds = new Set<string>();
      const processedPlayerIds = new Set<string>();

      // First: Add all active members (from team_memberships)
      if (membershipsData) {
        for (const membership of membershipsData) {
          processedUserIds.add(membership.user_id);

          // Get profile data
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, full_name')
            .eq('id', membership.user_id)
            .single();

          // Check if this user also has a player submission
          const playerSubmission = playersData?.find(p => p.user_id === membership.user_id);
          if (playerSubmission) {
            processedPlayerIds.add(playerSubmission.id);
          }

          unifiedMembers.push({
            id: membership.user_id,
            type: 'active_member',
            display_name: profile?.full_name || 'Unknown User',
            role: membership.role,
            status: 'Active Member',
            user_id: membership.user_id,
            player_submission_id: playerSubmission?.id || null,
            created_at: membership.created_at
          });
        }
      }

      // Second: Add roster-only players (no user_id) and players with accounts but not members
      if (playersData) {
        for (const player of playersData) {
          // Skip if already processed
          if (processedPlayerIds.has(player.id)) continue;

          // Check for pending invite
          const invite = invitesData?.find(
            inv => inv.player_submission_id === player.id && inv.status === 'pending'
          );

          if (!player.user_id) {
            // Roster-only player (no account)
            unifiedMembers.push({
              id: player.id,
              type: 'roster_only',
              display_name: player.player_name,
              role: null,
              status: invite ? 'Invited (Pending)' : 'Roster Only',
              user_id: null,
              player_submission_id: player.id,
              invite_id: invite?.id || null,
              created_at: player.created_at
            });
          } else if (!processedUserIds.has(player.user_id)) {
            // Has account but not a member of this team
            const { data: profile } = await supabase
              .from('profiles')
              .select('id, full_name')
              .eq('id', player.user_id)
              .single();

            unifiedMembers.push({
              id: player.user_id,
              type: 'has_account_not_member',
              display_name: profile?.full_name || player.player_name,
              role: null,
              status: 'Has Account (Not Member)',
              user_id: player.user_id,
              player_submission_id: player.id,
              created_at: player.created_at
            });
          }

          processedPlayerIds.add(player.id);
        }
      }

      // Sort: Active members first, then by name
      unifiedMembers.sort((a, b) => {
        const statusOrder = {
          'Active Member': 0,
          'Has Account (Not Member)': 1,
          'Invited (Pending)': 2,
          'Roster Only': 3
        };
        const statusDiff = (statusOrder[a.status as keyof typeof statusOrder] || 999) -
                          (statusOrder[b.status as keyof typeof statusOrder] || 999);
        if (statusDiff !== 0) return statusDiff;
        return a.display_name.localeCompare(b.display_name);
      });

      console.log('[loadMembers] Unified members:', unifiedMembers);
      setMembers(unifiedMembers);
    } catch (error) {
      console.error('[loadMembers] Error loading unified members:', error);
      logger.error('Error loading unified members:', error);
      setMembers([]);
    }
  };

  const handleChangeRole = async (userId: string, newRole: 'owner' | 'manager' | 'player') => {
    if (!team) return;

    try {
      const { error } = await supabase
        .from('team_memberships')
        .update({ role: newRole })
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;

      alert('Role updated successfully!');
      await loadMembers(team.id);
    } catch (error) {
      logger.error('Error updating role:', error);
      alert('Failed to update role');
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!team) return;

    if (!confirm('Are you sure you want to remove this member?')) return;

    try {
      const { error } = await supabase
        .from('team_memberships')
        .delete()
        .eq('team_id', team.id)
        .eq('user_id', userId);

      if (error) throw error;

      alert('Member removed successfully!');
      await loadMembers(team.id);
    } catch (error) {
      logger.error('Error removing member:', error);
      alert('Failed to remove member');
    }
  };

  const handleUpdateTeamInfo = async (field: 'name' | 'sport', value: string) => {
    if (!team) return;

    try {
      let updateData: any = {};

      if (field === 'sport') {
        // Find the sport_id from the sports list
        const selectedSport = sports.find(s => s.slug === value);
        if (!selectedSport) {
          alert('Invalid sport selected');
          return;
        }
        // Update both sport (text) and sport_id (FK)
        updateData = {
          sport: value,
          sport_id: parseInt(selectedSport.id)
        };
      } else {
        updateData = { [field]: value };
      }

      const { error } = await supabase
        .from('teams')
        .update(updateData)
        .eq('id', team.id);

      if (error) throw error;

      setTeam({ ...team, ...updateData });
      alert(`Team ${field} updated successfully!`);
    } catch (error) {
      logger.error(`Error updating team ${field}:`, error);
      alert(`Failed to update team ${field}`);
    }
  };

  const handleSave = async () => {
    if (!settings || !team) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('team_settings')
        .update({
          approval_mode: settings.approval_mode,
          min_approvals_required: settings.min_approvals_required,
          player_info_mode: settings.player_info_mode,
          self_service_enabled: settings.self_service_enabled,
          access_mode: settings.access_mode,
          allow_member_invites: settings.allow_member_invites,
          payment_mode: settings.payment_mode,
          notify_on_design_ready: settings.notify_on_design_ready,
          notify_on_vote_required: settings.notify_on_vote_required,
          // Branding fields
          primary_color: settings.primary_color,
          secondary_color: settings.secondary_color,
          tertiary_color: settings.tertiary_color,
          logo_url: settings.logo_url,
          banner_url: settings.banner_url,
          updated_at: new Date().toISOString(),
        })
        .eq('team_id', team.id);

      if (error) throw error;

      alert('Settings saved successfully!');
    } catch (error) {
      logger.error('Error saving settings:', error);
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

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
      logger.error('Error uploading logo:', error);
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
      logger.error('Error uploading banner:', error);
      alert('Failed to upload banner');
    } finally {
      setUploadingBanner(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
          <p className="mt-4 text-gray-300">Loading settings...</p>
        </div>
      </div>
    );
  }

  if (!team || !settings) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <p className="text-gray-300">Settings not found</p>
      </div>
    );
  }

  // Institution-specific settings
  if (team.team_type === 'institution') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
        {/* Institution Header Banner */}
        <div className="max-w-4xl mx-auto px-4 mb-6">
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            {/* Back Arrow */}
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}`)}
              className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
            </button>

            <div className="relative pt-2 pl-6">
              <div className="flex items-center gap-6">
                {/* Institution Logo */}
                <div className="relative flex-shrink-0">
                  <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700/50 via-gray-800/50 to-gray-900/50 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                    {settings?.logo_url ? (
                      <img src={settings.logo_url} alt={`${team.name} logo`} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-4xl">🏆</span>
                    )}
                  </div>
                </div>

                {/* Institution Info */}
                <div className="flex-1">
                  <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                  <p className="text-gray-300 text-lg">Configuración de la Institución</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Institution Settings */}
        <div className="max-w-4xl mx-auto px-4">
          <div className="space-y-6">

            {/* Institution Profile */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <h2 className="text-xl font-semibold text-white mb-4 relative">🏫 Perfil de la Institución</h2>
              <p className="text-gray-300 text-sm mb-4 relative">Información básica de la institución</p>

              <div className="space-y-4 relative">
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Nombre de la Institución</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={team.name}
                      onChange={(e) => setTeam({ ...team, name: e.target.value })}
                      className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    />
                    <button
                      onClick={() => handleUpdateTeamInfo('name', team.name)}
                      className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Actualizar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Institution Branding */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <h2 className="text-xl font-semibold text-white mb-4 relative">🎨 Marca Institucional</h2>
              <p className="text-gray-300 text-sm mb-6 relative">Colores y logo de la institución</p>

              <div className="space-y-6 relative">
                {/* Colors */}
                <div>
                  <h3 className="font-medium text-white mb-4">Colores Institucionales</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primary Color */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Color Primario</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                          className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                          style={{ backgroundColor: settings.primary_color || '#e21c21' }}
                        >
                          <span className="text-white font-medium drop-shadow-md">{settings.primary_color || '#e21c21'}</span>
                        </button>
                        {showPrimaryPicker && (
                          <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                            <HexColorPicker
                              color={settings.primary_color || '#e21c21'}
                              onChange={(color) => setSettings({ ...settings, primary_color: color })}
                            />
                            <button
                              onClick={() => setShowPrimaryPicker(false)}
                              className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            >
                              Listo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Secondary Color */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Color Secundario</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowSecondaryPicker(!showSecondaryPicker)}
                          className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                          style={{ backgroundColor: settings.secondary_color || '#ffffff' }}
                        >
                          <span className={`font-medium drop-shadow-md ${settings.secondary_color === '#ffffff' || !settings.secondary_color ? 'text-gray-800' : 'text-white'}`}>
                            {settings.secondary_color || '#ffffff'}
                          </span>
                        </button>
                        {showSecondaryPicker && (
                          <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                            <HexColorPicker
                              color={settings.secondary_color || '#ffffff'}
                              onChange={(color) => setSettings({ ...settings, secondary_color: color })}
                            />
                            <button
                              onClick={() => setShowSecondaryPicker(false)}
                              className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            >
                              Listo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Tertiary Color */}
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">Color Terciario</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowTertiaryPicker(!showTertiaryPicker)}
                          className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                          style={{ backgroundColor: settings.tertiary_color || '#0b0b0c' }}
                        >
                          <span className="text-white font-medium drop-shadow-md">{settings.tertiary_color || '#0b0b0c'}</span>
                        </button>
                        {showTertiaryPicker && (
                          <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                            <HexColorPicker
                              color={settings.tertiary_color || '#0b0b0c'}
                              onChange={(color) => setSettings({ ...settings, tertiary_color: color })}
                            />
                            <button
                              onClick={() => setShowTertiaryPicker(false)}
                              className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            >
                              Listo
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Logo */}
                <div>
                  <h3 className="font-medium text-white mb-4">Logo Institucional</h3>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      {settings.logo_url ? (
                        <img src={settings.logo_url} alt="Logo" className="w-32 h-32 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg" />
                      ) : (
                        <div className="w-32 h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                          <span className="text-4xl">🏆</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <label className="block">
                        <input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploadingLogo} className="hidden" />
                        <div className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-center cursor-pointer inline-block border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/upload">
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">{uploadingLogo ? 'Subiendo...' : settings.logo_url ? 'Cambiar Logo' : 'Subir Logo'}</span>
                        </div>
                      </label>
                      <p className="text-xs text-gray-400 mt-2">Recomendado: Imagen cuadrada, mínimo 200x200px, máx 2MB. Formato PNG o JPG.</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Staff Management */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <h2 className="text-xl font-semibold text-white mb-4 relative">👥 Personal Administrativo</h2>
              <p className="text-gray-300 text-sm mb-4 relative">Gestionar staff y roles institucionales</p>

              <div className="space-y-4 relative">
                {/* Staff List */}
                <div className="space-y-3">
                  {members.filter(m => m.status === 'Active Member').map((member) => (
                    <div
                      key={member.id}
                      className="relative flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 overflow-hidden group/member hover:border-gray-600 transition-all"
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="flex-1 relative">
                        <div className="font-medium text-white">{member.display_name}</div>
                        <div className="mt-1">
                          <span className="text-xs text-gray-400">
                            {member.role === 'owner' ? 'Director Atlético' : member.role === 'manager' ? 'Administrador' : 'Miembro'}
                          </span>
                        </div>
                      </div>
                      {member.user_id !== user?.id && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id)}
                          className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors relative"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {/* Add Staff Button */}
                <button
                  onClick={() => setShowInviteModal(true)}
                  className="relative w-full px-4 py-3 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 overflow-hidden group/add"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">+</span>
                  <span className="relative">Agregar Personal</span>
                </button>
              </div>
            </div>

            {/* Policies */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <h2 className="text-xl font-semibold text-white mb-4 relative">📋 Políticas Institucionales</h2>
              <p className="text-gray-300 text-sm mb-4 relative">Configurar políticas de aprobación y autonomía de programas</p>

              <div className="space-y-4 relative">
                {/* Approval Mode */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Modo de Aprobación de Diseños</label>
                  <select
                    value={settings.approval_mode}
                    onChange={(e) => setSettings({ ...settings, approval_mode: e.target.value as ApprovalMode })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  >
                    <option value="owner_only" className="bg-black text-white">Solo Director Atlético</option>
                    <option value="any_member" className="bg-black text-white">Cualquier Entrenador</option>
                    <option value="voting" className="bg-black text-white">Votación - Requiere X aprobaciones</option>
                  </select>
                </div>

                {/* Program Autonomy */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">Autonomía de Programas</label>
                  <div className="space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.allow_member_invites || false}
                        onChange={(e) => setSettings({ ...settings, allow_member_invites: e.target.checked })}
                        className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                      />
                      <label className="ml-2 text-sm text-gray-300">
                        Permitir a entrenadores invitar miembros a sus programas
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        checked={settings.self_service_enabled || false}
                        onChange={(e) => setSettings({ ...settings, self_service_enabled: e.target.checked })}
                        className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                      />
                      <label className="ml-2 text-sm text-gray-300">
                        Permitir autoservicio de información de jugadores
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Addresses */}
            <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <h2 className="text-xl font-semibold text-white mb-4 relative">📍 Direcciones</h2>
              <p className="text-gray-300 text-sm mb-4 relative">Direcciones de envío y facturación de la institución</p>

              <div className="space-y-4 relative">
                <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600 overflow-hidden group/info">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative text-center py-8">
                    <span className="text-4xl block mb-3">🏢</span>
                    <p className="text-gray-300 mb-2">Gestión de direcciones próximamente</p>
                    <p className="text-sm text-gray-400">
                      Podrás agregar y gestionar direcciones de envío y facturación para la institución
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end gap-4">
              <button
                onClick={() => router.push(`/mi-equipo/${params.slug}`)}
                className="relative px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel shadow-lg"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Cancelar</span>
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="relative px-6 py-3 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/save disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/save:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Invite Member Modal (shared with single team settings) */}
        {showInviteModal && (
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-700 overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <div className="flex justify-between items-center mb-4 relative">
                <h2 className="text-2xl font-bold text-white">Invitar Personal</h2>
                <button
                  onClick={() => {
                    setShowInviteModal(false);
                    setInviteEmail('');
                    setInviteRole('player');
                    setGeneratedInviteLink(null);
                    setLinkCopied(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4 relative">
                {!generatedInviteLink ? (
                  <>
                    <div className="relative">
                      <label className="block text-sm font-medium text-white mb-2">Email (Opcional)</label>
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="persona@ejemplo.com"
                        className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                      />
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-white mb-2">Rol</label>
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'manager' | 'player')}
                        className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                      >
                        <option value="manager" className="bg-black text-white">⚙️ Administrador - Gestionar programas</option>
                        <option value="player" className="bg-black text-white">👤 Miembro - Ver información</option>
                      </select>
                    </div>
                  </>
                ) : (
                  <div className="space-y-4 relative">
                    <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 overflow-hidden group/success">
                      <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/success:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="flex items-center gap-2 mb-2 relative">
                        <span className="text-2xl">✅</span>
                        <h3 className="font-semibold text-green-200">¡Invitación Creada!</h3>
                      </div>
                      <p className="text-sm text-green-200 relative">Comparte este enlace. Expira en 7 días.</p>
                    </div>

                    <div className="relative">
                      <label className="block text-sm font-medium text-white mb-2">Enlace de Invitación</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={generatedInviteLink}
                          readOnly
                          className="flex-1 px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white text-sm font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(generatedInviteLink);
                            setLinkCopied(true);
                            setTimeout(() => setLinkCopied(false), 2000);
                          }}
                          className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden border shadow-lg ${
                            linkCopied
                              ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white border-green-600/50 shadow-green-600/30'
                              : 'bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white border-red-600/50 shadow-red-600/30 hover:shadow-red-600/50'
                          }`}
                        >
                          <span className="relative">{linkCopied ? '✓ Copiado' : 'Copiar'}</span>
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        const message = encodeURIComponent(
                          `🎯 ${team?.name}\n\n¡Estás invitado a unirte al equipo!\n\nHaz clic aquí para aceptar: ${generatedInviteLink}`
                        );
                        window.open(`https://wa.me/?text=${message}`, '_blank');
                      }}
                      className="relative w-full px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50 overflow-hidden group/whatsapp"
                    >
                      <span className="relative">📱 Compartir por WhatsApp</span>
                    </button>
                  </div>
                )}

                <div className="flex gap-3 mt-6 relative">
                  {!generatedInviteLink ? (
                    <>
                      <button
                        onClick={() => {
                          setShowInviteModal(false);
                          setInviteEmail('');
                          setInviteRole('player');
                          setGeneratedInviteLink(null);
                          setLinkCopied(false);
                        }}
                        className="relative flex-1 px-6 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 text-gray-300 hover:text-white rounded-lg font-medium overflow-hidden group/cancel shadow-lg hover:border-gray-600"
                      >
                        <span className="relative">Cancelar</span>
                      </button>
                      <button
                        onClick={async () => {
                          if (!team) return;

                          try {
                            const { data: { session } } = await supabase.auth.getSession();
                            if (!session) {
                              alert('Por favor inicia sesión para enviar invitaciones');
                              return;
                            }

                            const response = await fetch(`/api/teams/${team.id}/invite`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${session.access_token}`
                              },
                              body: JSON.stringify({
                                email: inviteEmail || undefined,
                                role: inviteRole
                              })
                            });

                            const data = await response.json();

                            if (!response.ok) {
                              alert(data.error || 'Error al enviar invitación');
                              return;
                            }

                            setGeneratedInviteLink(data.invite.link);
                            await loadMembers(team.id);
                          } catch (error) {
                            console.error('[Invite] Error:', error);
                            alert('Error al enviar invitación');
                          }
                        }}
                        className="relative flex-1 px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/send"
                      >
                        <span className="relative">Enviar Invitación</span>
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteEmail('');
                        setInviteRole('player');
                        setGeneratedInviteLink(null);
                        setLinkCopied(false);
                      }}
                      className="relative w-full px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/done"
                    >
                      <span className="relative">Listo</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Single team settings (existing code)
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
      {/* Team Header Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={() => router.push(`/mi-equipo/${params.slug}`)}
            className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          <div className="relative pt-2 pl-6">
            <div className="flex items-center gap-6">
              {/* Team Logo */}
              <div className="relative flex-shrink-0">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-700/50 via-gray-800/50 to-gray-900/50 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                  {settings?.logo_url ? (
                    <img
                      src={settings.logo_url}
                      alt={`${team.name} logo`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl">🏆</span>
                  )}
                </div>
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-gray-300 text-lg">
                  Configuración del Equipo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Settings Form */}
      <div className="max-w-4xl mx-auto px-4">
        <div className="space-y-6">

          {/* Team Information */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">Team Information</h2>
            <p className="text-gray-300 text-sm mb-4 relative">Basic team details</p>

            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Team Name
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={team.name}
                    onChange={(e) => setTeam({ ...team, name: e.target.value })}
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  />
                  <button
                    onClick={() => handleUpdateTeamInfo('name', team.name)}
                    className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Update</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Sport
                </label>
                <div className="flex gap-2">
                  <select
                    value={team.sport || ''}
                    onChange={(e) => setTeam({ ...team, sport: e.target.value })}
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    disabled={sportsLoading}
                  >
                    <option value="" className="bg-black text-white">Select a sport</option>
                    {sports.map((sport) => {
                      const sportInfo = getSportInfo(sport.slug);
                      return (
                        <option key={sport.id} value={sport.slug} className="bg-black text-white">
                          {sportInfo.emoji} {sport.name}
                        </option>
                      );
                    })}
                  </select>
                  <button
                    onClick={() => handleUpdateTeamInfo('sport', team.sport || '')}
                    className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    disabled={sportsLoading}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Update</span>
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Sets the sport for field visualization and available positions
                </p>
              </div>
            </div>
          </div>

          {/* Team Branding */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">🎨 Team Branding</h2>
            <p className="text-gray-300 text-sm mb-6 relative">Customize your team's colors, logo, and banner to match your brand</p>

            <div className="space-y-6 relative">
              {/* Team Colors */}
              <div>
                <h3 className="font-medium text-white mb-4">Team Colors</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Primary Color */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Primary Color
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                        className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                        style={{ backgroundColor: settings.primary_color || '#e21c21', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <span className="text-white font-medium drop-shadow-md">
                          {settings.primary_color || '#e21c21'}
                        </span>
                      </button>
                      {showPrimaryPicker && (
                        <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                          <HexColorPicker
                            color={settings.primary_color || '#e21c21'}
                            onChange={(color) => setSettings({ ...settings, primary_color: color })}
                          />
                          <button
                            onClick={() => setShowPrimaryPicker(false)}
                            className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Secondary Color
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowSecondaryPicker(!showSecondaryPicker)}
                        className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                        style={{ backgroundColor: settings.secondary_color || '#ffffff', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <span className={`font-medium drop-shadow-md ${settings.secondary_color === '#ffffff' || !settings.secondary_color ? 'text-gray-800' : 'text-white'}`}>
                          {settings.secondary_color || '#ffffff'}
                        </span>
                      </button>
                      {showSecondaryPicker && (
                        <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                          <HexColorPicker
                            color={settings.secondary_color || '#ffffff'}
                            onChange={(color) => setSettings({ ...settings, secondary_color: color })}
                          />
                          <button
                            onClick={() => setShowSecondaryPicker(false)}
                            className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tertiary Color */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      Tertiary Color
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowTertiaryPicker(!showTertiaryPicker)}
                        className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                        style={{ backgroundColor: settings.tertiary_color || '#0b0b0c', transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <span className="text-white font-medium drop-shadow-md">
                          {settings.tertiary_color || '#0b0b0c'}
                        </span>
                      </button>
                      {showTertiaryPicker && (
                        <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                          <HexColorPicker
                            color={settings.tertiary_color || '#0b0b0c'}
                            onChange={(color) => setSettings({ ...settings, tertiary_color: color })}
                          />
                          <button
                            onClick={() => setShowTertiaryPicker(false)}
                            className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            Done
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  These colors will be used throughout your team dashboard, buttons, and UI elements
                </p>
              </div>

              {/* Team Logo */}
              <div>
                <h3 className="font-medium text-white mb-4">Team Logo</h3>
                <div className="flex items-start gap-4">
                  {/* Logo Preview */}
                  <div className="flex-shrink-0">
                    {settings.logo_url ? (
                      <img
                        src={settings.logo_url}
                        alt="Team logo"
                        className="w-32 h-32 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg"
                      />
                    ) : (
                      <div className="w-32 h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                        <span className="text-4xl">🏆</span>
                      </div>
                    )}
                  </div>
                  {/* Upload Button */}
                  <div className="flex-1">
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        disabled={uploadingLogo}
                        className="hidden"
                      />
                      <div className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-center cursor-pointer inline-block disabled:opacity-50 border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/upload"
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                        <span className="relative">{uploadingLogo ? 'Uploading...' : settings.logo_url ? 'Change Logo' : 'Upload Logo'}</span>
                      </div>
                    </label>
                    <p className="text-xs text-gray-400 mt-2">
                      Recommended: Square image, at least 200x200px, max 2MB. PNG or JPG format.
                    </p>
                    {settings.logo_url && (
                      <button
                        onClick={() => setSettings({ ...settings, logo_url: undefined })}
                        className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Team Banner */}
              <div>
                <h3 className="font-medium text-white mb-4">Team Banner</h3>
                <div className="space-y-4">
                  {/* Banner Preview */}
                  {settings.banner_url ? (
                    <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl group/banner">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity pointer-events-none z-10"></div>
                      <img
                        src={settings.banner_url}
                        alt="Team banner"
                        className="w-full h-48 object-cover"
                      />
                    </div>
                  ) : (
                    <div className="relative w-full h-48 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 overflow-hidden group/empty">
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/empty:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="text-center relative">
                        <span className="text-4xl block mb-2">🎯</span>
                        <p className="text-sm text-gray-300">No banner uploaded</p>
                        <p className="text-xs text-gray-400 mt-1">A default banner will be generated using your team colors</p>
                      </div>
                    </div>
                  )}
                  {/* Upload Button */}
                  <div>
                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleBannerUpload}
                        disabled={uploadingBanner}
                        className="hidden"
                      />
                      <div className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-center cursor-pointer inline-block border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/upload disabled:opacity-50"
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                        <span className="relative">{uploadingBanner ? 'Uploading...' : settings.banner_url ? 'Change Banner' : 'Upload Banner'}</span>
                      </div>
                    </label>
                    <p className="text-xs text-gray-400 mt-2">
                      Recommended: Wide image (16:9 ratio), at least 1200x675px, max 5MB. PNG or JPG format.
                    </p>
                    {settings.banner_url && (
                      <button
                        onClick={() => setSettings({ ...settings, banner_url: undefined })}
                        className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                      >
                        Remove Banner
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Info Box */}
              <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600 overflow-hidden group/info">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
                <h3 className="text-sm font-semibold text-white mb-2 relative">💡 Branding Tips:</h3>
                <div className="space-y-1 text-sm text-gray-300 relative">
                  <div>• Your team colors will automatically apply to buttons, dividers, and accents across your dashboard</div>
                  <div>• If you don't upload a banner, a beautiful gradient banner will be generated using your team colors</div>
                  <div>• The logo appears in your team header and can be used in design requests</div>
                  <div>• Click "Save Settings" below to apply your branding changes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Team Members & Roles */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative">
              <div>
                <h2 className="text-xl font-semibold text-white">Team Members & Roles</h2>
                <p className="text-gray-300 text-sm mt-1">Manage who has access to your team and their permissions</p>
              </div>
              <button
                onClick={() => setShowInviteModal(true)}
                className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium flex items-center gap-2 border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/invite"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/invite:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">+</span>
                <span className="relative">Invite Member</span>
              </button>
            </div>

            {/* Members List */}
            <div className="mt-4 space-y-3 relative">
              {members.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No members or players yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="relative flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 overflow-hidden group/member hover:border-gray-600 transition-all"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="flex-1 relative">
                      <div className="font-medium text-white">
                        {member.display_name}
                        {member.user_id === user?.id && (
                          <span className="ml-2 text-xs text-gray-400">(You)</span>
                        )}
                      </div>
                      {/* Status Badge */}
                      <div className="mt-1">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            member.status === 'Active Member'
                              ? 'bg-green-500/20 text-green-400 border border-green-500/50'
                              : member.status === 'Invited (Pending)'
                              ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
                              : member.status === 'Roster Only'
                              ? 'bg-gray-500/20 text-gray-400 border border-gray-500/50'
                              : 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                          }`}
                        >
                          {member.status}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 relative">
                      {/* Active Member Actions */}
                      {member.status === 'Active Member' && (
                        <>
                          {/* Role Selector */}
                          <select
                            value={member.role}
                            onChange={(e) => handleChangeRole(member.user_id, e.target.value as 'owner' | 'manager' | 'player')}
                            disabled={member.user_id === user?.id}
                            className="px-3 py-1 border border-gray-700 rounded-lg text-sm bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="owner" className="bg-black text-white">Manager (Owner)</option>
                            <option value="manager" className="bg-black text-white">Manager</option>
                            <option value="player" className="bg-black text-white">Player</option>
                          </select>

                          {/* Role Badge */}
                          <span
                            className={`px-3 py-1 text-xs font-medium rounded-full ${
                              member.role === 'owner'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/50'
                                : member.role === 'manager'
                                ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50'
                                : 'bg-green-500/20 text-green-400 border border-green-500/50'
                            }`}
                          >
                            {member.role === 'owner' ? '👑 Owner' : member.role === 'manager' ? '⚙️ Manager' : '⚽ Player'}
                          </span>

                          {/* Remove Button */}
                          {member.user_id !== user?.id && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id)}
                              className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </>
                      )}

                      {/* Roster Only - Show Invite Button */}
                      {member.status === 'Roster Only' && (
                        <button
                          onClick={() => {
                            setInvitingPlayerId(member.player_submission_id);
                            setShowInviteModal(true);
                          }}
                          className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-sm border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/btn"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">📧 Invite to App</span>
                        </button>
                      )}

                      {/* Invited (Pending) - Show Resend Button */}
                      {member.status === 'Invited (Pending)' && (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-400">Invitation sent</span>
                          <button
                            onClick={() => {
                              setInvitingPlayerId(member.player_submission_id);
                              setShowInviteModal(true);
                            }}
                            className="px-3 py-1 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                          >
                            Resend
                          </button>
                        </div>
                      )}

                      {/* Has Account (Not Member) - Show Add to Team Button */}
                      {member.status === 'Has Account (Not Member)' && (
                        <button
                          onClick={() => {
                            // TODO: Add to team membership
                            alert('Add to team functionality coming soon');
                          }}
                          className="relative px-4 py-2 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium text-sm border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50 overflow-hidden group/btn"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative">➕ Add to Team</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Help Text */}
            <div className="relative mt-6 p-4 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-600 overflow-hidden group/help">
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/help:opacity-100 transition-opacity pointer-events-none"></div>
              <h3 className="text-sm font-semibold text-white mb-2 relative">Understanding Member Status:</h3>
              <div className="space-y-2 text-sm text-gray-300 relative">
                <div><strong>🟢 Active Member:</strong> Has app account and is part of your team. Can access team features based on their role.</div>
                <div><strong>🟡 Invited (Pending):</strong> Invitation sent but not yet accepted. Can resend invitation.</div>
                <div><strong>⚪ Roster Only:</strong> Player on your roster but hasn't created an app account yet. Click "Invite to App" to send them an invitation link.</div>
                <div><strong>🟣 Has Account (Not Member):</strong> Player has an app account but isn't a team member yet. Click "Add to Team" to add them.</div>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-600 relative">
                <h3 className="text-sm font-semibold text-white mb-2">Role Permissions:</h3>
                <div className="space-y-1 text-sm text-gray-300">
                  <div><strong>👑 Owner/Manager:</strong> Full control - manage settings, approve designs, manage members</div>
                  <div><strong>⚽ Player:</strong> Submit player info, view designs, participate in votes</div>
                </div>
              </div>
            </div>
          </div>

          {/* Design Approval Settings */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">Design Approval</h2>
            <p className="text-gray-300 text-sm mb-4 relative">Control how designs are approved for your team</p>

            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Approval Mode
                </label>
                <select
                  value={settings.approval_mode}
                  onChange={(e) => setSettings({ ...settings, approval_mode: e.target.value as ApprovalMode })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                >
                  <option value="owner_only" className="bg-black text-white">Owner Only - Only team owner/managers can approve</option>
                  <option value="any_member" className="bg-black text-white">Any Member - First approval wins</option>
                  <option value="voting" className="bg-black text-white">Voting - Requires X number of approvals</option>
                  <option value="multi_design_vote" className="bg-black text-white">Multi-Design Vote - Team votes on multiple options</option>
                </select>
              </div>

              {settings.approval_mode === 'voting' && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Minimum Approvals Required
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={settings.min_approvals_required}
                    onChange={(e) => setSettings({ ...settings, min_approvals_required: parseInt(e.target.value) })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Player Info Collection Settings */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">Player Information Collection</h2>
            <p className="text-gray-300 text-sm mb-4 relative">How players submit their jersey info (name, number, size)</p>

            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Collection Mode
                </label>
                <select
                  value={settings.player_info_mode}
                  onChange={(e) => setSettings({ ...settings, player_info_mode: e.target.value as PlayerInfoMode })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                >
                  <option value="self_service" className="bg-black text-white">Self-Service - Players fill out their own info</option>
                  <option value="manager_only" className="bg-black text-white">Manager Only - Manager enters all player data</option>
                  <option value="hybrid" className="bg-black text-white">Hybrid - Manager can enable/disable player self-service</option>
                </select>
              </div>

              {(settings.player_info_mode === 'self_service' || settings.player_info_mode === 'hybrid') && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.self_service_enabled}
                    onChange={(e) => setSettings({ ...settings, self_service_enabled: e.target.checked })}
                    className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                  />
                  <label className="ml-2 text-sm text-gray-300">
                    Enable player self-service (players can submit their own info)
                  </label>
                </div>
              )}
            </div>
          </div>

          {/* Payment Settings */}
          <PaymentSettingsCard
            paymentMode={settings.payment_mode}
            onPaymentModeChange={(mode) => setSettings({ ...settings, payment_mode: mode })}
          />

          {/* Access Control Settings */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">Access Control</h2>
            <p className="text-gray-300 text-sm mb-4 relative">Who can join your team</p>

            <div className="space-y-4 relative">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Access Mode
                </label>
                <select
                  value={settings.access_mode}
                  onChange={(e) => setSettings({ ...settings, access_mode: e.target.value as AccessMode })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                >
                  <option value="open" className="bg-black text-white">Open - Anyone can join</option>
                  <option value="invite_only" className="bg-black text-white">Invite Only - Requires invitation</option>
                  <option value="private" className="bg-black text-white">Private - Strictly controlled access</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.allow_member_invites}
                  onChange={(e) => setSettings({ ...settings, allow_member_invites: e.target.checked })}
                  className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Allow team members to invite others
                </label>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <h2 className="text-xl font-semibold text-white mb-4 relative">Notifications</h2>
            <p className="text-gray-300 text-sm mb-4 relative">Email notification preferences</p>

            <div className="space-y-3 relative">
              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notify_on_design_ready}
                  onChange={(e) => setSettings({ ...settings, notify_on_design_ready: e.target.checked })}
                  className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Notify when design is ready for approval
                </label>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.notify_on_vote_required}
                  onChange={(e) => setSettings({ ...settings, notify_on_vote_required: e.target.checked })}
                  className="w-4 h-4 text-red-600 accent-red-600 bg-gray-800 border-gray-700 rounded focus:ring-red-500/50"
                />
                <label className="ml-2 text-sm text-gray-300">
                  Notify when vote is required
                </label>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            <button
              onClick={() => router.push(`/mi-equipo?team=${team.id}`)}
              className="relative px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel shadow-lg"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Cancel</span>
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="relative px-6 py-3 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/save disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/save:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">{saving ? 'Saving...' : 'Save Settings'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Invite Member Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative">
              <h2 className="text-2xl font-bold text-white">Invite Team Member</h2>
              <button
                onClick={() => {
                  setShowInviteModal(false);
                  setInviteEmail('');
                  setInviteRole('player');
                  setInvitingPlayerId(null);
                  setGeneratedInviteLink(null);
                  setLinkCopied(false);
                }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4 relative">
              {!generatedInviteLink ? (
                <>
                  <div className="relative">
                    <label className="block text-sm font-medium text-white mb-2">
                      Email Address (Optional)
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="teammate@example.com"
                      className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      Optional - for record keeping. Email sending not yet implemented.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-white mb-2">
                      Role
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'manager' | 'player')}
                      className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    >
                      <option value="manager" className="bg-black text-white">⚙️ Manager - Can manage settings and approve designs</option>
                      <option value="player" className="bg-black text-white">⚽ Player - Can submit info and view team</option>
                    </select>
                  </div>

                  <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600 overflow-hidden group/info">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
                    <p className="text-sm text-gray-300 relative">
                      🔗 You'll receive an invite link to share with the player via WhatsApp, text, etc.
                    </p>
                  </div>
                </>
              ) : (
                <div className="space-y-4 relative">
                  <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 overflow-hidden group/success">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/success:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="flex items-center gap-2 mb-2 relative">
                      <span className="text-2xl">✅</span>
                      <h3 className="font-semibold text-green-200">Invite Created Successfully!</h3>
                    </div>
                    <p className="text-sm text-green-200 relative">
                      Share this link with the player. It expires in 7 days.
                    </p>
                  </div>

                  <div className="relative">
                    <label className="block text-sm font-medium text-white mb-2">
                      Invite Link
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={generatedInviteLink}
                        readOnly
                        className="flex-1 px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white text-sm font-mono"
                      />
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(generatedInviteLink);
                          setLinkCopied(true);
                          setTimeout(() => setLinkCopied(false), 2000);
                        }}
                        className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden group/copy border shadow-lg ${
                          linkCopied
                            ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white border-green-600/50 shadow-green-600/30'
                            : 'bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white border-red-600/50 shadow-red-600/30 hover:shadow-red-600/50'
                        }`}
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none"></div>
                        <span className="relative">{linkCopied ? '✓ Copied' : 'Copy'}</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      const message = encodeURIComponent(
                        `🎯 ${team?.name}\n\nYou're invited to join the team!\n\nClick here to accept: ${generatedInviteLink}`
                      );
                      window.open(`https://wa.me/?text=${message}`, '_blank');
                    }}
                    className="relative w-full px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50 overflow-hidden group/whatsapp"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/whatsapp:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">📱</span>
                    <span className="relative">Share via WhatsApp</span>
                  </button>

                  <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-3 border border-gray-700 overflow-hidden group/tip">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none"></div>
                    <p className="text-xs text-gray-300 relative">
                      💡 <strong>Tip:</strong> You can also copy the link and share it via email, text message, or any other messaging app.
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6 relative">
                {!generatedInviteLink ? (
                  <>
                    <button
                      onClick={() => {
                        setShowInviteModal(false);
                        setInviteEmail('');
                        setInviteRole('player');
                        setInvitingPlayerId(null);
                        setGeneratedInviteLink(null);
                        setLinkCopied(false);
                      }}
                      className="relative flex-1 px-6 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 text-gray-300 hover:text-white rounded-lg font-medium overflow-hidden group/cancel shadow-lg hover:border-gray-600"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Cancel</span>
                    </button>
                    <button
                      onClick={async () => {
                    if (!team) return;

                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        alert('Please log in to send invites');
                        return;
                      }

                      const response = await fetch(`/api/teams/${team.id}/invite`, {
                        method: 'POST',
                        headers: {
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${session.access_token}`
                        },
                        body: JSON.stringify({
                          playerSubmissionId: invitingPlayerId || undefined,
                          email: inviteEmail || undefined,
                          role: inviteRole
                        })
                      });

                      const data = await response.json();

                      console.log('[Invite] Response:', data);

                      if (!response.ok) {
                        alert(data.error || 'Failed to send invite');
                        return;
                      }

                      console.log('[Invite] Generated link:', data.invite.link);

                      // Show the generated link in the modal
                      setGeneratedInviteLink(data.invite.link);

                      // Reload members to show updated status
                      await loadMembers(team.id);
                    } catch (error) {
                      console.error('[Invite] Error:', error);
                      alert('Failed to send invite');
                    }
                  }}
                      className="relative flex-1 px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/send"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity pointer-events-none"></div>
                      <span className="relative">Send Invite</span>
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => {
                      setShowInviteModal(false);
                      setInviteEmail('');
                      setInviteRole('player');
                      setInvitingPlayerId(null);
                      setGeneratedInviteLink(null);
                      setLinkCopied(false);
                    }}
                    className="relative w-full px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/done"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/done:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Done</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
