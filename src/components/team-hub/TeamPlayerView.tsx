'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { DesignApprovalCard } from '@/components/design/DesignApprovalCard';
import type { TeamWithDetails, UserPermissions } from '@/types/team-hub';
import { logger } from '@/lib/logger';

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  created_at: string;
  output_url?: string;
  mockup_urls?: string[];
  approval_status?: string;
  revision_count?: number;
}

interface PlayerDashboardProps {
  team: TeamWithDetails;
  currentUserId: string;
  permissions: UserPermissions;
}

export function TeamPlayerView({ team, currentUserId, permissions }: PlayerDashboardProps) {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [designRequest, setDesignRequest] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [shareLink, setShareLink] = useState('');
  const [memberCount, setMemberCount] = useState(0);

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

      // Get member count
      const { count } = await supabase
        .from('team_memberships')
        .select('*', { count: 'exact', head: true })
        .eq('team_id', team.id);

      setMemberCount(count || 0);

      // Get design request with mockup data
      const { data: designData, error: designError } = await supabase
        .from('design_requests')
        .select('id, status, product_name, created_at, output_url, mockup_urls, approval_status, revision_count')
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

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink);
    alert('¡Link copiado!');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-600">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Banner with team colors (read-only) */}
      <CustomizeBanner
        teamName={team.name}
        customColors={team.colors}
        customLogoUrl={team.logo_url}
        onTeamNameChange={() => {}}
        onLogoChange={() => {}}
        readonly={true}
      />

      <div className="max-w-4xl mx-auto px-4 py-12 pt-64">
        <div className="space-y-8">
          {/* Welcome Message */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Bienvenido a {team.name}
            </h2>
            <p className="text-gray-600">
              Eres miembro de este equipo. Puedes ver el progreso del diseño y tus pedidos.
            </p>
          </div>

          {/* Current Design */}
          {designRequest && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Diseño del equipo</h2>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-lg font-medium text-gray-900">{designRequest.product_name}</p>
                  <p className="text-sm text-gray-600">
                    Creado el {new Date(designRequest.created_at).toLocaleDateString()}
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
                      El diseño está siendo generado...
                    </p>
                  </div>
                  <p className="text-xs text-blue-700">
                    Te notificaremos cuando esté listo para revisar.
                  </p>
                </div>
              )}

              {/* Design View/Approval (based on permissions) */}
              {designRequest.status === 'ready' && designRequest.mockup_urls && designRequest.mockup_urls.length > 0 && (
                <div className="mt-6">
                  {permissions.canApproveDesign || permissions.canVoteOnDesign ? (
                    <DesignApprovalCard
                      designRequestId={designRequest.id}
                      productName={designRequest.product_name}
                      mockupUrls={designRequest.mockup_urls}
                      approvalStatus={designRequest.approval_status || 'pending'}
                      revisionCount={designRequest.revision_count || 0}
                      onApprovalChange={loadTeamData}
                    />
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-6">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                        {designRequest.mockup_urls.map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`Mockup ${i + 1}`}
                            className="rounded-lg border-2 border-gray-300 w-full h-auto object-cover"
                          />
                        ))}
                      </div>
                      <p className="text-sm text-gray-600 mt-4 text-center">
                        El administrador del equipo está revisando el diseño.
                      </p>
                    </div>
                  )}

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
                        Descargar diseño
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Player Info Submission (if self-service enabled) */}
          {team.self_service_enabled && (
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                👕 Información de jugador
              </h2>
              <p className="text-gray-600 mb-4">
                {team.player_info_mode === 'self_service' ? (
                  'Completa tu información para tu uniforme.'
                ) : team.player_info_mode === 'hybrid' ? (
                  'Puedes completar tu información o el administrador la ingresará.'
                ) : (
                  'El administrador del equipo recopilará la información de todos.'
                )}
              </p>
              {team.player_info_mode !== 'manager_only' && (
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  onClick={() => alert('Formulario de información de jugador próximamente')}
                >
                  Completar mi información
                </button>
              )}
            </div>
          )}

          {/* Team Info */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Información del equipo</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Deporte:</span>
                <span className="font-medium capitalize">{team.sport}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Miembros:</span>
                <span className="font-medium">{memberCount}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-gray-100">
                <span className="text-gray-600">Modo de aprobación:</span>
                <span className="font-medium capitalize">{team.approval_mode.replace('_', ' ')}</span>
              </div>
            </div>

            {/* Share link (if allowed) */}
            {team.allow_member_invites && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Invitar amigos</h3>
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
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Acciones</h3>
            <div className="space-y-2">
              <button
                onClick={() => router.push('/catalog')}
                className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm text-left"
              >
                📦 Ver catálogo completo
              </button>
              <button
                onClick={() => router.push('/orders')}
                className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors text-sm text-left"
              >
                📋 Ver mis pedidos
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
