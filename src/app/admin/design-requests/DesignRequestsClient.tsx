'use client';

import { useState } from 'react';
import Image from 'next/image';
import { getBrowserClient } from '@/lib/supabase/client';
import { logger } from '@/lib/logger';

interface DesignRequest {
  id: string;
  user_id: string;
  team_slug: string;
  product_slug: string;
  product_name: string;
  sport_slug: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  selected_apparel: Record<string, boolean>;
  uniform_details: {
    sleeve: string;
    neck: string;
    fit: string;
  };
  logo_url?: string;
  logo_placements: Record<string, boolean>;
  names_numbers: boolean;
  user_type: string;
  status: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
  teams?: {
    name: string;
    slug: string;
  };
  render_spec?: any;
  output_url?: string;
  mockup_urls?: string[];
  priority?: 'low' | 'medium' | 'high';
  version?: number;
  admin_comments?: Array<{
    text: string;
    created_at: string;
    created_by: string;
  }>;
  approval_status?: string;
  approved_at?: string;
  approved_by?: string;
  revision_count?: number;
}

interface DesignFeedback {
  id: number;
  design_request_id: string;
  user_id: string;
  feedback_type: string;
  message: string;
  requested_changes?: any;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface DesignRequestActivity {
  id: string;
  design_request_id: string;
  action: string;
  description: string;
  metadata?: any;
  created_by: string;
  created_at: string;
  profiles?: {
    email: string;
    full_name?: string;
  };
}

interface Props {
  initialRequests: DesignRequest[];
}

export default function DesignRequestsClient({ initialRequests }: Props) {
  const supabase = getBrowserClient();
  const [requests, setRequests] = useState<DesignRequest[]>(initialRequests);
  const [filter, setFilter] = useState<'all' | 'pending' | 'rendering' | 'ready' | 'cancelled'>('all');
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);
  const [activities, setActivities] = useState<Record<string, DesignRequestActivity[]>>({});
  const [generatingMockup, setGeneratingMockup] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, DesignFeedback[]>>({});
  const [uploadingMockup, setUploadingMockup] = useState<string | null>(null);

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/design-requests/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, status: newStatus }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Refresh from server
      window.location.reload();
    } catch (error: any) {
      logger.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const updateNotes = async (requestId: string, notes: string) => {
    try {
      const response = await fetch('/api/admin/design-requests/update-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, notes }),
      });

      if (!response.ok) throw new Error('Failed to update notes');

      alert('Notas guardadas');
    } catch (error: any) {
      logger.error('Error updating notes:', error);
      alert('Error al guardar notas');
    }
  };

  const updatePriority = async (requestId: string, priority: 'low' | 'medium' | 'high') => {
    try {
      const response = await fetch('/api/admin/design-requests/update-priority', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, priority }),
      });

      if (!response.ok) throw new Error('Failed to update priority');

      window.location.reload();
    } catch (error: any) {
      logger.error('Error updating priority:', error);
      alert('Error al actualizar prioridad');
    }
  };

  const loadActivity = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('design_request_activity')
        .select('*, profiles:created_by(email, full_name)')
        .eq('design_request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setActivities((prev) => ({ ...prev, [requestId]: data || [] }));
    } catch (error) {
      logger.error('Error loading activity:', error);
    }
  };

  const loadFeedback = async (requestId: string) => {
    try {
      const { data, error } = await supabase
        .from('design_feedback')
        .select('*, profiles:user_id(email, full_name)')
        .eq('design_request_id', requestId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setFeedback((prev) => ({ ...prev, [requestId]: data || [] }));
    } catch (error) {
      logger.error('Error loading feedback:', error);
    }
  };

  const generateMockup = async (request: DesignRequest) => {
    if (!request.logo_url) {
      alert('Cannot generate mockup: No base image (logo_url) provided');
      return;
    }

    setGeneratingMockup(request.id);

    try {
      const response = await fetch('/api/recolor-boundary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designRequestId: request.id,
          baseUrl: request.logo_url,
          colors: {
            primary: request.primary_color,
            secondary: request.secondary_color,
            tertiary: request.accent_color,
          },
          n: 1,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to generate mockup');
      }

      alert('Mockup generated successfully!');
      window.location.reload();
    } catch (error: any) {
      logger.error('Error generating mockup:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingMockup(null);
    }
  };

  const addComment = async (requestId: string) => {
    const comment = newComment[requestId]?.trim();
    if (!comment) return;

    try {
      const response = await fetch('/api/admin/design-requests/add-comment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, comment }),
      });

      if (!response.ok) throw new Error('Failed to add comment');

      setNewComment((prev) => ({ ...prev, [requestId]: '' }));
      window.location.reload();
    } catch (error: any) {
      logger.error('Error adding comment:', error);
      alert('Error al agregar comentario');
    }
  };

  const handleMockupUpload = async (requestId: string, files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingMockup(requestId);

    try {
      const formData = new FormData();
      formData.append('designRequestId', requestId);

      // Add all selected files
      Array.from(files).forEach((file, index) => {
        formData.append(`mockup_${index}`, file);
      });

      const response = await fetch('/api/admin/design-requests/upload-mockups', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload mockups');
      }

      const result = await response.json();
      alert(`Successfully uploaded ${result.uploadedCount} mockup(s)!`);

      // Refresh the page to show updated mockups
      window.location.reload();
    } catch (error: any) {
      logger.error('Error uploading mockups:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploadingMockup(null);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
    rendering: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
    ready: 'bg-green-500/20 text-green-300 border border-green-500/50',
    cancelled: 'bg-red-500/20 text-red-300 border border-red-500/50',
  };

  const statusLabels: Record<string, string> = {
    pending: 'Pendiente',
    rendering: 'En proceso',
    ready: 'Listo',
    cancelled: 'Cancelado',
  };

  const filteredRequests = filter === 'all'
    ? requests
    : requests.filter(r => r.status === filter);

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b border-gray-700">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <h1 className="text-3xl font-bold text-white">Design Requests</h1>
          <p className="text-gray-400 mt-1">Manage all customization requests</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Filters */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'pending', 'rendering', 'ready', 'cancelled'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  filter === status
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/50'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {status === 'all' ? 'All' : statusLabels[status]}
                {status !== 'all' && (
                  <span className="ml-2 text-xs opacity-75">
                    ({requests.filter((r) => r.status === status).length})
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Requests List */}
        <div className="space-y-4">
          {filteredRequests.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 p-12 text-center">
              <div className="max-w-md mx-auto">
                <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-gray-400">No requests {filter !== 'all' ? `with status "${statusLabels[filter]}"` : ''}</p>
              </div>
            </div>
          ) : (
            filteredRequests.map((request) => (
              <div key={request.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-3 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{request.product_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[request.status]}`}>
                          {statusLabels[request.status]}
                        </span>
                      </div>

                      {/* Client Email - Prominent */}
                      <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <div>
                            <p className="text-xs text-gray-400 font-medium">Client</p>
                            <p className="text-sm font-semibold text-blue-300">{(request.profiles as any)?.email || 'No email'}</p>
                          </div>
                          <span className="ml-auto px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded-full">
                            {request.user_type === 'player' ? 'Player' : 'Coach'}
                          </span>
                        </div>
                      </div>

                      <div className="text-sm text-gray-400 space-y-1">
                        <p>
                          <span className="font-medium text-gray-300">Team:</span> {(request.teams as any)?.name || 'No team'}{' '}
                          <span className="text-gray-500">({request.team_slug})</span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-300">Sport:</span> {request.sport_slug}
                        </p>
                        <p>
                          <span className="font-medium text-gray-300">Created:</span> {new Date(request.created_at).toLocaleString('en-US')}
                        </p>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedRequest(selectedRequest?.id === request.id ? null : request)}
                        className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors"
                      >
                        {selectedRequest?.id === request.id ? 'Hide details' : 'View details'}
                      </button>
                    </div>
                  </div>

                  {/* Colors Preview */}
                  <div className="flex items-center gap-4 mb-4">
                    <span className="text-sm font-medium text-gray-300">Colors:</span>
                    <div className="flex gap-2">
                      <div
                        className="w-10 h-10 rounded border-2 border-gray-600 shadow-lg"
                        style={{ backgroundColor: request.primary_color }}
                        title={`Primary: ${request.primary_color}`}
                      />
                      <div
                        className="w-10 h-10 rounded border-2 border-gray-600 shadow-lg"
                        style={{ backgroundColor: request.secondary_color }}
                        title={`Secondary: ${request.secondary_color}`}
                      />
                      <div
                        className="w-10 h-10 rounded border-2 border-gray-600 shadow-lg"
                        style={{ backgroundColor: request.accent_color }}
                        title={`Accent: ${request.accent_color}`}
                      />
                    </div>
                    <div className="ml-auto flex gap-2 text-xs text-gray-400">
                      <span className="px-2 py-1 bg-gray-800 rounded">{request.primary_color}</span>
                      <span className="px-2 py-1 bg-gray-800 rounded">{request.secondary_color}</span>
                      <span className="px-2 py-1 bg-gray-800 rounded">{request.accent_color}</span>
                    </div>
                  </div>

                  {/* Status Update */}
                  <div className="border-t border-gray-700 pt-4">
                    <label className="block text-sm font-medium text-gray-300 mb-2">Change status:</label>
                    <div className="flex gap-2 flex-wrap">
                      {(['pending', 'rendering', 'ready', 'cancelled'] as const).map((status) => (
                        <button
                          key={status}
                          onClick={() => updateStatus(request.id, status)}
                          disabled={request.status === status}
                          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                            request.status === status
                              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                              : 'bg-blue-600 text-white hover:bg-700'
                          }`}
                        >
                          {statusLabels[status]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {selectedRequest?.id === request.id && (
                  <div className="border-t border-gray-700 bg-gray-900/50 p-6">
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="text-sm text-gray-300">
                          <strong>Team Slug:</strong> {request.team_slug}
                        </div>
                        <div className="text-sm text-gray-300">
                          <strong>Sport:</strong> {request.sport_slug}
                        </div>
                      </div>

                      {/* Current Mockups */}
                      {request.mockup_urls && request.mockup_urls.length > 0 && (
                        <div>
                          <h4 className="text-sm font-semibold text-gray-300 mb-3">Current Mockups ({request.mockup_urls.length})</h4>
                          <div className="grid grid-cols-3 gap-3">
                            {request.mockup_urls.map((url, idx) => (
                              <div key={idx} className="relative group">
                                <Image
                                  src={url}
                                  alt={`Mockup ${idx + 1}`}
                                  width={200}
                                  height={200}
                                  className="rounded-lg border-2 border-gray-600 w-full h-32 object-cover"
                                />
                                <div className="absolute top-2 right-2 bg-gray-900/80 text-white text-xs px-2 py-1 rounded">
                                  #{idx + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Upload Mockups Section */}
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="text-sm font-semibold text-gray-300 mb-3">Upload New Mockups</h4>
                        <div className="flex items-center gap-3">
                          <input
                            type="file"
                            id={`mockup-upload-${request.id}`}
                            accept="image/*"
                            multiple
                            onChange={(e) => handleMockupUpload(request.id, e.target.files)}
                            disabled={uploadingMockup === request.id}
                            className="hidden"
                          />
                          <label
                            htmlFor={`mockup-upload-${request.id}`}
                            className={`px-6 py-3 rounded-lg font-semibold cursor-pointer transition-colors flex items-center gap-2 ${
                              uploadingMockup === request.id
                                ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                                : 'bg-green-600 hover:bg-green-700 text-white'
                            }`}
                          >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                            </svg>
                            {uploadingMockup === request.id ? 'Uploading...' : 'Upload Mockup Images'}
                          </label>
                          <span className="text-xs text-gray-400">
                            Select one or more images (JPG, PNG, etc.)
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          💡 Tip: After uploading mockups, change status to "Listo" (Ready) so the customer can review and approve the design.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
