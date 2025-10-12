'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { SplitPayButton } from '@/components/payment/SplitPayButton';
import { DesignApprovalCard } from '@/components/design/DesignApprovalCard';
import type { TeamWithDetails, UserPermissions } from '@/types/team-hub';
import { logger } from '@/lib/logger';

interface TeamMember {
  user_id: string;
  role_type: string;
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  created_at: string;
  output_url?: string;
  mockup_urls?: string[];
  render_spec?: any;
  approval_status?: string;
  revision_count?: number;
}

interface ManagerDashboardProps {
  team: TeamWithDetails;
  currentUserId: string;
  permissions: UserPermissions;
}

export function TeamManagerView({ team, currentUserId, permissions }: ManagerDashboardProps) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [designRequest, setDesignRequest] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [shareLink, setShareLink] = useState('');

  useEffect(() => {
    loadTeamData();
  }, [team.id]);

  // Poll for design request updates when status is "rendering"
  useEffect(() => {
    if (designRequest?.status === 'rendering') {
      const interval = setInterval(() => {
        loadTeamData();
      }, 5000); // Poll every 5 seconds

      return () => clearInterval(interval);
    }
  }, [designRequest?.status]);

  const loadTeamData = async () => {
    try {
      // Generate share link
      const origin = typeof window !== 'undefined' ? window.location.origin : '';
      setShareLink(`${origin}/join/${team.slug}`);

      // Get team members (simplified - no profile join)
      const { data: membersData, error: membersError } = await supabase
        .from('team_memberships')
        .select('user_id, role_type')
        .eq('team_id', team.id);

      if (membersError) {
        logger.error('Error loading members:', membersError);
      } else {
        setMembers(membersData || []);
      }

      // Get design request with mockup data
      const { data: designData, error: designError } = await supabase
        .from('design_requests')
        .select('id, status, product_name, created_at, output_url, mockup_urls, render_spec, approval_status, revision_count')
        .eq('team_slug', team.slug)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (!designError && designData) {
        setDesignRequest(designData);
      }
    } catch (error) {
      logger.error('Error loading team data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setInviting(true);
    try {
      // Generate invite token
      const token = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Create invite in database
      const { error: dbError } = await supabase
        .from('team_invites')
        .insert({
          team_id: team.id,
          email: inviteEmail,
          token,
        });

      if (dbError) throw dbError;

      // Send email via API route
      const response = await fetch('/api/send-team-invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: inviteEmail,
          teamSlug: team.slug,
          teamName: team.name,
          inviterName: currentUserId,
          token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Error al enviar invitación');
      }

      alert(`¡Invitación enviada a ${inviteEmail}!`);
      setInviteEmail('');
    } catch (error: any) {
      logger.error('Error sending invite:', error);
      alert(error.message || 'Error al enviar invitación. Intenta de nuevo.');
    } finally {
      setInviting(false);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('¡Link copiado!');
  };

  const handleTeamNameChange = async (newName: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .update({ name: newName })
        .eq('id', team.id);

      if (error) throw error;

      // Trigger re-fetch
      loadTeamData();
    } catch (error) {
      logger.error('Error updating team name:', error);
      alert('Error al actualizar el nombre del equipo');
    }
  };

  const handleLogoChange = async (logoDataUrl: string) => {
    try {
      // Note: In production, upload to Supabase Storage
      const { error } = await supabase
        .from('teams')
        .update({ logo_url: logoDataUrl })
        .eq('id', team.id);

      if (error) throw error;

      // Trigger re-fetch
      loadTeamData();
    } catch (error) {
      logger.error('Error updating team logo:', error);
      alert('Error al actualizar el logo del equipo');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando panel de administración...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner with team colors */}
      <CustomizeBanner
        teamName={team.name}
        customColors={team.colors}
        customLogoUrl={team.logo_url}
        onTeamNameChange={handleTeamNameChange}
        onLogoChange={handleLogoChange}
        readonly={false}
      />

      <div className="max-w-5xl mx-auto px-4 py-12 pt-64">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Team Settings Summary */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Configuración del equipo</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Modo de aprobación:</p>
                  <p className="font-semibold capitalize">{team.approval_mode.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Info de jugadores:</p>
                  <p className="font-semibold capitalize">{team.player_info_mode.replace('_', ' ')}</p>
                </div>
                <div>
                  <p className="text-gray-600">Autoservicio:</p>
                  <p className="font-semibold">{team.self_service_enabled ? 'Activado' : 'Desactivado'}</p>
                </div>
                <div>
                  <p className="text-gray-600">Acceso:</p>
                  <p className="font-semibold capitalize">{team.access_mode.replace('_', ' ')}</p>
                </div>
              </div>
              {permissions.canAccessSettings && (
                <button
                  onClick={() => router.push(`/mi-equipo/${team.slug}/settings`)}
                  className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  ⚙️ Cambiar configuración →
                </button>
              )}
            </div>

            {/* Design Status */}
            {designRequest && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Estado del diseño</h2>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-lg font-medium text-gray-900">{designRequest.product_name}</p>
                    <p className="text-sm text-gray-600">
                      Solicitado el {new Date(designRequest.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <span
                    className={`px-4 py-2 rounded-full text-sm font-medium ${
                      designRequest.status === 'ready'
                        ? 'bg-green-100 text-green-800'
                        : designRequest.status === 'rendering'
                        ? 'bg-blue-100 text-blue-800 animate-pulse'
                        : 'bg-yellow-100 text-yellow-800'
                    }`}
                  >
                    {designRequest.status === 'ready' ? '✓ Listo' :
                     designRequest.status === 'rendering' ? '⏳ Generando...' :
                     '📝 Pendiente'}
                  </span>
                </div>

                {/* Rendering Progress */}
                {designRequest.status === 'rendering' && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                      <p className="text-sm font-medium text-blue-900">
                        Tu diseño personalizado está siendo generado con IA...
                      </p>
                    </div>
                    <p className="text-xs text-blue-700">
                      Esto puede tomar 30-60 segundos. La página se actualizará automáticamente.
                    </p>
                  </div>
                )}

                {/* Design Approval Card */}
                {designRequest.status === 'ready' && designRequest.mockup_urls && designRequest.mockup_urls.length > 0 && (
                  <div className="mt-6">
                    <DesignApprovalCard
                      designRequestId={designRequest.id}
                      productName={designRequest.product_name}
                      mockupUrls={designRequest.mockup_urls}
                      approvalStatus={designRequest.approval_status || 'pending'}
                      revisionCount={designRequest.revision_count || 0}
                      onApprovalChange={loadTeamData}
                    />
                    {designRequest.output_url && designRequest.approval_status === 'approved' && (
                      <div className="mt-4 text-center">
                        <a
                          href={designRequest.output_url}
                          download
                          className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                          </svg>
                          Descargar archivos finales
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Team Members */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Miembros del equipo ({members.length})</h2>
              <div className="space-y-3">
                {members.slice(0, 5).map((member) => (
                  <div
                    key={member.user_id}
                    className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-gray-900">
                        {member.user_id === currentUserId ? 'Tú' : `Miembro ${member.user_id.substring(0, 8)}`}
                      </p>
                      <p className="text-sm text-gray-600 capitalize">{member.role_type}</p>
                    </div>
                    {member.user_id === team.owner_id && (
                      <span
                        className="px-2 py-1 text-xs rounded-full font-medium"
                        style={{
                          backgroundColor: `${team.colors.primary}20`,
                          color: team.colors.primary
                        }}
                      >
                        Propietario
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {members.length > 5 && (
                <p className="text-sm text-gray-500 mt-4 text-center">
                  ... y {members.length - 5} miembros más
                </p>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Share Link */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Compartir equipo</h3>
              <p className="text-sm text-gray-600 mb-4">
                Comparte este link para que otros se unan
              </p>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded bg-gray-50"
                />
                <button
                  onClick={copyShareLink}
                  className="px-4 py-2 text-white text-sm rounded transition-opacity hover:opacity-90"
                  style={{
                    background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})`
                  }}
                >
                  Copiar
                </button>
              </div>
            </div>

            {/* Invite Member */}
            {permissions.canManageMembers && (
              <div className="bg-white rounded-lg shadow-sm p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Invitar miembro</h3>
                <form onSubmit={handleInvite} className="space-y-3">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@ejemplo.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    disabled={inviting}
                    className="w-full px-4 py-2 text-white rounded transition-opacity hover:opacity-90 disabled:bg-gray-400"
                    style={!inviting ? {
                      background: `linear-gradient(135deg, ${team.colors.primary}, ${team.colors.accent})`
                    } : {}}
                  >
                    {inviting ? 'Enviando...' : 'Enviar invitación'}
                  </button>
                </form>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones rápidas</h3>
              <div className="space-y-2">
                <button
                  onClick={() => router.push('/catalog')}
                  className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm"
                >
                  📦 Ver catálogo
                </button>
                {designRequest?.status === 'ready' && (
                  <div className="space-y-3">
                    <div className="text-sm text-gray-600 mb-2">
                      <p className="font-semibold">Pago de prueba</p>
                      <p className="text-xs">Ejemplo: CLP $500 (5,000 centavos)</p>
                    </div>
                    <SplitPayButton
                      orderId={designRequest.id}
                      userId={currentUserId}
                      amountCents={50000}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
