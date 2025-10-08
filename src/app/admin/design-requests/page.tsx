'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';

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
  // Recolor system fields
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

export default function AdminDesignRequestsPage() {
  const router = useRouter();
  const supabase = getBrowserClient();

  const [requests, setRequests] = useState<DesignRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'rendering' | 'ready' | 'cancelled'>('all');
  const [selectedRequest, setSelectedRequest] = useState<DesignRequest | null>(null);
  const [activities, setActivities] = useState<Record<string, DesignRequestActivity[]>>({});
  const [generatingMockup, setGeneratingMockup] = useState<string | null>(null);
  const [newComment, setNewComment] = useState<Record<string, string>>({});

  useEffect(() => {
    checkAdminAndLoadRequests();
  }, [filter]);

  const checkAdminAndLoadRequests = async () => {
    try {
      // Check if user is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/');
        return;
      }

      // Check if user is admin
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', user.id)
        .single();

      if (!profile?.is_admin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);

      // Load design requests
      let query = supabase
        .from('design_requests')
        .select(`
          *,
          profiles:user_id (email, full_name),
          teams:team_slug (name, slug)
        `)
        .order('created_at', { ascending: false });

      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error loading design requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (requestId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('design_requests')
        .update({ status: newStatus })
        .eq('id', requestId);

      if (error) throw error;

      // Refresh list
      await checkAdminAndLoadRequests();
      alert(`Estado actualizado a: ${newStatus}`);
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error al actualizar el estado');
    }
  };

  const updateNotes = async (requestId: string, notes: string) => {
    try {
      const { error } = await supabase
        .from('design_requests')
        .update({ notes })
        .eq('id', requestId);

      if (error) throw error;

      await checkAdminAndLoadRequests();
      alert('Notas guardadas');
    } catch (error: any) {
      console.error('Error updating notes:', error);
      alert('Error al guardar notas');
    }
  };

  const updatePriority = async (requestId: string, priority: 'low' | 'medium' | 'high') => {
    try {
      const { error } = await supabase
        .from('design_requests')
        .update({ priority })
        .eq('id', requestId);

      if (error) throw error;

      await checkAdminAndLoadRequests();
    } catch (error: any) {
      console.error('Error updating priority:', error);
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
      console.error('Error loading activity:', error);
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
      await checkAdminAndLoadRequests();
    } catch (error: any) {
      console.error('Error generating mockup:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setGeneratingMockup(null);
    }
  };

  const addComment = async (requestId: string) => {
    const comment = newComment[requestId]?.trim();
    if (!comment) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: request } = await supabase
        .from('design_requests')
        .select('admin_comments')
        .eq('id', requestId)
        .single();

      const currentComments = request?.admin_comments || [];
      const updatedComments = [
        ...currentComments,
        {
          text: comment,
          created_at: new Date().toISOString(),
          created_by: user.id,
        },
      ];

      const { error } = await supabase
        .from('design_requests')
        .update({ admin_comments: updatedComments })
        .eq('id', requestId);

      if (error) throw error;

      setNewComment((prev) => ({ ...prev, [requestId]: '' }));
      await checkAdminAndLoadRequests();
    } catch (error: any) {
      console.error('Error adding comment:', error);
      alert('Error al agregar comentario');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null; // Will redirect
  }

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
          {requests.length === 0 ? (
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
            requests.map((request) => (
              <div key={request.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl shadow-xl border border-gray-700 overflow-hidden hover:border-purple-500/50 transition-all">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2 flex-wrap">
                        <h3 className="text-xl font-bold text-white">{request.product_name}</h3>
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${statusColors[request.status]}`}>
                          {statusLabels[request.status]}
                        </span>
                        {request.priority && (
                          <select
                            value={request.priority}
                            onChange={(e) => updatePriority(request.id, e.target.value as any)}
                            className={`px-3 py-1 rounded-full text-xs font-semibold border cursor-pointer ${
                              request.priority === 'high'
                                ? 'bg-red-500/20 text-red-300 border-red-500/50'
                                : request.priority === 'medium'
                                ? 'bg-orange-500/20 text-orange-300 border-orange-500/50'
                                : 'bg-gray-500/20 text-gray-300 border-gray-500/50'
                            }`}
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        )}
                        {request.version && request.version > 1 && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs rounded border border-purple-500/50">
                            v{request.version}
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-gray-400 space-y-1">
                        <p>
                          <span className="font-medium text-gray-300">Team:</span> {(request.teams as any)?.name || 'No team'}{' '}
                          <span className="text-gray-500">({request.team_slug})</span>
                        </p>
                        <p>
                          <span className="font-medium text-gray-300">User:</span> {(request.profiles as any)?.email}{' '}
                          <span className="text-gray-500">({request.user_type === 'player' ? 'Player' : 'Coach'})</span>
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
                        className="w-10 h-10 rounded border-2 border-gray-600"
                        style={{ backgroundColor: request.primary_color }}
                        title="Primary"
                      />
                      <div
                        className="w-10 h-10 rounded border-2 border-gray-600"
                        style={{ backgroundColor: request.secondary_color }}
                        title="Secondary"
                      />
                      <div
                        className="w-10 h-10 rounded border-2 border-gray-600"
                        style={{ backgroundColor: request.accent_color }}
                        title="Accent"
                      />
                    </div>
                  </div>

                  {/* Mockup Section */}
                  {(request.output_url || request.mockup_urls?.length) && (
                    <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-white">Generated Mockups</h4>
                        {request.output_url && (
                          <a
                            href={request.output_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded font-medium transition-colors"
                          >
                            Download Latest
                          </a>
                        )}
                      </div>
                      <div className="flex gap-4 overflow-x-auto">
                        {request.mockup_urls?.map((url, idx) => (
                          <div key={idx} className="flex-shrink-0">
                            <Image
                              src={url}
                              alt={`Mockup ${idx + 1}`}
                              width={200}
                              height={200}
                              className="rounded-lg border-2 border-gray-600 object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generate Mockup Button */}
                  {request.logo_url && (
                    <div className="mb-4">
                      <button
                        onClick={() => generateMockup(request)}
                        disabled={generatingMockup === request.id || request.status === 'rendering'}
                        className="px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-purple-500/50 flex items-center gap-2"
                      >
                        {generatingMockup === request.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            Generating mockup...
                          </>
                        ) : (
                          <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                              />
                            </svg>
                            Generate Mockup with AI
                          </>
                        )}
                      </button>
                    </div>
                  )}

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
                              : 'bg-blue-600 text-white hover:bg-blue-700'
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
                    {/* Load activity on expand */}
                    {(() => {
                      if (!activities[request.id]) {
                        loadActivity(request.id);
                      }
                      return null;
                    })()}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Left Column */}
                      <div className="space-y-4">
                        {/* Logo */}
                        {request.logo_url && (
                          <div>
                            <h4 className="text-sm font-semibold text-white mb-2">Team Logo</h4>
                            <div className="w-32 h-32 rounded-lg bg-gray-800 border-2 border-gray-600 overflow-hidden">
                              <Image
                                src={request.logo_url}
                                alt="Team logo"
                                width={128}
                                height={128}
                                className="object-cover"
                              />
                            </div>
                          </div>
                        )}

                        {/* Apparel Selection */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Selected Items</h4>
                          <div className="flex flex-wrap gap-2">
                            {Object.entries(request.selected_apparel)
                              .filter(([, selected]) => selected)
                              .map(([item]) => (
                                <span
                                  key={item}
                                  className="px-3 py-1 bg-green-500/20 text-green-300 text-sm rounded-full capitalize border border-green-500/50"
                                >
                                  {item}
                                </span>
                              ))}
                          </div>
                        </div>

                        {/* Uniform Details */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Uniform Details</h4>
                          <ul className="text-sm text-gray-400 space-y-1">
                            <li>• Sleeve: {request.uniform_details.sleeve === 'short' ? 'Short' : 'Long'}</li>
                            <li>
                              • Neck:{' '}
                              {request.uniform_details.neck === 'crew'
                                ? 'Crew'
                                : request.uniform_details.neck === 'v'
                                ? 'V-Neck'
                                : 'Polo'}
                            </li>
                            <li>• Fit: {request.uniform_details.fit === 'athletic' ? 'Athletic' : 'Relaxed'}</li>
                          </ul>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-4">
                        {/* Logo Placements */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Logo Placements</h4>
                          <ul className="text-sm text-gray-400 space-y-1">
                            {Object.entries(request.logo_placements)
                              .filter(([, selected]) => selected)
                              .map(([placement]) => {
                                const labels: Record<string, string> = {
                                  front: 'Front',
                                  back: 'Back',
                                  sleeveLeft: 'Left Sleeve',
                                  sleeveRight: 'Right Sleeve',
                                };
                                return <li key={placement}>• {labels[placement] || placement}</li>;
                              })}
                          </ul>
                        </div>

                        {/* Names and Numbers */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Names & Numbers</h4>
                          <p className="text-sm text-gray-400">
                            {request.names_numbers ? '✓ Yes, with personalization' : '✗ No personalization'}
                          </p>
                        </div>

                        {/* Quick Admin Notes */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Quick Notes</h4>
                          <textarea
                            defaultValue={request.notes || ''}
                            onBlur={(e) => {
                              if (e.target.value !== request.notes) {
                                updateNotes(request.id, e.target.value);
                              }
                            }}
                            placeholder="Add internal notes about this request..."
                            className="w-full px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm placeholder-gray-500"
                            rows={3}
                          />
                        </div>

                        {/* Admin Comments */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Admin Comments</h4>
                          <div className="space-y-2 mb-3 max-h-40 overflow-y-auto">
                            {request.admin_comments && request.admin_comments.length > 0 ? (
                              request.admin_comments.map((comment, idx) => (
                                <div key={idx} className="p-2 bg-gray-800 rounded text-xs border border-gray-700">
                                  <p className="text-gray-300">{comment.text}</p>
                                  <p className="text-gray-500 text-[10px] mt-1">
                                    {new Date(comment.created_at).toLocaleString()}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-xs">No comments yet</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={newComment[request.id] || ''}
                              onChange={(e) => setNewComment((prev) => ({ ...prev, [request.id]: e.target.value }))}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  addComment(request.id);
                                }
                              }}
                              placeholder="Add a comment..."
                              className="flex-1 px-3 py-2 bg-gray-800 border border-gray-600 text-white rounded-lg text-xs focus:ring-2 focus:ring-blue-500"
                            />
                            <button
                              onClick={() => addComment(request.id)}
                              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium"
                            >
                              Add
                            </button>
                          </div>
                        </div>

                        {/* Activity Timeline */}
                        <div>
                          <h4 className="text-sm font-semibold text-white mb-2">Activity Timeline</h4>
                          <div className="space-y-2 max-h-60 overflow-y-auto">
                            {activities[request.id]?.length ? (
                              activities[request.id].map((activity) => (
                                <div key={activity.id} className="flex gap-2 text-xs">
                                  <div className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-blue-500"></div>
                                  <div className="flex-1">
                                    <p className="text-gray-300 font-medium">{activity.action.replace(/_/g, ' ')}</p>
                                    <p className="text-gray-500">{activity.description}</p>
                                    <p className="text-gray-600 text-[10px] mt-0.5">
                                      {new Date(activity.created_at).toLocaleString()} •{' '}
                                      {(activity.profiles as any)?.email || 'System'}
                                    </p>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <p className="text-gray-500 text-xs">No activity yet</p>
                            )}
                          </div>
                        </div>

                        {/* View Team Link */}
                        <div>
                          <a
                            href={`/mi-equipo/${request.team_slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-all shadow-lg hover:shadow-blue-500/50"
                          >
                            View Team Page
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                              />
                            </svg>
                          </a>
                        </div>
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
