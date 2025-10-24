'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { DesignMockup, DesignRequest, UserRole } from './components/types';
import PageHeader from './components/PageHeader';
import DesignMockupViewer from './components/DesignMockupViewer';
import DesignInfo from './components/DesignInfo';
import ColorPalette from './components/ColorPalette';
import FeedbackSection from './components/FeedbackSection';
import FeedbackModal from './components/FeedbackModal';
import DeleteModal from './components/DeleteModal';
import DesignBrowserModal from './components/DesignBrowserModal';
import LoadingState from './components/LoadingState';
import ErrorState from './components/ErrorState';

export default function DesignRequestDetailPage({ params }: { params: { slug: string; id: string } }) {
  const { slug, id } = params;
  const router = useRouter();
  const [designRequest, setDesignRequest] = useState<DesignRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedMockup, setSelectedMockup] = useState<DesignMockup | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [showDesignBrowser, setShowDesignBrowser] = useState(false);
  const [availableDesigns, setAvailableDesigns] = useState<any[]>([]);
  const [designsLoading, setDesignsLoading] = useState(false);

  useEffect(() => {
    async function loadDesignRequest() {
      if (isDeleted) return;

      try {
        const supabase = getBrowserClient();

        console.log('[Design Request Detail] Loading design request:', id);

        const { data, error: fetchError } = await supabase
          .from('design_requests')
          .select(`
            id,
            status,
            created_at,
            updated_at,
            design_id,
            primary_color,
            secondary_color,
            accent_color,
            feedback,
            sport_slug,
            sub_team_id,
            team_id,
            mockup_urls,
            designs (
              id,
              name,
              slug,
              description,
              designer_name,
              design_mockups (
                id,
                mockup_url,
                is_primary,
                view_angle,
                product_type_slug
              )
            ),
            institution_sub_teams (
              id,
              name,
              slug
            ),
            teams!team_id (
              id,
              name,
              slug,
              team_type
            )
          `)
          .eq('id', id)
          .single();

        if (fetchError) {
          console.error('[Design Request Detail] Error:', fetchError);
          throw fetchError;
        }

        console.log('[Design Request Detail] Loaded:', data);
        console.log('[Design Request Detail] Status:', data.status);
        setDesignRequest(data);

        // Fetch user's role if this is an institution team
        if (data.teams?.team_type === 'institution') {
          const { data: { user }, error: authError } = await supabase.auth.getUser();

          if (!authError && user) {
            const { data: membership } = await supabase
              .from('team_memberships')
              .select('institution_role')
              .eq('team_id', data.team_id)
              .eq('user_id', user.id)
              .maybeSingle();

            if (membership?.institution_role === 'athletic_director') {
              setUserRole('athletic_director');
            } else if (membership?.institution_role === 'assistant') {
              setUserRole('assistant');
            } else if (data.sub_team_id) {
              const { data: subTeam } = await supabase
                .from('institution_sub_teams')
                .select('head_coach_user_id')
                .eq('id', data.sub_team_id)
                .single();

              if (subTeam?.head_coach_user_id === user.id) {
                setUserRole('coach');
              } else {
                setUserRole('player');
              }
            } else {
              setUserRole('player');
            }
          }
        }

        // Set initial selected mockup
        if (data.mockup_urls && data.mockup_urls.length > 0) {
          setSelectedMockup({
            id: `admin-mockup-0`,
            mockup_url: data.mockup_urls[0],
            is_primary: true,
            view_angle: 'front',
            product_type_slug: 'custom'
          } as DesignMockup);
        } else if (data.designs?.design_mockups && data.designs.design_mockups.length > 0) {
          const primary = data.designs.design_mockups.find((m: any) => m.is_primary);
          setSelectedMockup(primary || data.designs.design_mockups[0] || null);
        }
      } catch (err: any) {
        console.error('[Design Request Detail] Failed:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadDesignRequest();
  }, [id, isDeleted]);

  useEffect(() => {
    async function loadDesigns() {
      if (!showDesignBrowser || availableDesigns.length > 0 || !designRequest?.sport_slug) return;

      setDesignsLoading(true);
      try {
        const supabase = getBrowserClient();
        const { data, error } = await supabase
          .from('designs')
          .select(`
            id,
            name,
            slug,
            description,
            designer_name,
            design_mockups!inner (
              id,
              mockup_url,
              is_primary,
              view_angle,
              product_type_slug
            )
          `)
          .eq('sport_slug', designRequest.sport_slug)
          .order('created_at', { ascending: false });

        if (error) throw error;
        setAvailableDesigns(data || []);
      } catch (err: any) {
        console.error('[Design Browser] Error loading designs:', err);
        alert('Error al cargar diseños. Por favor intenta nuevamente.');
      } finally {
        setDesignsLoading(false);
      }
    }

    loadDesigns();
  }, [showDesignBrowser, availableDesigns.length, designRequest?.sport_slug]);

  const handleApprove = async () => {
    if (!designRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to approve design');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Approve error:', err);
      alert('Error al aprobar el diseño. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!designRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'rejected' }),
      });

      if (!response.ok) {
        throw new Error('Failed to reject design');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Reject error:', err);
      alert('Error al rechazar el diseño. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertApproval = async () => {
    if (!designRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'ready' }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert approval');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Revert approval error:', err);
      alert('Error al revertir la aprobación. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleConfirmProduction = async () => {
    if (!designRequest) return;

    const confirmed = window.confirm(
      '¿Confirmar este diseño como listo para producción? Esto creará la orden de producción.'
    );

    if (!confirmed) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'design_ready' }),
      });

      if (!response.ok) {
        throw new Error('Failed to confirm production');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Confirm production error:', err);
      alert('Error al confirmar producción. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevertProduction = async () => {
    if (!designRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'approved' }),
      });

      if (!response.ok) {
        throw new Error('Failed to revert production status');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Revert production error:', err);
      alert('Error al revertir el estado de producción. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequestChanges = async () => {
    if (!designRequest || !feedbackText.trim()) {
      alert('Por favor ingresa tus comentarios antes de solicitar cambios.');
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'changes_requested',
          feedback: feedbackText,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to request changes');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Request] Request changes error:', err);
      alert('Error al solicitar cambios. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
      setShowFeedbackModal(false);
      setFeedbackText('');
    }
  };

  const handleDelete = async () => {
    if (!designRequest) return;

    setDeleteLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to delete design request');
      }

      setIsDeleted(true);
      setShowDeleteModal(false);
      window.location.href = `/mi-equipo/${slug}`;
    } catch (err: any) {
      console.error('[Design Request] Delete error:', err);
      alert(err.message || 'Error al eliminar la solicitud de diseño. Por favor intenta nuevamente.');
      setDeleteLoading(false);
      setShowDeleteModal(false);
    }
  };

  const handleDesignSelect = async (designId: string) => {
    if (!designRequest) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/design-requests/${designRequest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'pending',
          design_id: designId,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update design');
      }

      window.location.reload();
    } catch (err: any) {
      console.error('[Design Browser] Error updating design:', err);
      alert('Error al actualizar el diseño. Por favor intenta nuevamente.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return <LoadingState />;
  }

  if (error || !designRequest) {
    return <ErrorState error={error} onBack={() => router.back()} />;
  }

  return (
    <div className="min-h-screen bg-black">
      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        <PageHeader
          designRequest={designRequest}
          onBack={() => router.back()}
          onDelete={() => setShowDeleteModal(true)}
        />

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <DesignMockupViewer
              selectedMockup={selectedMockup}
              designRequest={designRequest}
              userRole={userRole}
              actionLoading={actionLoading}
              onApprove={handleApprove}
              onReject={handleReject}
              onRevertApproval={handleRevertApproval}
              onRevertProduction={handleRevertProduction}
              onConfirmProduction={handleConfirmProduction}
              onRequestChanges={() => setShowFeedbackModal(true)}
              onBrowseDesigns={() => setShowDesignBrowser(true)}
              onMockupSelect={setSelectedMockup}
            />
          </div>

          <div className="space-y-6">
            <DesignInfo designRequest={designRequest} />
            <ColorPalette designRequest={designRequest} />
            <FeedbackSection designRequest={designRequest} />
          </div>
        </div>
      </div>

      <FeedbackModal
        isOpen={showFeedbackModal}
        feedbackText={feedbackText}
        loading={actionLoading}
        onClose={() => {
          setShowFeedbackModal(false);
          setFeedbackText('');
        }}
        onFeedbackChange={setFeedbackText}
        onSubmit={handleRequestChanges}
      />

      <DesignBrowserModal
        isOpen={showDesignBrowser}
        loading={designsLoading}
        actionLoading={actionLoading}
        designs={availableDesigns}
        onClose={() => setShowDesignBrowser(false)}
        onDesignSelect={handleDesignSelect}
      />

      <DeleteModal
        isOpen={showDeleteModal}
        loading={deleteLoading}
        designRequest={designRequest}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
