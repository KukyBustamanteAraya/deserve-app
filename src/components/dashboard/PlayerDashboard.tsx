'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { SplitPayButton } from '@/components/payment/SplitPayButton';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { DesignApprovalCard } from '@/components/design/DesignApprovalCard';
import { PaymentStatusTracker } from '@/components/payment/PaymentStatusTracker';
import { ProgressOverviewCard } from '@/components/team-hub/ProgressOverviewCard';
import { NextStepCard } from '@/components/team-hub/NextStepCard';
import { ActivityPreviewCard } from '@/components/team-hub/ActivityPreviewCard';
import { PlayerInfoForm, type PlayerInfoData } from '@/components/team-hub/PlayerInfoForm';
import { useTeamStats } from '@/hooks/team-hub/useTeamStats';
import { useActivityLog } from '@/hooks/team-hub/useActivityLog';
import { getBrowserClient } from '@/lib/supabase/client';
import type { SportSlug } from '@/types/catalog';
import type { Order } from '@/types/orders';

interface Team {
  id: string;
  slug: string;
  name: string;
  colors: { primary: string; secondary: string; accent: string };
  logo_url?: string;
}

interface DesignRequest {
  id: string;
  status: string;
  product_name: string;
  sport_slug: string;
  created_at: string;
  mockup_urls?: string[];
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  order_id?: string;
  approval_status?: string;
}

interface Member {
  user_id: string;
  role: string;
  profiles?: { email: string; full_name?: string };
}

interface Props {
  team: Team;
  designRequests: DesignRequest[];
  orders: Order[];
  members: Member[];
  currentUserId: string;
  shareLink: string;
  onInvite: (email: string) => Promise<void>;
}

/**
 * Player/Small Team Dashboard
 * Optimized for recreational teams (5-15 players)
 * Focus: Simple design view, split payments, who's paid
 */
