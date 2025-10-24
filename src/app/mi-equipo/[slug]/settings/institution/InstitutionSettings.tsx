'use client';

import type { TeamSettings, ApprovalMode } from '@/types/team-settings';
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

interface InstitutionSettingsProps {
  team: Team;
  settings: TeamSettings;
  user: any;
  members: any[];
  slug: string;
  // State setters
  onTeamChange: (updates: Partial<Team>) => void;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
  // Handlers
  onUpdateTeamInfo: (field: 'name' | 'sport', value: string) => Promise<void>;
  onSave: () => Promise<void>;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onRemoveMember: (userId: string) => Promise<void>;
  onLoadMembers: (teamId: string) => Promise<void>;
  onNavigateBack: () => void;
  // UI state
  showPrimaryPicker: boolean;
  setShowPrimaryPicker: (show: boolean) => void;
  showSecondaryPicker: boolean;
  setShowSecondaryPicker: (show: boolean) => void;
  showTertiaryPicker: boolean;
  setShowTertiaryPicker: (show: boolean) => void;
  uploadingLogo: boolean;
  saving: boolean;
  // Invite modal state
  showInviteModal: boolean;
  setShowInviteModal: (show: boolean) => void;
  inviteEmail: string;
  setInviteEmail: (email: string) => void;
  inviteRole: 'manager' | 'player';
  setInviteRole: (role: 'manager' | 'player') => void;
  generatedInviteLink: string | null;
  setGeneratedInviteLink: (link: string | null) => void;
  linkCopied: boolean;
  setLinkCopied: (copied: boolean) => void;
  supabase: any;
}

export function InstitutionSettings({
  team,
  settings,
  user,
  members,
  slug,
  onTeamChange,
  onSettingsChange,
  onUpdateTeamInfo,
  onSave,
  onLogoUpload,
  onRemoveMember,
  onLoadMembers,
  onNavigateBack,
  showPrimaryPicker,
  setShowPrimaryPicker,
  showSecondaryPicker,
  setShowSecondaryPicker,
  showTertiaryPicker,
  setShowTertiaryPicker,
  uploadingLogo,
  saving,
  showInviteModal,
  setShowInviteModal,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  generatedInviteLink,
  setGeneratedInviteLink,
  linkCopied,
  setLinkCopied,
  supabase
}: InstitutionSettingsProps) {
  const handleCloseModal = () => {
    setShowInviteModal(false);
    setInviteEmail('');
    setInviteRole('player');
    setGeneratedInviteLink(null);
    setLinkCopied(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 py-8">
      {/* Institution Header Banner */}
      <div className="max-w-4xl mx-auto px-4 mb-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow */}
          <button
            onClick={onNavigateBack}
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
                    onChange={(e) => onTeamChange({ name: e.target.value })}
                    className="flex-1 px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  />
                  <button
                    onClick={() => onUpdateTeamInfo('name', team.name)}
                    className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium overflow-hidden group/btn border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">Actualizar</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Institution Branding - Shared Component */}
          <BrandingSection
            settings={settings}
            language="es"
            showBanner={false}
            showTips={false}
            uploadingLogo={uploadingLogo}
            showPrimaryPicker={showPrimaryPicker}
            showSecondaryPicker={showSecondaryPicker}
            showTertiaryPicker={showTertiaryPicker}
            setShowPrimaryPicker={setShowPrimaryPicker}
            setShowSecondaryPicker={setShowSecondaryPicker}
            setShowTertiaryPicker={setShowTertiaryPicker}
            onSettingsChange={onSettingsChange}
            onLogoUpload={onLogoUpload}
          />

          {/* Staff Management - Shared Component */}
          <MemberManagementSection
            members={members}
            user={user}
            variant="simple"
            language="es"
            onShowInviteModal={() => setShowInviteModal(true)}
            onRemoveMember={onRemoveMember}
          />

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
                  onChange={(e) => onSettingsChange({ approval_mode: e.target.value as ApprovalMode })}
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
                      onChange={(e) => onSettingsChange({ allow_member_invites: e.target.checked })}
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
                      onChange={(e) => onSettingsChange({ self_service_enabled: e.target.checked })}
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
              onClick={onNavigateBack}
              className="relative px-6 py-3 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel shadow-lg"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">Cancelar</span>
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="relative px-6 py-3 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/save disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/save:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
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
        language="es"
        supabase={supabase}
        onClose={handleCloseModal}
        onEmailChange={setInviteEmail}
        onRoleChange={setInviteRole}
        onSetGeneratedInviteLink={setGeneratedInviteLink}
        onSetLinkCopied={setLinkCopied}
        onLoadMembers={onLoadMembers}
      />
    </div>
  );
}
