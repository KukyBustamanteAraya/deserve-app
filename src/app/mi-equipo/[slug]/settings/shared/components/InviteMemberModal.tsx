'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

interface Team {
  id: string;
  name: string;
}

interface InviteMemberModalProps {
  show: boolean;
  team: Team | null;
  inviteEmail: string;
  inviteRole: 'manager' | 'player';
  generatedInviteLink: string | null;
  linkCopied: boolean;
  language?: 'en' | 'es';
  supabase: SupabaseClient;
  onClose: () => void;
  onEmailChange: (email: string) => void;
  onRoleChange: (role: 'manager' | 'player') => void;
  onSetGeneratedInviteLink: (link: string | null) => void;
  onSetLinkCopied: (copied: boolean) => void;
  onLoadMembers: (teamId: string) => Promise<void>;
}

export function InviteMemberModal({
  show,
  team,
  inviteEmail,
  inviteRole,
  generatedInviteLink,
  linkCopied,
  language = 'en',
  supabase,
  onClose,
  onEmailChange,
  onRoleChange,
  onSetGeneratedInviteLink,
  onSetLinkCopied,
  onLoadMembers,
}: InviteMemberModalProps) {
  const text = {
    en: {
      title: 'Invite Team Member',
      emailLabel: 'Email Address (Optional)',
      emailPlaceholder: 'teammate@example.com',
      emailHelp: 'Optional - for record keeping. Email sending not yet implemented.',
      roleLabel: 'Role',
      roleManager: '⚙️ Manager - Can manage settings and approve designs',
      rolePlayer: '⚽ Player - Can submit info and view team',
      linkInfo: '🔗 You\'ll receive an invite link to share with the player via WhatsApp, text, etc.',
      successTitle: 'Invite Created Successfully!',
      successDescription: 'Share this link with the player. It expires in 7 days.',
      inviteLinkLabel: 'Invite Link',
      copyButton: 'Copy',
      copiedButton: '✓ Copied',
      whatsappButton: '📱 Share via WhatsApp',
      whatsappMessage: '🎯 {teamName}\n\nYou\'re invited to join the team!\n\nClick here to accept: {link}',
      tipHeading: '💡 Tip:',
      tipText: 'You can also copy the link and share it via email, text message, or any other messaging app.',
      cancelButton: 'Cancel',
      sendButton: 'Send Invite',
      doneButton: 'Done',
      loginError: 'Please log in to send invitations',
      inviteError: 'Error sending invitation',
    },
    es: {
      title: 'Invitar Personal',
      emailLabel: 'Email (Opcional)',
      emailPlaceholder: 'persona@ejemplo.com',
      emailHelp: 'Opcional - para registro. Envío de email no implementado aún.',
      roleLabel: 'Rol',
      roleManager: '⚙️ Administrador - Gestionar programas',
      rolePlayer: '👤 Miembro - Ver información',
      linkInfo: '🔗 Recibirás un enlace para compartir vía WhatsApp, mensaje, etc.',
      successTitle: '¡Invitación Creada!',
      successDescription: 'Comparte este enlace. Expira en 7 días.',
      inviteLinkLabel: 'Enlace de Invitación',
      copyButton: 'Copiar',
      copiedButton: '✓ Copiado',
      whatsappButton: '📱 Compartir por WhatsApp',
      whatsappMessage: '🎯 {teamName}\n\n¡Estás invitado a unirte al equipo!\n\nHaz clic aquí para aceptar: {link}',
      tipHeading: '💡 Consejo:',
      tipText: 'También puedes copiar el enlace y compartirlo por email, mensaje de texto o cualquier otra app de mensajería.',
      cancelButton: 'Cancelar',
      sendButton: 'Enviar Invitación',
      doneButton: 'Listo',
      loginError: 'Por favor inicia sesión para enviar invitaciones',
      inviteError: 'Error al enviar invitación',
    },
  };

  const t = text[language];

  const handleSendInvite = async () => {
    if (!team) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert(t.loginError);
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
        alert(data.error || t.inviteError);
        return;
      }

      onSetGeneratedInviteLink(data.invite.link);
      await onLoadMembers(team.id);
    } catch (error) {
      console.error('[Invite] Error:', error);
      alert(t.inviteError);
    }
  };

  const handleCopyLink = () => {
    if (!generatedInviteLink) return;
    navigator.clipboard.writeText(generatedInviteLink);
    onSetLinkCopied(true);
    setTimeout(() => onSetLinkCopied(false), 2000);
  };

  const handleWhatsAppShare = () => {
    if (!generatedInviteLink || !team) return;
    const message = encodeURIComponent(
      t.whatsappMessage
        .replace('{teamName}', team.name)
        .replace('{link}', generatedInviteLink)
    );
    window.open(`https://wa.me/?text=${message}`, '_blank');
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-md w-full p-6 border border-gray-700 overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        {/* Header */}
        <div className="flex justify-between items-center mb-4 relative">
          <h2 className="text-2xl font-bold text-white">{t.title}</h2>
          <button
            onClick={onClose}
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
              {/* Email Input */}
              <div className="relative">
                <label className="block text-sm font-medium text-white mb-2">
                  {t.emailLabel}
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => onEmailChange(e.target.value)}
                  placeholder={t.emailPlaceholder}
                  className="w-full px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                />
                <p className="text-xs text-gray-400 mt-1">
                  {t.emailHelp}
                </p>
              </div>

              {/* Role Selector */}
              <div className="relative">
                <label className="block text-sm font-medium text-white mb-2">
                  {t.roleLabel}
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => onRoleChange(e.target.value as 'manager' | 'player')}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                >
                  <option value="manager" className="bg-black text-white">{t.roleManager}</option>
                  <option value="player" className="bg-black text-white">{t.rolePlayer}</option>
                </select>
              </div>

              {/* Info Box */}
              <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg p-3 border border-gray-600 overflow-hidden group/info">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
                <p className="text-sm text-gray-300 relative">
                  {t.linkInfo}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-4 relative">
              {/* Success Message */}
              <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 overflow-hidden group/success">
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover/success:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="flex items-center gap-2 mb-2 relative">
                  <span className="text-2xl">✅</span>
                  <h3 className="font-semibold text-green-200">{t.successTitle}</h3>
                </div>
                <p className="text-sm text-green-200 relative">
                  {t.successDescription}
                </p>
              </div>

              {/* Invite Link */}
              <div className="relative">
                <label className="block text-sm font-medium text-white mb-2">
                  {t.inviteLinkLabel}
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={generatedInviteLink}
                    readOnly
                    className="flex-1 px-4 py-3 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg text-white text-sm font-mono"
                  />
                  <button
                    onClick={handleCopyLink}
                    className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden group/copy border shadow-lg ${
                      linkCopied
                        ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white border-green-600/50 shadow-green-600/30'
                        : 'bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white border-red-600/50 shadow-red-600/30 hover:shadow-red-600/50'
                    }`}
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">{linkCopied ? t.copiedButton : t.copyButton}</span>
                  </button>
                </div>
              </div>

              {/* WhatsApp Share Button */}
              <button
                onClick={handleWhatsAppShare}
                className="relative w-full px-6 py-3 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium flex items-center justify-center gap-2 border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50 overflow-hidden group/whatsapp"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/whatsapp:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{t.whatsappButton}</span>
              </button>

              {/* Tip Box */}
              <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-3 border border-gray-700 overflow-hidden group/tip">
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/tip:opacity-100 transition-opacity pointer-events-none"></div>
                <p className="text-xs text-gray-300 relative">
                  <strong>{t.tipHeading}</strong> {t.tipText}
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 relative">
            {!generatedInviteLink ? (
              <>
                <button
                  onClick={onClose}
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 text-gray-300 hover:text-white rounded-lg font-medium overflow-hidden group/cancel shadow-lg hover:border-gray-600"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{t.cancelButton}</span>
                </button>
                <button
                  onClick={handleSendInvite}
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/send"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/send:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{t.sendButton}</span>
                </button>
              </>
            ) : (
              <button
                onClick={onClose}
                className="relative w-full px-6 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/done"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/done:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">{t.doneButton}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
