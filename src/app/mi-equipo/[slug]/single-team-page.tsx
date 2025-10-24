'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useTeamData } from './hooks/useTeamData';
import { useSingleTeamData } from './hooks/useSingleTeamData';
import { DesignApprovalModal } from '@/components/team/DesignApprovalModal';
import TwoPhaseProgressTracker from '@/components/team/TwoPhaseProgressTracker';
import { MiniFieldMap } from '@/components/team/MiniFieldMap';
import { PlayerDetailModal } from '@/components/team/PlayerDetailModal';
import { TeamOrderOverview } from '@/components/team/orders/TeamOrderOverview';
import { getFieldLayout } from '@/lib/sports/fieldLayouts';
import { mapSportToSlug } from './utils';
import { getPrimaryMockup, hasMockups, getAllMockups } from '@/lib/mockup-helpers';
import { MockupCarousel } from '@/components/design/MockupCarousel';
import {
  loadCollectionLink,
  copyToClipboard,
  shareViaWhatsApp,
  loadMyPlayerInfo,
  updatePlayerInfo,
  swapPlayers,
} from './helpers';
import type { Player } from './types';

export default function SingleTeamDashboard({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();

  // Use extracted hooks
  const { team, colors, memberCount, isManager, currentUser, loading, error } = useTeamData(slug);
  const {
    designRequests,
    players,
    paymentSummary,
    loading: singleTeamLoading,
    error: singleTeamError,
    refetch,
  } = useSingleTeamData(team?.id, currentUser?.id);

  // Modal and UI state
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedDesignForApproval, setSelectedDesignForApproval] = useState<number | null>(null);
  const [currentDesignPage, setCurrentDesignPage] = useState(0);
  const [showEditPlayerModal, setShowEditPlayerModal] = useState(false);
  const [editingMyInfo, setEditingMyInfo] = useState<Player | null>(null);
  const [playerFormData, setPlayerFormData] = useState({
    player_name: '',
    jersey_number: '',
    size: '',
    position: '',
    additional_notes: '',
  });

  // Collection link state
  const [collectionLink, setCollectionLink] = useState<string | null>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  // Load collection link helper
  const handleLoadCollectionLink = async () => {
    if (!team) return;
    setLoadingLink(true);
    try {
      const link = await loadCollectionLink(team.id);
      setCollectionLink(link);
    } finally {
      setLoadingLink(false);
    }
  };

  // Copy link to clipboard
  const copyLinkToClipboard = async () => {
    if (!collectionLink) return;
    const success = await copyToClipboard(collectionLink);
    if (success) {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }
  };

  // Share via WhatsApp
  const handleShareViaWhatsApp = () => {
    if (!team || !collectionLink) return;
    shareViaWhatsApp(team.name, collectionLink);
  };

  // Load my player info for editing
  const handleLoadMyPlayerInfo = async () => {
    if (!currentUser || !team) return;

    const playerData = await loadMyPlayerInfo(team.id, currentUser.id);

    if (playerData) {
      // Edit existing player info
      setEditingMyInfo(playerData);
      setPlayerFormData({
        player_name: playerData.player_name,
        jersey_number: playerData.jersey_number || '',
        size: playerData.size,
        position: playerData.position || '',
        additional_notes: playerData.additional_notes || '',
      });
    } else {
      // Create new player info - initialize with user's name if available
      setEditingMyInfo(null);
      setPlayerFormData({
        player_name: currentUser.user_metadata?.full_name || '',
        jersey_number: '',
        size: '',
        position: '',
        additional_notes: '',
      });
    }
    setShowEditPlayerModal(true);
  };

  // Create or update current user's player info
  const handleUpdateMyInfo = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!playerFormData.player_name.trim() || !playerFormData.size) {
      alert('Por favor completa el nombre y la talla del jugador');
      return;
    }

    if (!team || !currentUser) return;

    const result = await updatePlayerInfo(
      team.id,
      currentUser.id,
      playerFormData,
      editingMyInfo?.id
    );

    if (result.success) {
      setShowEditPlayerModal(false);
      await refetch(); // Refresh data to show updated info
    } else {
      alert(`Error al ${editingMyInfo ? 'actualizar' : 'agregar'} información: ${result.error}`);
    }
  };

  // Handler for swapping bench player with starter
  const handlePlayerSwap = async (benchPlayerId: string, starterPlayerId: string) => {
    if (!team) return;

    const updatedPlayers = await swapPlayers(team.id, benchPlayerId, starterPlayerId, players);

    if (updatedPlayers) {
      // Refresh data to show updated lineup
      await refetch();
    }
  };

  // Loading state
  if (loading || singleTeamLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-lg text-gray-300">Cargando equipo...</div>
      </div>
    );
  }

  // Error state
  if (error || singleTeamError || !team) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-500 text-lg mb-4">Error cargando equipo</p>
          <p className="text-gray-400 mb-6">{error || singleTeamError || 'Equipo no encontrado'}</p>
          <button
            onClick={() => router.push('/mi-equipo')}
            className="px-6 py-3 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg transition-colors"
          >
            Volver a Mis Equipos
          </button>
        </div>
      </div>
    );
  }

  console.log('[SingleTeamDashboard] 👥 Rendering single team dashboard for:', team.name);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      {/* Team Header Banner */}
      <div className="max-w-6xl mx-auto px-6 py-6">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {/* Back Arrow - Top Left */}
          <button
            onClick={() => router.push('/mi-equipo')}
            className="absolute top-2 left-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>

          {/* Settings Button - Top Right */}
          {isManager && (
            <button
              onClick={() => router.push(`/mi-equipo/${slug}/settings`)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 text-gray-400 hover:text-white hover:border-[#e21c21]/50 transition-all z-10"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}

          <div className="relative pt-2 pl-6">
            <div className="flex items-center gap-6">
              {/* Team Logo */}
              <div className="relative flex-shrink-0">
                {team.logo_url ? (
                  <img
                    src={team.logo_url}
                    alt={`${team.name} logo`}
                    className="w-24 h-24 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                    <span className="text-4xl"></span>
                  </div>
                )}
              </div>

              {/* Team Info */}
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-white mb-2">{team.name}</h1>
                <p className="text-gray-300 text-lg">
                  {team.sport?.name || 'Deporte no especificado'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Single Team */}
      <div className="max-w-6xl mx-auto px-6 pb-8 space-y-6">
        {/* Order Overview Section */}
        <TeamOrderOverview teamId={team.id} teamSlug={slug} />

        {/* Two-Phase Progress Tracker - Full width */}
        <TwoPhaseProgressTracker
          teamId={team.id}
          teamSlug={slug}
          isManager={isManager}
          onShareDesign={async () => {
            await handleLoadCollectionLink();
            setShowLinkModal(true);
          }}
        />

        {/* Payment Summary - Full width when exists */}
        {paymentSummary && paymentSummary.totalOrders > 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

            <div className="flex flex-col gap-4 relative">
              {/* Title */}
              <h2 className="text-2xl font-bold text-white relative">
                Resumen de Pagos
              </h2>

              <div className="flex items-center gap-8">
                <div>
                  <div className="text-xs text-gray-400">Pagado</div>
                  <div className="text-2xl font-bold text-green-400">
                    ${paymentSummary.totalPaidClp.toLocaleString('es-CL')}
                  </div>
                </div>

                <div className="text-gray-600 text-xl">/</div>

                <div>
                  <div className="text-xs text-gray-400">Total</div>
                  <div className="text-2xl font-bold text-white">
                    ${paymentSummary.totalAmountClp.toLocaleString('es-CL')}
                  </div>
                </div>

                {/* Pending payments badge */}
                {paymentSummary.myPendingPayments > 0 && (
                  <div className="relative bg-gradient-to-br from-yellow-900/30 via-yellow-800/20 to-yellow-900/30 backdrop-blur-sm border border-yellow-500/50 rounded-lg px-4 py-2 overflow-hidden ml-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative flex items-center gap-2">
                      <span className="text-sm font-medium text-yellow-400">
                        {paymentSummary.myPendingPayments} pendiente{paymentSummary.myPendingPayments > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                )}

                {/* All paid badge */}
                {paymentSummary.totalPendingClp === 0 && (
                  <div className="relative bg-gradient-to-br from-green-900/30 via-green-800/20 to-green-900/30 backdrop-blur-sm border border-green-500/50 rounded-lg px-4 py-2 overflow-hidden ml-auto">
                    <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent pointer-events-none"></div>
                    <div className="relative flex items-center gap-2">
                      <span className="text-sm font-medium text-green-400">Completo</span>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={() => router.push(`/mi-equipo/${slug}/payments`)}
                className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50 w-fit"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Ver Detalles →</span>
              </button>
            </div>
          </div>
        )}

        {/* Design Requests and Team Lineup Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Design Requests Gallery */}
          <div id="designs-section" className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex items-center justify-between mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                Diseños del Equipo
              </h2>
              <button
                onClick={() => router.push(`/mi-equipo/${slug}/design-request/new`)}
                className="relative px-4 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-sm overflow-hidden group/btn border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">+ Nueva Solicitud</span>
              </button>
            </div>

            {designRequests.length > 0 ? (
              <>
                {/* Carousel pagination */}
                {(() => {
                  const DESIGNS_PER_PAGE = 4;
                  const totalPages = Math.ceil(designRequests.length / DESIGNS_PER_PAGE);
                  const startIndex = currentDesignPage * DESIGNS_PER_PAGE;
                  const endIndex = startIndex + DESIGNS_PER_PAGE;
                  const currentDesigns = designRequests.slice(startIndex, endIndex);

                  return (
                    <>
                      {/* Navigation arrows */}
                      {totalPages > 1 && (
                        <div className="flex items-center justify-between mb-4 relative">
                          <button
                            onClick={() => setCurrentDesignPage(Math.max(0, currentDesignPage - 1))}
                            disabled={currentDesignPage === 0}
                            className={`p-2 rounded-lg border ${
                              currentDesignPage === 0
                                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'border-gray-700 text-white hover:border-[#e21c21]/50 hover:bg-gray-800/50'
                            } transition-all`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                          </button>
                          <div className="text-sm text-gray-300">
                            Página {currentDesignPage + 1} de {totalPages}
                          </div>
                          <button
                            onClick={() => setCurrentDesignPage(Math.min(totalPages - 1, currentDesignPage + 1))}
                            disabled={currentDesignPage === totalPages - 1}
                            className={`p-2 rounded-lg border ${
                              currentDesignPage === totalPages - 1
                                ? 'border-gray-700 text-gray-600 cursor-not-allowed'
                                : 'border-gray-700 text-white hover:border-[#e21c21]/50 hover:bg-gray-800/50'
                            } transition-all`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </button>
                        </div>
                      )}

                      {/* Design cards grid - full width for single card, 2x2 for multiple */}
                      <div className={`grid ${currentDesigns.length === 1 ? 'grid-cols-1' : 'grid-cols-2'} gap-4 relative`}>
                        {currentDesigns.map((request) => (
                          <div
                            key={request.id}
                            className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 border border-gray-700 rounded-lg p-3 hover:border-[#e21c21]/50 overflow-hidden group/card"
                            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/card:opacity-100 transition-opacity pointer-events-none"></div>

                            {/* Mockup Carousel with overlays */}
                            {(() => {
                              const allMockups = getAllMockups(request as any);
                              return allMockups.length > 0 ? (
                              <div className="mb-3 relative">
                                <MockupCarousel
                                  mockups={allMockups}
                                  mockupPreference={(request as any).mockup_preference}
                                  showLabels={true}
                                />

                                {/* Status Badge - Top Right (outside carousel label area) */}
                                <div className="absolute top-2 right-2 z-10">
                                  <span
                                    className={`px-2 py-1 rounded-full text-xs font-medium shadow-lg ${
                                      request.status === 'approved'
                                        ? 'bg-green-500/90 text-white border border-green-400'
                                        : 'bg-blue-500/90 text-white border border-blue-400'
                                    }`}
                                  >
                                    {request.status === 'approved' ? 'Aprobado' : 'Listo'}
                                  </span>
                                </div>

                                {/* Voting Buttons - Show when mockup exists and not approved */}
                                {request.status !== 'approved' && (
                                  <div className="flex items-center gap-2 mt-3">
                                    {/* Thumbs Up */}
                                    <button
                                      onClick={async () => {
                                        const supabase = getBrowserClient();
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) return;

                                        if (request.user_reaction === 'like') {
                                          await supabase
                                            .from('design_request_reactions')
                                            .delete()
                                            .eq('design_request_id', request.id)
                                            .eq('user_id', user.id);
                                        } else {
                                          await supabase
                                            .from('design_request_reactions')
                                            .upsert({
                                              design_request_id: request.id,
                                              user_id: user.id,
                                              reaction: 'like'
                                            }, {
                                              onConflict: 'design_request_id,user_id'
                                            });
                                        }
                                        await refetch();
                                      }}
                                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors shadow-lg ${
                                        request.user_reaction === 'like'
                                          ? 'bg-green-500/90 text-white border border-green-400'
                                          : 'bg-gray-800/90 text-gray-200 border border-gray-600 hover:bg-green-500/80 hover:border-green-400'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M2 10.5a1.5 1.5 0 113 0v6a1.5 1.5 0 01-3 0v-6zM6 10.333v5.43a2 2 0 001.106 1.79l.05.025A4 4 0 008.943 18h5.416a2 2 0 001.962-1.608l1.2-6A2 2 0 0015.56 8H12V4a2 2 0 00-2-2 1 1 0 00-1 1v.667a4 4 0 01-.8 2.4L6.8 7.933a4 4 0 00-.8 2.4z" />
                                      </svg>
                                      <span className="text-sm font-bold">{request.likes_count || 0}</span>
                                    </button>

                                    {/* Thumbs Down */}
                                    <button
                                      onClick={async () => {
                                        const supabase = getBrowserClient();
                                        const { data: { user } } = await supabase.auth.getUser();
                                        if (!user) return;

                                        if (request.user_reaction === 'dislike') {
                                          await supabase
                                            .from('design_request_reactions')
                                            .delete()
                                            .eq('design_request_id', request.id)
                                            .eq('user_id', user.id);
                                        } else {
                                          await supabase
                                            .from('design_request_reactions')
                                            .upsert({
                                              design_request_id: request.id,
                                              user_id: user.id,
                                              reaction: 'dislike'
                                            }, {
                                              onConflict: 'design_request_id,user_id'
                                            });
                                        }
                                        await refetch();
                                      }}
                                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg font-medium transition-colors shadow-lg ${
                                        request.user_reaction === 'dislike'
                                          ? 'bg-red-500/90 text-white border border-red-400'
                                          : 'bg-gray-800/90 text-gray-200 border border-gray-600 hover:bg-red-500/80 hover:border-red-400'
                                      }`}
                                    >
                                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M18 9.5a1.5 1.5 0 11-3 0v-6a1.5 1.5 0 013 0v6zM14 9.667v-5.43a2 2 0 00-1.105-1.79l-.05-.025A4 4 0 0011.055 2H5.64a2 2 0 00-1.962 1.608l-1.2 6A2 2 0 004.44 12H8v4a2 2 0 002 2 1 1 0 001-1v-.667a4 4 0 01.8-2.4l1.4-1.866a4 4 0 00.8-2.4z" />
                                      </svg>
                                      <span className="text-sm font-bold">{request.dislikes_count || 0}</span>
                                    </button>
                                  </div>
                                )}
                              </div>
                              ) : null;
                            })() || (
                              <div className="mb-3 bg-gray-900/30 rounded-lg p-12 text-center relative border border-gray-700">
                                <span className="text-4xl">🎨</span>
                                <p className="text-gray-400 text-sm mt-2">Diseño en proceso</p>

                                {/* Status Badge - Top Left for pending designs */}
                                <div className="absolute top-2 left-2">
                                  <span className="px-2 py-1 rounded-full text-xs font-medium shadow-lg bg-gray-700/90 text-gray-200 border border-gray-600">
                                    Pendiente
                                  </span>
                                </div>
                              </div>
                            )}

                            {/* Show vote results for approved designs */}
                            {request.status === 'approved' && ((request.likes_count ?? 0) > 0 || (request.dislikes_count ?? 0) > 0) && (
                              <div className="flex items-center gap-4 mb-4 pb-4 border-b border-gray-700 relative">
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                                  <span className="font-medium text-green-400">{request.likes_count || 0}</span>
                                </div>
                                <div className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 rounded-lg border border-gray-700">
                                  <span className="font-medium text-red-400">{request.dislikes_count || 0}</span>
                                </div>
                                <span className="text-xs text-gray-400 ml-auto">Resultados finales</span>
                              </div>
                            )}

                            {/* Manager Actions */}
                            {isManager && (
                              <div className="flex flex-row gap-2">
                                {/* Share Design - When design has mockup */}
                                {hasMockups(request as any) && (
                                  <button
                                    onClick={async () => {
                                      await handleLoadCollectionLink();
                                      setShowLinkModal(true);
                                    }}
                                    className="relative flex-1 px-3 py-2 bg-gradient-to-br from-purple-600/90 via-purple-700/80 to-purple-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/share border border-purple-600/50 shadow-lg shadow-purple-600/30 hover:shadow-purple-600/50"
                                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/share:opacity-100 transition-opacity pointer-events-none"></div>
                                    <span className="relative">Compartir</span>
                                  </button>
                                )}

                                {/* Approve Design - When design has mockup and is not yet approved */}
                                {(request.status === 'pending' || request.status === 'ready' || request.status === 'ready_for_voting') && hasMockups(request as any) && (
                                  <button
                                    onClick={() => setSelectedDesignForApproval(request.id)}
                                    className="relative flex-1 px-3 py-2 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/approve border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/approve:opacity-100 transition-opacity pointer-events-none"></div>
                                    <span className="relative">Aprobar</span>
                                  </button>
                                )}

                                {/* View Order - When design is approved */}
                                {request.status === 'approved' && (
                                  <button
                                    onClick={() => router.push(`/mi-equipo/${slug}/payments`)}
                                    className="relative flex-1 px-3 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium text-xs overflow-hidden group/view border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                                  >
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/view:opacity-100 transition-opacity pointer-events-none"></div>
                                    <span className="relative">Ver Pagos</span>
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Delete Button - Show for managers (can delete any) or authors (can delete their own) */}
                            {(isManager || (currentUser && request.requested_by === currentUser.id)) && (
                              <button
                                onClick={async () => {
                                  if (!confirm('¿Estás seguro de que deseas eliminar esta solicitud de diseño? Esta acción no se puede deshacer.')) {
                                    return;
                                  }

                                  try {
                                    const response = await fetch(`/api/design-requests/${request.id}`, {
                                      method: 'DELETE',
                                    });

                                    if (!response.ok) {
                                      const error = await response.json();
                                      throw new Error(error.error || 'Error al eliminar');
                                    }

                                    // Refresh data to show updated list
                                    await refetch();
                                  } catch (error: any) {
                                    alert(error.message || 'Error al eliminar la solicitud de diseño');
                                  }
                                }}
                                className="relative w-full mt-3 px-4 py-2 bg-gradient-to-br from-red-900/30 via-red-800/20 to-red-900/30 text-red-400 border border-red-500/50 rounded-lg hover:border-red-500 font-medium overflow-hidden group/delete"
                                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                              >
                                <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent opacity-0 group-hover/delete:opacity-100 transition-opacity pointer-events-none"></div>
                                <span className="relative">Eliminar Solicitud</span>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </>
            ) : (
              <div className="text-center py-12 bg-gray-900/30 rounded-lg border border-gray-700 relative">
                <span className="text-6xl mb-4 block"></span>
                <p className="text-gray-400 mb-4 text-lg">No hay solicitudes de diseño todavía</p>
                <p className="text-gray-500 text-sm">
                  {isManager
                    ? 'Usa el botón "+ Nueva Solicitud" arriba para crear tu primera solicitud de diseño'
                    : 'Tu equipo aún no ha creado solicitudes de diseño'}
                </p>
              </div>
            )}
          </div>

          {/* Mini-Field Visualization - Always show container */}
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-5 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <MiniFieldMap
              sport={team.sport?.slug ? mapSportToSlug(team.sport.slug) : 'futbol'}
              players={players}
              onPlayerClick={(player) => setSelectedPlayer(player)}
              onPlayerSwap={handlePlayerSwap}
              teamSlug={slug}
              isManager={isManager}
            />
          </div>
        </div>
      </div>

      {/* Player Detail Modal */}
      <PlayerDetailModal
        player={selectedPlayer}
        isOpen={!!selectedPlayer}
        onClose={() => setSelectedPlayer(null)}
      />

      {/* Edit/Add My Info Modal */}
      {showEditPlayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full p-6 border border-gray-700 overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="flex justify-between items-center mb-4 relative">
              <h2 className="text-2xl font-bold text-white">
                {editingMyInfo ? 'Editar Mi Información' : 'Agregar Mi Información'}
              </h2>
              <button
                onClick={() => {
                  setShowEditPlayerModal(false);
                  setEditingMyInfo(null);
                  setPlayerFormData({
                    player_name: '',
                    jersey_number: '',
                    size: '',
                    position: '',
                    additional_notes: '',
                  });
                }}
                className="text-gray-400 hover:text-gray-200"
              >
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUpdateMyInfo} className="space-y-4 relative">
              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Nombre del Jugador *
                </label>
                <input
                  type="text"
                  value={playerFormData.player_name}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, player_name: e.target.value })}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                  placeholder="Ej: Juan Pérez"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Número de Jersey
                  </label>
                  <input
                    type="text"
                    value={playerFormData.jersey_number}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, jersey_number: e.target.value })}
                    className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50"
                    placeholder="Ej: 10"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Talla *
                  </label>
                  <select
                    value={playerFormData.size}
                    onChange={(e) => setPlayerFormData({ ...playerFormData, size: e.target.value })}
                    className="w-full px-4 py-2 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 appearance-none cursor-pointer"
                    style={{
                      backgroundColor: '#0a0a0b',
                      backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                      backgroundPosition: 'right 0.5rem center',
                      backgroundRepeat: 'no-repeat',
                      backgroundSize: '1.5em 1.5em',
                      paddingRight: '2.5rem'
                    }}
                    required
                  >
                    <option value="" className="bg-black text-white">Seleccionar</option>
                    <option value="XS" className="bg-black text-white">XS</option>
                    <option value="S" className="bg-black text-white">S</option>
                    <option value="M" className="bg-black text-white">M</option>
                    <option value="L" className="bg-black text-white">L</option>
                    <option value="XL" className="bg-black text-white">XL</option>
                    <option value="XXL" className="bg-black text-white">XXL</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Posición
                </label>
                <select
                  value={playerFormData.position}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, position: e.target.value })}
                  className="w-full px-4 py-2 backdrop-blur-md border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 appearance-none cursor-pointer"
                  style={{
                    backgroundColor: '#0a0a0b',
                    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                    backgroundPosition: 'right 0.5rem center',
                    backgroundRepeat: 'no-repeat',
                    backgroundSize: '1.5em 1.5em',
                    paddingRight: '2.5rem'
                  }}
                >
                  <option value="" className="bg-black text-white">Seleccionar posición (opcional)</option>
                  {team?.sport?.slug && getFieldLayout(mapSportToSlug(team.sport?.slug || 'futbol')).positions.map((pos) => (
                    <option key={pos.name} value={pos.name} className="bg-black text-white">
                      {pos.name} ({pos.abbr})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">
                  Notas Adicionales
                </label>
                <textarea
                  value={playerFormData.additional_notes}
                  onChange={(e) => setPlayerFormData({ ...playerFormData, additional_notes: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2 bg-gradient-to-br from-black/90 via-gray-900/95 to-black/90 backdrop-blur-md border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500/50 resize-none"
                  placeholder="Información adicional..."
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditPlayerModal(false);
                    setEditingMyInfo(null);
                    setPlayerFormData({
                      player_name: '',
                      jersey_number: '',
                      size: '',
                      position: '',
                      additional_notes: '',
                    });
                  }}
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 text-gray-300 hover:text-white rounded-lg border border-gray-700 hover:border-gray-600 font-medium overflow-hidden group/cancel"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/cancel:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">Cancelar</span>
                </button>
                <button
                  type="submit"
                  className="relative flex-1 px-6 py-2 bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 text-white rounded-lg font-medium overflow-hidden group/submit border border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50"
                  style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/submit:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{editingMyInfo ? 'Guardar Cambios' : 'Agregar Información'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Design Approval Modal */}
      {selectedDesignForApproval && (
        <DesignApprovalModal
          isOpen={true}
          onClose={() => setSelectedDesignForApproval(null)}
          designRequestId={selectedDesignForApproval}
          teamId={team.id}
          teamSlug={slug}
        />
      )}

      {/* Collection Link Modal */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-2xl w-full border border-gray-700 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

            {/* Header */}
            <div className="relative p-6 border-b border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-bold text-white">Enlace de Recolección</h2>
                </div>
                <button
                  onClick={() => {
                    setShowLinkModal(false);
                    setLinkCopied(false);
                  }}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <span className="text-2xl">✕</span>
                </button>
              </div>
              <p className="text-gray-300 mt-2">
                Comparte este enlace con tu equipo para que completen su información (talla, número, posición)
              </p>
            </div>

            {/* Content */}
            <div className="relative p-6 space-y-6">
              {loadingLink ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-white"></div>
                  <p className="text-gray-300 mt-4">Generando enlace...</p>
                </div>
              ) : (
                <>
                  {/* Link Display */}
                  <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg p-4 border border-gray-700 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative">
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        URL del Enlace
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={collectionLink || ''}
                          readOnly
                          className="flex-1 bg-black/40 border border-gray-700 rounded-lg px-4 py-3 text-white font-mono text-sm"
                        />
                        <button
                          onClick={copyLinkToClipboard}
                          className={`relative px-6 py-3 rounded-lg font-medium overflow-hidden group/copy border transition-all ${
                            linkCopied
                              ? 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 border-green-600/50 shadow-lg shadow-green-600/30'
                              : 'bg-gradient-to-br from-blue-600/90 via-blue-700/80 to-blue-800/90 border-blue-600/50 shadow-lg shadow-blue-600/30 hover:shadow-blue-600/50'
                          }`}
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        >
                          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/copy:opacity-100 transition-opacity pointer-events-none"></div>
                          <span className="relative text-white whitespace-nowrap">
                            {linkCopied ? 'Copiado' : 'Copiar'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="space-y-3">
                    <h3 className="text-lg font-semibold text-white">Compartir vía:</h3>

                    {/* WhatsApp */}
                    <button
                      onClick={handleShareViaWhatsApp}
                      className="relative w-full px-6 py-4 bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 text-white rounded-lg font-medium overflow-hidden group/whatsapp border border-green-600/50 shadow-lg shadow-green-600/30 hover:shadow-green-600/50"
                      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/whatsapp:opacity-100 transition-opacity pointer-events-none"></div>
                      <div className="relative flex items-center justify-center gap-3">
                        <span className="text-lg">Compartir por WhatsApp</span>
                      </div>
                    </button>
                  </div>

                  {/* Info Box */}
                  <div className="relative bg-gradient-to-br from-blue-900/30 via-blue-800/20 to-blue-900/30 backdrop-blur-sm border border-blue-500/50 rounded-lg p-4 overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                    <div className="relative flex gap-3">
                      <div className="text-sm text-blue-200">
                        <p className="font-semibold mb-1">¿Cómo funciona?</p>
                        <ul className="space-y-1 text-blue-300/80">
                          <li>• Los jugadores acceden al enlace desde cualquier dispositivo</li>
                          <li>• Completan su información (nombre, talla, número, posición)</li>
                          <li>• Los datos se guardan automáticamente en el sistema</li>
                          <li>• Puedes ver el progreso en tiempo real</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="relative p-6 border-t border-gray-700 flex justify-end">
              <button
                onClick={() => {
                  setShowLinkModal(false);
                  setLinkCopied(false);
                }}
                className="relative px-6 py-2 bg-gradient-to-br from-gray-700/90 via-gray-800/80 to-gray-900/90 text-white rounded-lg font-medium overflow-hidden group/close border border-gray-600/50 hover:border-gray-500/50"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/close:opacity-100 transition-opacity pointer-events-none"></div>
                <span className="relative">Cerrar</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
