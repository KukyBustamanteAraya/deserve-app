'use client';

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

interface MemberManagementSectionProps {
  members: Member[];
  user: any;
  variant?: 'simple' | 'detailed';
  language?: 'en' | 'es';
  onShowInviteModal: () => void;
  onRemoveMember: (userId: string) => void;
  onChangeRole?: (userId: string, newRole: 'owner' | 'manager' | 'player') => void;
  onSetInvitingPlayerId?: (id: string | null) => void;
}

export function MemberManagementSection({
  members,
  user,
  variant = 'detailed',
  language = 'en',
  onShowInviteModal,
  onRemoveMember,
  onChangeRole,
  onSetInvitingPlayerId,
}: MemberManagementSectionProps) {
  const text = {
    en: {
      title: 'Team Members & Roles',
      description: 'Manage who has access to your team and their permissions',
      addButton: 'Invite Member',
      addButtonIcon: '+',
      noMembers: 'No members or players yet',
      you: '(You)',
      remove: 'Remove',
      inviteToApp: '📧 Invite to App',
      resend: 'Resend',
      addToTeam: '➕ Add to Team',
      invitationSent: 'Invitation sent',
      roleOwner: '👑 Owner',
      roleManager: '⚙️ Manager',
      rolePlayer: '⚽ Player',
      selectOwner: 'Manager (Owner)',
      selectManager: 'Manager',
      selectPlayer: 'Player',
      statusActive: 'Active Member',
      statusInvited: 'Invited (Pending)',
      statusRoster: 'Roster Only',
      statusHasAccount: 'Has Account (Not Member)',
      helpHeading: 'Understanding Member Status:',
      helpActive: '🟢 Active Member: Has app account and is part of your team. Can access team features based on their role.',
      helpInvited: '🟡 Invited (Pending): Invitation sent but not yet accepted. Can resend invitation.',
      helpRoster: '⚪ Roster Only: Player on your roster but hasn\'t created an app account yet. Click "Invite to App" to send them an invitation link.',
      helpHasAccount: '🟣 Has Account (Not Member): Player has an app account but isn\'t a team member yet. Click "Add to Team" to add them.',
      permissionsHeading: 'Role Permissions:',
      permissionsOwner: '👑 Owner/Manager: Full control - manage settings, approve designs, manage members',
      permissionsPlayer: '⚽ Player: Submit player info, view designs, participate in votes',
    },
    es: {
      title: '👥 Personal Administrativo',
      description: 'Gestionar staff y roles institucionales',
      addButton: 'Agregar Personal',
      addButtonIcon: '+',
      noMembers: 'No hay miembros aún',
      you: '(Tú)',
      remove: 'Remover',
      inviteToApp: '📧 Invitar a App',
      resend: 'Reenviar',
      addToTeam: '➕ Agregar al Equipo',
      invitationSent: 'Invitación enviada',
      roleOwner: '👑 Director',
      roleManager: '⚙️ Administrador',
      rolePlayer: '⚽ Miembro',
      selectOwner: 'Director Atlético',
      selectManager: 'Administrador',
      selectPlayer: 'Miembro',
      statusActive: 'Miembro Activo',
      statusInvited: 'Invitado (Pendiente)',
      statusRoster: 'Solo en Roster',
      statusHasAccount: 'Tiene Cuenta (No Miembro)',
      helpHeading: 'Comprender Estado del Miembro:',
      helpActive: '🟢 Miembro Activo: Tiene cuenta de app y es parte de tu equipo. Puede acceder a funciones según su rol.',
      helpInvited: '🟡 Invitado (Pendiente): Invitación enviada pero no aceptada. Puede reenviar invitación.',
      helpRoster: '⚪ Solo Roster: Jugador en tu roster pero no ha creado cuenta de app. Haz clic en "Invitar a App" para enviar enlace.',
      helpHasAccount: '🟣 Tiene Cuenta (No Miembro): Jugador tiene cuenta pero no es miembro aún. Haz clic en "Agregar al Equipo".',
      permissionsHeading: 'Permisos de Roles:',
      permissionsOwner: '👑 Director/Administrador: Control total - gestionar configuración, aprobar diseños, gestionar miembros',
      permissionsPlayer: '⚽ Miembro: Enviar información, ver diseños, participar en votaciones',
    },
  };

  const t = text[language];

  // Filter members based on variant
  const displayMembers = variant === 'simple'
    ? members.filter(m => m.status === 'Active Member')
    : members;

  // Add button color based on language/variant
  const addButtonColor = language === 'es'
    ? 'from-blue-600/90 via-blue-700/80 to-blue-800/90 border-blue-600/50 shadow-blue-600/30 hover:shadow-blue-600/50'
    : 'from-red-600/90 via-red-700/80 to-red-800/90 border-red-600/50 shadow-red-600/30 hover:shadow-red-600/50';

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

      {variant === 'detailed' ? (
        <>
          {/* Detailed Header */}
          <div className="flex items-center justify-between mb-4 relative">
            <div>
              <h2 className="text-xl font-semibold text-white">{t.title}</h2>
              <p className="text-gray-300 text-sm mt-1">{t.description}</p>
            </div>
            <button
              onClick={onShowInviteModal}
              className={`relative px-4 py-2 bg-gradient-to-br ${addButtonColor} text-white rounded-lg font-medium flex items-center gap-2 border shadow-lg overflow-hidden group/invite`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/invite:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative">{t.addButtonIcon}</span>
              <span className="relative">{t.addButton}</span>
            </button>
          </div>
        </>
      ) : (
        <>
          {/* Simple Header */}
          <h2 className="text-xl font-semibold text-white mb-4 relative">{t.title}</h2>
          <p className="text-gray-300 text-sm mb-4 relative">{t.description}</p>
        </>
      )}

      {/* Members List */}
      <div className={`${variant === 'detailed' ? 'mt-4' : ''} space-y-${variant === 'simple' ? '4' : '3'} relative`}>
        {displayMembers.length === 0 ? (
          <p className="text-gray-400 text-center py-8">{t.noMembers}</p>
        ) : (
          displayMembers.map((member) => (
            <div
              key={member.id}
              className="relative flex items-center justify-between p-4 border border-gray-700 rounded-lg bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 overflow-hidden group/member hover:border-gray-600 transition-all"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/member:opacity-100 transition-opacity pointer-events-none"></div>

              <div className="flex-1 relative">
                <div className="font-medium text-white">
                  {member.display_name}
                  {member.user_id === user?.id && (
                    <span className="ml-2 text-xs text-gray-400">{t.you}</span>
                  )}
                </div>

                {variant === 'simple' ? (
                  // Simple: Just show role text
                  <div className="mt-1">
                    <span className="text-xs text-gray-400">
                      {member.role === 'owner' ? t.selectOwner : member.role === 'manager' ? t.selectManager : t.selectPlayer}
                    </span>
                  </div>
                ) : (
                  // Detailed: Show status badge
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
                )}
              </div>

              <div className="flex items-center gap-3 relative">
                {variant === 'simple' ? (
                  // Simple: Just remove button
                  member.user_id !== user?.id && (
                    <button
                      onClick={() => member.user_id && onRemoveMember(member.user_id)}
                      className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                    >
                      {t.remove}
                    </button>
                  )
                ) : (
                  // Detailed: Conditional actions based on status
                  <>
                    {/* Active Member Actions */}
                    {member.status === 'Active Member' && (
                      <>
                        {/* Role Selector */}
                        {onChangeRole && (
                          <select
                            value={member.role || 'player'}
                            onChange={(e) => member.user_id && onChangeRole(member.user_id, e.target.value as 'owner' | 'manager' | 'player')}
                            disabled={member.user_id === user?.id}
                            className="px-3 py-1 border border-gray-700 rounded-lg text-sm bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <option value="owner" className="bg-black text-white">{t.selectOwner}</option>
                            <option value="manager" className="bg-black text-white">{t.selectManager}</option>
                            <option value="player" className="bg-black text-white">{t.selectPlayer}</option>
                          </select>
                        )}

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
                          {member.role === 'owner' ? t.roleOwner : member.role === 'manager' ? t.roleManager : t.rolePlayer}
                        </span>

                        {/* Remove Button */}
                        {member.user_id !== user?.id && (
                          <button
                            onClick={() => member.user_id && onRemoveMember(member.user_id)}
                            className="text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                          >
                            {t.remove}
                          </button>
                        )}
                      </>
                    )}

                    {/* Roster Only - Show Invite Button */}
                    {member.status === 'Roster Only' && onSetInvitingPlayerId && (
                      <button
                        onClick={() => {
                          onSetInvitingPlayerId(member.player_submission_id);
                          onShowInviteModal();
                        }}
                        className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-sm border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/btn"
                        style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                        <span className="relative">{t.inviteToApp}</span>
                      </button>
                    )}

                    {/* Invited (Pending) - Show Resend Button */}
                    {member.status === 'Invited (Pending)' && onSetInvitingPlayerId && (
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-400">{t.invitationSent}</span>
                        <button
                          onClick={() => {
                            onSetInvitingPlayerId(member.player_submission_id);
                            onShowInviteModal();
                          }}
                          className="px-3 py-1 text-red-400 hover:text-red-300 text-sm font-medium transition-colors"
                        >
                          {t.resend}
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
                        <span className="relative">{t.addToTeam}</span>
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Simple variant: Add button at bottom */}
      {variant === 'simple' && (
        <button
          onClick={onShowInviteModal}
          className={`relative w-full mt-4 px-4 py-3 bg-gradient-to-br ${addButtonColor} text-white rounded-lg font-medium flex items-center justify-center gap-2 border shadow-lg overflow-hidden group/add`}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/add:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">{t.addButtonIcon}</span>
          <span className="relative">{t.addButton}</span>
        </button>
      )}

      {/* Detailed variant: Help text */}
      {variant === 'detailed' && (
        <div className="relative mt-6 p-4 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg border border-gray-600 overflow-hidden group/help">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/help:opacity-100 transition-opacity pointer-events-none"></div>
          <h3 className="text-sm font-semibold text-white mb-2 relative">{t.helpHeading}</h3>
          <div className="space-y-2 text-sm text-gray-300 relative">
            <div><strong>{t.helpActive.split(':')[0]}:</strong> {t.helpActive.split(':')[1]}</div>
            <div><strong>{t.helpInvited.split(':')[0]}:</strong> {t.helpInvited.split(':')[1]}</div>
            <div><strong>{t.helpRoster.split(':')[0]}:</strong> {t.helpRoster.split(':')[1]}</div>
            <div><strong>{t.helpHasAccount.split(':')[0]}:</strong> {t.helpHasAccount.split(':')[1]}</div>
          </div>
          <div className="mt-3 pt-3 border-t border-gray-600 relative">
            <h3 className="text-sm font-semibold text-white mb-2">{t.permissionsHeading}</h3>
            <div className="space-y-1 text-sm text-gray-300">
              <div><strong>{t.permissionsOwner.split(':')[0]}:</strong> {t.permissionsOwner.split(':')[1]}</div>
              <div><strong>{t.permissionsPlayer.split(':')[0]}:</strong> {t.permissionsPlayer.split(':')[1]}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
