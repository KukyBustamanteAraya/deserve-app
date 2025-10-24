'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { TeamSettings, ApprovalMode, PlayerInfoMode, AccessMode, PaymentMode } from '@/types/team-settings';
import { logger } from '@/lib/logger';
import { useSports } from '@/hooks/api/useSports';
import { getSportInfo } from '@/lib/sports/sportsMapping';
import { InstitutionSettings } from './institution/InstitutionSettings';
import { SingleTeamSettings } from './single-team/SingleTeamSettings';
import { useTeamSettingsData } from './shared/hooks/useTeamSettingsData';
import { useFileUploads } from './shared/hooks/useFileUploads';
import { useTeamHandlers } from './shared/hooks/useTeamHandlers';

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
  const { slug } = params;
  const router = useRouter();
  const supabase = getBrowserClient();
  const { sports, isLoading: sportsLoading } = useSports();

  // Hook 1: Data loading and state management
  const {
    team,
    setTeam,
    settings,
    setSettings,
    user,
    loading,
    isOwner,
    members,
    setMembers,
    loadData,
    loadMembers,
  } = useTeamSettingsData(slug, supabase);

  // Hook 2: File upload handlers
  const {
    uploadingLogo,
    uploadingBanner,
    handleLogoUpload,
    handleBannerUpload,
  } = useFileUploads({ team, settings, setSettings, supabase });

  // Hook 3: Team action handlers
  const {
    saving,
    handleChangeRole,
    handleRemoveMember,
    handleUpdateTeamInfo,
    handleSave,
  } = useTeamHandlers({
    team,
    setTeam,
    settings,
    sports,
    members,
    loadMembers,
    supabase,
  });

  // Local UI state (not extracted to hooks)
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'player'>('player');
  const [invitingPlayerId, setInvitingPlayerId] = useState<string | null>(null);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showPrimaryPicker, setShowPrimaryPicker] = useState(false);
  const [showSecondaryPicker, setShowSecondaryPicker] = useState(false);
  const [showTertiaryPicker, setShowTertiaryPicker] = useState(false);

  useEffect(() => {
    loadData();
  }, [slug]);

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

  // Route to appropriate component based on team type
  if (team.team_type === 'institution') {
    return (
      <InstitutionSettings
        team={team}
        settings={settings}
        user={user}
        members={members}
        slug={slug}
        onTeamChange={(updates) => setTeam({ ...team, ...updates })}
        onSettingsChange={(updates) => setSettings({ ...settings, ...updates })}
        onUpdateTeamInfo={handleUpdateTeamInfo}
        onSave={handleSave}
        onLogoUpload={handleLogoUpload}
        onRemoveMember={handleRemoveMember}
        onLoadMembers={loadMembers}
        onNavigateBack={() => router.push(`/mi-equipo/${slug}`)}
        showPrimaryPicker={showPrimaryPicker}
        setShowPrimaryPicker={setShowPrimaryPicker}
        showSecondaryPicker={showSecondaryPicker}
        setShowSecondaryPicker={setShowSecondaryPicker}
        showTertiaryPicker={showTertiaryPicker}
        setShowTertiaryPicker={setShowTertiaryPicker}
        uploadingLogo={uploadingLogo}
        saving={saving}
        showInviteModal={showInviteModal}
        setShowInviteModal={setShowInviteModal}
        inviteEmail={inviteEmail}
        setInviteEmail={setInviteEmail}
        inviteRole={inviteRole}
        setInviteRole={setInviteRole}
        generatedInviteLink={generatedInviteLink}
        setGeneratedInviteLink={setGeneratedInviteLink}
        linkCopied={linkCopied}
        setLinkCopied={setLinkCopied}
        supabase={supabase}
      />
    );
  }

  // Single team settings
  return (
    <SingleTeamSettings
      team={team}
      settings={settings}
      user={user}
      members={members}
      sports={sports}
      sportsLoading={sportsLoading}
      slug={slug}
      onTeamChange={(updates) => setTeam({ ...team, ...updates })}
      onSettingsChange={(updates) => setSettings({ ...settings, ...updates })}
      onUpdateTeamInfo={handleUpdateTeamInfo}
      onSave={handleSave}
      onLogoUpload={handleLogoUpload}
      onBannerUpload={handleBannerUpload}
      onChangeRole={handleChangeRole}
      onRemoveMember={handleRemoveMember}
      onLoadMembers={loadMembers}
      onBackClick={() => router.push(`/mi-equipo/${slug}`)}
      showPrimaryPicker={showPrimaryPicker}
      onSetShowPrimaryPicker={setShowPrimaryPicker}
      showSecondaryPicker={showSecondaryPicker}
      onSetShowSecondaryPicker={setShowSecondaryPicker}
      showTertiaryPicker={showTertiaryPicker}
      onSetShowTertiaryPicker={setShowTertiaryPicker}
      uploadingLogo={uploadingLogo}
      uploadingBanner={uploadingBanner}
      saving={saving}
      showInviteModal={showInviteModal}
      onSetShowInviteModal={setShowInviteModal}
      inviteEmail={inviteEmail}
      onSetInviteEmail={setInviteEmail}
      inviteRole={inviteRole}
      onSetInviteRole={setInviteRole}
      invitingPlayerId={invitingPlayerId}
      onSetInvitingPlayerId={setInvitingPlayerId}
      generatedInviteLink={generatedInviteLink}
      onSetGeneratedInviteLink={setGeneratedInviteLink}
      linkCopied={linkCopied}
      onSetLinkCopied={setLinkCopied}
      supabase={supabase}
    />
  );
}
