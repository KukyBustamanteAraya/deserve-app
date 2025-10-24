'use client';

import { useState } from 'react';
import type { TeamSettings, ApprovalMode, PlayerInfoMode } from '@/types/team-settings';
import { PaymentSettingsCard } from '@/components/team/PaymentSettingsCard';
import { TeamInfoSection } from './components/TeamInfoSection';
import { AccessControlSection } from './components/AccessControlSection';
import { BrandingSection } from '../shared/components/BrandingSection';
import { MemberManagementSection } from '../shared/components/MemberManagementSection';
import { InviteMemberModal } from '../shared/components/InviteMemberModal';

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

interface Member {
  id: string;
  type: string;
  display_name: string;
  role: string | null;
  status: string;
  user_id: string | null;
  player_submission_id: string | null;
  email?: string;
  created_at: string;
}

interface Sport {
  id: string;
  slug: string;
  name: string;
}

interface SingleTeamSettingsProps {
  team: Team;
  settings: TeamSettings;
  user: any;
  members: Member[];
  sports: Sport[];
  sportsLoading: boolean;
  saving: boolean;
  uploadingLogo: boolean;
  uploadingBanner: boolean;
  showPrimaryPicker: boolean;
  showSecondaryPicker: boolean;
  showTertiaryPicker: boolean;
  showInviteModal: boolean;
  inviteEmail: string;
  inviteRole: 'manager' | 'player';
  invitingPlayerId: string | null;
  generatedInviteLink: string | null;
  linkCopied: boolean;
  onTeamChange: (updates: Partial<Team>) => void;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
  onSetShowPrimaryPicker: (show: boolean) => void;
  onSetShowSecondaryPicker: (show: boolean) => void;
  onSetShowTertiaryPicker: (show: boolean) => void;
  onSetShowInviteModal: (show: boolean) => void;
  onSetInviteEmail: (email: string) => void;
  onSetInviteRole: (role: 'manager' | 'player') => void;
  onSetInvitingPlayerId: (id: string | null) => void;
  onSetGeneratedInviteLink: (link: string | null) => void;
  onSetLinkCopied: (copied: boolean) => void;
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
  onSave: () => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onChangeRole: (userId: string, newRole: 'owner' | 'manager' | 'player') => void;
  onRemoveMember: (userId: string) => void;
  onLoadMembers: (teamId: string) => Promise<void>;
  supabase: any;
  slug: string;
  onBackClick: () => void;
}

export function SingleTeamSettings({
  team,
  settings,
  user,
  members,
  sports,
  sportsLoading,
  saving,
  uploadingLogo,
  uploadingBanner,
  showPrimaryPicker,
  showSecondaryPicker,
  showTertiaryPicker,
  showInviteModal,
  inviteEmail,
  inviteRole,
  invitingPlayerId,
  generatedInviteLink,
  linkCopied,
  onTeamChange,
  onSettingsChange,
  onSetShowPrimaryPicker,
  onSetShowSecondaryPicker,
  onSetShowTertiaryPicker,
  onSetShowInviteModal,
  onSetInviteEmail,
  onSetInviteRole,
  onSetInvitingPlayerId,
  onSetGeneratedInviteLink,
  onSetLinkCopied,
  onUpdateTeamInfo,
  onSave,
  onLogoUpload,
  onBannerUpload,
  onChangeRole,
  onRemoveMember,
  onLoadMembers,
  supabase,
  slug,
  onBackClick,
}: SingleTeamSettingsProps) {
  const handleCloseModal = () => {
    onSetShowInviteModal(false);
    onSetInviteEmail('');
    onSetInviteRole('player');
    onSetInvitingPlayerId(null);
    onSetGeneratedInviteLink(null);
    onSetLinkCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
      {/* Team Header Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={onBackClick}
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
          <TeamInfoSection
            team={team}
            sports={sports}
            sportsLoading={sportsLoading}
            onTeamChange={onTeamChange}
            onUpdateTeamInfo={onUpdateTeamInfo}
          />

          {/* Team Branding - Shared Component */}
          <BrandingSection
            settings={settings}
            language="en"
            showBanner={true}
            showTips={true}
            uploadingLogo={uploadingLogo}
            uploadingBanner={uploadingBanner}
            showPrimaryPicker={showPrimaryPicker}
            showSecondaryPicker={showSecondaryPicker}
            showTertiaryPicker={showTertiaryPicker}
            setShowPrimaryPicker={onSetShowPrimaryPicker}
            setShowSecondaryPicker={onSetShowSecondaryPicker}
            setShowTertiaryPicker={onSetShowTertiaryPicker}
            onSettingsChange={onSettingsChange}
            onLogoUpload={onLogoUpload}
            onBannerUpload={onBannerUpload}
          />

          {/* Team Members & Roles - Shared Component */}
          <MemberManagementSection
            members={members}
            user={user}
            variant="detailed"
            language="en"
            onShowInviteModal={() => onSetShowInviteModal(true)}
            onRemoveMember={onRemoveMember}
            onChangeRole={onChangeRole}
            onSetInvitingPlayerId={onSetInvitingPlayerId}
          />

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
                  onChange={(e) => onSettingsChange({ approval_mode: e.target.value as ApprovalMode })}
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
                    onChange={(e) => onSettingsChange({ min_approvals_required: parseInt(e.target.value) })}
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
                  onChange={(e) => onSettingsChange({ player_info_mode: e.target.value as PlayerInfoMode })}
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
                    onChange={(e) => onSettingsChange({ self_service_enabled: e.target.checked })}
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
            onPaymentModeChange={(mode) => onSettingsChange({ payment_mode: mode })}
          />

          {/* Access Control Settings */}
          <AccessControlSection
            settings={settings}
            onSettingsChange={onSettingsChange}
          />

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
                  onChange={(e) => onSettingsChange({ notify_on_design_ready: e.target.checked })}
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
                  onChange={(e) => onSettingsChange({ notify_on_vote_required: e.target.checked })}
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
              onClick={onBackClick}
              className="relative px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel shadow-lg"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Cancel</span>
            </button>
            <button
              onClick={onSave}
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

      {/* Invite Member Modal - Shared Component */}
      <InviteMemberModal
        show={showInviteModal}
        team={team}
        inviteEmail={inviteEmail}
        inviteRole={inviteRole}
        generatedInviteLink={generatedInviteLink}
        linkCopied={linkCopied}
        language="en"
        supabase={supabase}
        onClose={handleCloseModal}
        onEmailChange={onSetInviteEmail}
        onRoleChange={onSetInviteRole}
        onSetGeneratedInviteLink={onSetGeneratedInviteLink}
        onSetLinkCopied={onSetLinkCopied}
        onLoadMembers={onLoadMembers}
      />
    </div>
  );
}