export function PlayerDashboard({
  team,
  designRequests,
  orders,
  members,
  currentUserId,
  shareLink,
  onInvite,
}: Props) {
  const router = useRouter();
  const [showPlayerInfoForm, setShowPlayerInfoForm] = useState(false);
  const supabase = getBrowserClient();

  // Fetch team stats and activity
  const { stats, loading: statsLoading } = useTeamStats(team.id);
  const { activities, loading: activitiesLoading } = useActivityLog(team.id, 5);

  const getOrderForDesignRequest = (designRequestId: string) => {
    const dr = designRequests.find((d) => d.id === designRequestId);
    if (!dr || !dr.order_id) return null;
    return orders.find((o) => o.id === dr.order_id);
  };

  const latestDesign = designRequests[0];
  const latestOrder = latestDesign ? getOrderForDesignRequest(latestDesign.id) : null;
  const [existingPlayerInfo, setExistingPlayerInfo] = useState<any>(null);
  const [loadingPlayerInfo, setLoadingPlayerInfo] = useState(false);

  // Fetch existing player info when component mounts
  useEffect(() => {
    const fetchExistingPlayerInfo = async () => {
      setLoadingPlayerInfo(true);
      const { data, error } = await supabase
        .from('player_info_submissions')
        .select('*')
        .eq('team_id', team.id)
        .eq('user_id', currentUserId)
        .single();

      if (!error && data) {
        setExistingPlayerInfo(data);
      }
      setLoadingPlayerInfo(false);
    };

    fetchExistingPlayerInfo();
  }, [team.id, currentUserId]);

  const handlePlayerInfoSubmit = async (data: PlayerInfoData) => {
    let error;

    if (existingPlayerInfo) {
      // Update existing submission
      const result = await supabase
        .from('player_info_submissions')
        .update({
          player_name: data.player_name,
          jersey_number: data.jersey_number,
          size: data.size,
          position: data.position,
          additional_notes: data.additional_notes,
        })
        .eq('id', existingPlayerInfo.id);

      error = result.error;
    } else {
      // Insert new submission
      const result = await supabase
        .from('player_info_submissions')
        .insert({
          team_id: team.id,
          user_id: currentUserId,
          player_name: data.player_name,
          jersey_number: data.jersey_number,
          size: data.size,
          position: data.position,
          additional_notes: data.additional_notes,
          submitted_by_manager: false,
        });

      error = result.error;
    }

    if (error) {
      throw new Error(error.message);
    }

    // Refresh existing info
    const { data: updated } = await supabase
      .from('player_info_submissions')
      .select('*')
      .eq('team_id', team.id)
      .eq('user_id', currentUserId)
      .single();

    if (updated) {
      setExistingPlayerInfo(updated);
    }

    setShowPlayerInfoForm(false);
    alert(existingPlayerInfo ? '✓ Player information updated!' : '✓ Player information submitted successfully!');
  };

  // If form is open, show it instead of dashboard
  if (showPlayerInfoForm) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-8">
        <PlayerInfoForm
          teamId={team.id}
          userId={currentUserId}
          sport={(latestDesign?.sport_slug || 'soccer') as SportSlug}
          onSubmit={handlePlayerInfoSubmit}
          onCancel={() => setShowPlayerInfoForm(false)}
          existingData={existingPlayerInfo ? {
            player_name: existingPlayerInfo.player_name,
            jersey_number: existingPlayerInfo.jersey_number || '',
            size: existingPlayerInfo.size,
            position: existingPlayerInfo.position || '',
            additional_notes: existingPlayerInfo.additional_notes || '',
          } : undefined}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Team Hub Overview Cards */}
      {stats && (
        <div className="mb-8 space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ProgressOverviewCard stats={stats} />
            <NextStepCard stats={stats} role="member" teamSlug={team.slug} />
          </div>
          <ActivityPreviewCard activities={activities} teamSlug={team.slug} />
        </div>
      )}

      {/* Hero Section - Current Design */}
      {latestDesign ? (
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{latestDesign.product_name}</h1>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-600 capitalize">{latestDesign.sport_slug}</span>
                <span
                  className={`px-3 py-1 rounded-full text-sm font-medium ${
                    latestDesign.status === 'ready'
                      ? 'bg-green-100 text-green-800'
                      : latestDesign.status === 'rendering'
                      ? 'bg-blue-100 text-blue-800 animate-pulse'
                      : 'bg-yellow-100 text-yellow-800'
                  }`}
                >
                  {latestDesign.status === 'ready'
                    ? '✓ Diseño Listo'
                    : latestDesign.status === 'rendering'
                    ? '⏳ Generando diseño...'
                    : '📝 Pendiente'}
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.primary_color }} />
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.secondary_color }} />
              <div className="w-10 h-10 rounded-lg border-2" style={{ backgroundColor: latestDesign.accent_color }} />
            </div>
          </div>

          {/* Design Approval Card */}
          {latestDesign.status === 'ready' && latestDesign.mockup_urls && latestDesign.mockup_urls.length > 0 && (
            <div className="mb-6">
              <DesignApprovalCard
                designRequestId={latestDesign.id}
                mockupUrls={latestDesign.mockup_urls}
                approvalStatus={latestDesign.approval_status || 'pending_review'}
              />
            </div>
          )}

          {/* Payment Status Tracker - Shows split payment progress */}
          {latestOrder && latestOrder.payment_status !== 'paid' && (
            <div className="mb-6">
              <PaymentStatusTracker
                orderId={latestOrder.id}
                totalAmountCents={latestOrder.total_amount_cents}
                teamId={team.id}
              />
            </div>
          )}

          {/* Payment Section - Individual pay button */}
          {latestOrder && latestOrder.payment_status !== 'paid' && (
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-blue-200 mb-6">
              <div className="flex items-center gap-2 mb-3">
                <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                  />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">Tu Parte del Pago</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">Paga tu parte individualmente con Mercado Pago</p>
              <SplitPayButton orderId={latestOrder.id} userId={currentUserId} amountCents={50000} />
            </div>
          )}

          {/* Order Status Timeline */}
          {latestOrder && (
            <div className="mb-6">
              <OrderStatusTimeline
                currentStatus={latestOrder.status}
                trackingNumber={latestOrder.tracking_number}
                carrier={latestOrder.carrier}
                estimatedDeliveryDate={latestOrder.estimated_delivery_date}
              />
            </div>
          )}

          {latestOrder && latestOrder.payment_status === 'paid' && (
            <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200">
              <div className="flex items-center gap-2 text-green-800">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-semibold">¡Pagado! Gracias por tu aporte</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg p-12 mb-8 text-center text-white">
          <h1 className="text-4xl font-bold mb-4">¡Bienvenido a {team.name}!</h1>
          <p className="text-xl mb-6 opacity-90">Crea tu primer diseño de uniforme personalizado</p>
          <button
            onClick={() => router.push('/catalog')}
            className="px-8 py-4 bg-white text-blue-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors"
          >
            Ver Catálogo de Diseños
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Team Members - Prominent for Players */}
        <div className="md:col-span-2 bg-white rounded-xl shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">Tu Equipo ({members.length})</h2>
            <button
              onClick={() => {
                const email = prompt('Email del compañero:');
                if (email) onInvite(email);
              }}
              className="px-4 py-2 text-sm rounded-lg"
              style={{ backgroundColor: team.colors.primary, color: 'white' }}
            >
              + Invitar
            </button>
          </div>

          <div className="space-y-3">
            {members.map((m) => (
              <div
                key={m.user_id}
                className="flex items-center justify-between p-3 rounded-lg border hover:border-gray-300 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: team.colors.primary }}
                  >
                    {m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?'}
                  </div>
                  <div>
                    <p className="font-medium">
                      {m.user_id === currentUserId ? (
                        <span>
                          Tú <span className="text-xs text-gray-500">(tú)</span>
                        </span>
                      ) : (
                        m.profiles?.full_name || m.profiles?.email || `Miembro ${m.user_id.substring(0, 8)}`
                      )}
                    </p>
                    {m.profiles?.email && m.user_id !== currentUserId && (
                      <p className="text-xs text-gray-500">{m.profiles.email}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {/* TODO: Show payment status per member */}
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600 capitalize">{m.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Share Link */}
          <div className="mt-6 pt-6 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Invitar por enlace:</p>
            <div className="flex gap-2">
              <input type="text" value={shareLink} readOnly className="flex-1 px-3 py-2 text-sm border rounded-lg bg-gray-50" />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(shareLink);
                  alert('¡Enlace copiado!');
                }}
                className="px-4 py-2 text-sm rounded-lg text-white"
                style={{ backgroundColor: team.colors.primary }}
              >
                Copiar
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Sidebar */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="font-bold mb-4">Acciones Rápidas</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowPlayerInfoForm(true)}
                className="w-full px-4 py-3 border-2 border-blue-500 bg-blue-50 rounded-lg hover:bg-blue-100 text-left font-medium text-blue-900"
              >
                {existingPlayerInfo ? '✏️ Edit Player Info' : '📝 Submit Player Info'}
              </button>
              <button
                onClick={() => router.push('/catalog')}
                className="w-full px-4 py-3 border-2 rounded-lg hover:bg-gray-50 text-left font-medium"
              >
                🎨 Nuevo Diseño
              </button>
              {designRequests.length > 0 && (
                <button
                  onClick={() => router.push('/personaliza')}
                  className="w-full px-4 py-3 border-2 rounded-lg hover:bg-gray-50 text-left font-medium"
                >
                  ✏️ Modificar Diseño
                </button>
              )}
            </div>
          </div>

          {/* Previous Designs (if more than one) */}
          {designRequests.length > 1 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h3 className="font-bold mb-4">Diseños Anteriores</h3>
              <div className="space-y-2">
                {designRequests.slice(1, 4).map((dr) => (
                  <div key={dr.id} className="p-3 border rounded-lg text-sm">
                    <p className="font-medium">{dr.product_name}</p>
                    <p className="text-xs text-gray-500">{new Date(dr.created_at).toLocaleDateString('es-CL')}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
