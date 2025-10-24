'use client';

import { useState } from 'react';
import Image from 'next/image';
import { toast } from 'sonner';
import type { DesignRequestDetail } from '@/types/clients';
import type { MockupPreference, DesignRequestMockups } from '@/types/design-request';

interface DesignRequestCardProps {
  request: DesignRequestDetail;
  onRefresh: () => void;
  isExpanded: boolean;
  onToggleExpand: () => void;
}

const DESIGN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'yellow' },
  { value: 'rendering', label: 'En proceso', color: 'blue' },
  { value: 'ready', label: 'Listo', color: 'green' },
  { value: 'cancelled', label: 'Cancelado', color: 'red' },
];

export default function DesignRequestCard({ request, onRefresh, isExpanded, onToggleExpand }: DesignRequestCardProps) {
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);

  // Type-safe access to mockup preference and structured mockups
  const mockupPreference = (request as any).mockup_preference as MockupPreference | undefined;
  const structuredMockups = (request as any).mockups as DesignRequestMockups | undefined;

  const handleSlotUpload = async (file: File, slot: 'home_front' | 'home_back' | 'away_front' | 'away_back') => {
    setUploadingSlot(slot);
    setUploadingMockup(true);

    // Show loading toast
    toast.loading(`Uploading ${slot.replace('_', ' ')} mockup...`, { id: `upload-${slot}` });

    try {
      const formData = new FormData();
      formData.append('designRequestId', request.id);
      formData.append('file', file);
      formData.append('slot', slot);

      const response = await fetch('/api/admin/design-requests/upload-mockups', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload mockup');
      }

      // Success toast
      toast.success(`Successfully uploaded ${slot.replace('_', ' ')} mockup!`, { id: `upload-${slot}` });
      onRefresh();
    } catch (error: any) {
      console.error('Error uploading mockup:', error);
      // Error toast
      toast.error(`Error: ${error.message}`, { id: `upload-${slot}` });
    } finally {
      setUploadingMockup(false);
      setUploadingSlot(null);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);

    // Show loading toast
    toast.loading('Updating status...', { id: 'status-update' });

    try {
      const response = await fetch('/api/admin/design-requests/update-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requestId: request.id,
          status: newStatus
        }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Success toast
      toast.success('Status updated successfully!', { id: 'status-update' });
      onRefresh();
    } catch (error: any) {
      console.error('Error updating status:', error);
      // Error toast
      toast.error('Error updating status', { id: 'status-update' });
    } finally {
      setUpdatingStatus(false);
    }
  };

  const statusColors: Record<string, string> = {
    pending: 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/50',
    rendering: 'bg-blue-500/20 text-blue-300 border border-blue-500/50',
    ready: 'bg-green-500/20 text-green-300 border border-green-500/50',
    cancelled: 'bg-red-500/20 text-red-300 border border-red-500/50',
  };

  const statusLabel = DESIGN_STATUS_OPTIONS.find(s => s.value === request.status)?.label || request.status;

  // Helper to get gender badge
  const getGenderBadge = (gender: 'male' | 'female' | 'both' | undefined) => {
    if (!gender) return null;
    const genderConfig = {
      male: { icon: '♂', label: 'Men', color: 'bg-blue-500/20 text-blue-300 border-blue-500/50' },
      female: { icon: '♀', label: 'Women', color: 'bg-pink-500/20 text-pink-300 border-pink-500/50' },
      both: { icon: '⚥', label: 'Co-ed', color: 'bg-purple-500/20 text-purple-300 border-purple-500/50' }
    };
    const config = genderConfig[gender];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${config.color}`}>
        <span>{config.icon}</span>
        <span>{config.label}</span>
      </span>
    );
  };

  const subTeam = request.institution_sub_teams;

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden hover:border-[#e21c21]/50 transition-all">
      <div className="p-4">
        {/* Team/Gender Info Bar - Only show if sub-team data available */}
        {subTeam && (
          <div className="mb-3 pb-3 border-b border-gray-700">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs text-gray-500 font-medium">Team:</span>
              <span className="text-sm text-white font-semibold">{subTeam.name}</span>
              {subTeam.gender_category && getGenderBadge(subTeam.gender_category)}
              {subTeam.sports?.name && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-gray-700/50 text-gray-300 border border-gray-600">
                  {subTeam.sports.name}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-white font-semibold">{request.product_name || 'Design Request'}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-semibold ${statusColors[request.status]}`}>
                {statusLabel}
              </span>
            </div>
            <div className="text-sm text-gray-400">
              Created {new Date(request.created_at).toLocaleDateString()}
            </div>
          </div>
          <button
            onClick={onToggleExpand}
            className="px-3 py-1 bg-gray-700/50 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            {isExpanded ? 'Hide' : 'Manage'}
          </button>
        </div>

        {/* Colors Preview */}
        {(request.primary_color || request.secondary_color || request.accent_color) && (
          <div className="flex gap-2 mb-3">
            {request.primary_color && (
              <div
                className="w-8 h-8 rounded border-2 border-gray-600"
                style={{ backgroundColor: request.primary_color }}
                title={`Primary: ${request.primary_color}`}
              />
            )}
            {request.secondary_color && (
              <div
                className="w-8 h-8 rounded border-2 border-gray-600"
                style={{ backgroundColor: request.secondary_color}}
                title={`Secondary: ${request.secondary_color}`}
              />
            )}
            {request.accent_color && (
              <div
                className="w-8 h-8 rounded border-2 border-gray-600"
                style={{ backgroundColor: request.accent_color }}
                title={`Accent: ${request.accent_color}`}
              />
            )}
          </div>
        )}

        {/* Expanded Management Section */}
        {isExpanded && (
          <div className="border-t border-gray-700 pt-4 mt-4 space-y-4">
            {/* Update Status */}
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-2">Update Status</h5>
              <div className="flex gap-2 flex-wrap">
                {DESIGN_STATUS_OPTIONS.map((statusOption) => (
                  <button
                    key={statusOption.value}
                    onClick={() => handleStatusUpdate(statusOption.value)}
                    disabled={updatingStatus || request.status === statusOption.value}
                    className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-all ${
                      request.status === statusOption.value
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                        : statusOption.color === 'green'
                        ? 'bg-green-500/90 hover:bg-green-500 text-white'
                        : statusOption.color === 'blue'
                        ? 'bg-blue-500/90 hover:bg-blue-500 text-white'
                        : statusOption.color === 'red'
                        ? 'bg-red-500/90 hover:bg-red-500 text-white'
                        : 'bg-yellow-500/90 hover:bg-yellow-500 text-white'
                    }`}
                  >
                    {statusOption.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mockup Preference Display */}
            {mockupPreference && (
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">Mockup Preference</h5>
                <div className="px-3 py-2 bg-blue-500/20 text-blue-300 rounded border border-blue-500/30 text-sm inline-block">
                  {mockupPreference === 'home' ? '🏠 Home Only' :
                   mockupPreference === 'away' ? '✈️ Away Only' :
                   '🏠 + ✈️ Both (Home & Away)'}
                </div>
              </div>
            )}

            {/* Structured Mockup Uploads */}
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-3">Mockup Uploads</h5>
              <div className="space-y-4">
                {/* Home Mockups */}
                {(mockupPreference === 'home' || mockupPreference === 'both' || !mockupPreference) && (
                  <div className="border border-gray-700 rounded-lg p-3">
                    <h6 className="text-xs font-semibold text-gray-400 mb-3">🏠 Home Colors</h6>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Home Front */}
                      <MockupSlot
                        label="Front"
                        currentUrl={structuredMockups?.home?.front}
                        onUpload={(file) => handleSlotUpload(file, 'home_front')}
                        uploading={uploadingSlot === 'home_front'}
                        requestId={request.id}
                        slotId="home_front"
                      />
                      {/* Home Back */}
                      <MockupSlot
                        label="Back"
                        currentUrl={structuredMockups?.home?.back}
                        onUpload={(file) => handleSlotUpload(file, 'home_back')}
                        uploading={uploadingSlot === 'home_back'}
                        requestId={request.id}
                        slotId="home_back"
                      />
                    </div>
                  </div>
                )}

                {/* Away Mockups */}
                {(mockupPreference === 'away' || mockupPreference === 'both') && (
                  <div className="border border-gray-700 rounded-lg p-3">
                    <h6 className="text-xs font-semibold text-gray-400 mb-3">✈️ Away Colors</h6>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Away Front */}
                      <MockupSlot
                        label="Front"
                        currentUrl={structuredMockups?.away?.front}
                        onUpload={(file) => handleSlotUpload(file, 'away_front')}
                        uploading={uploadingSlot === 'away_front'}
                        requestId={request.id}
                        slotId="away_front"
                      />
                      {/* Away Back */}
                      <MockupSlot
                        label="Back"
                        currentUrl={structuredMockups?.away?.back}
                        onUpload={(file) => handleSlotUpload(file, 'away_back')}
                        uploading={uploadingSlot === 'away_back'}
                        requestId={request.id}
                        slotId="away_back"
                      />
                    </div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 After uploading all mockups, change status to &quot;Listo&quot; so customer can review
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// MockupSlot Component for individual mockup uploads
interface MockupSlotProps {
  label: string;
  currentUrl?: string;
  onUpload: (file: File) => void;
  uploading: boolean;
  requestId: string;
  slotId: string;
}

function MockupSlot({ label, currentUrl, onUpload, uploading, requestId, slotId }: MockupSlotProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  return (
    <div className="flex flex-col">
      <label className="text-xs text-gray-400 mb-1 font-medium">{label}</label>

      {/* Current Mockup Preview */}
      {currentUrl ? (
        <div className="relative group mb-2">
          <Image
            src={currentUrl}
            alt={`${label} mockup`}
            width={200}
            height={200}
            className="rounded border-2 border-gray-600 w-full h-32 object-cover group-hover:border-green-500 transition-colors"
          />
          <a
            href={currentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity rounded"
          >
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </a>
          <div className="absolute top-1 right-1 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded font-semibold">
            ✓ Uploaded
          </div>
        </div>
      ) : (
        <div className="w-full h-32 bg-gray-800/50 border-2 border-dashed border-gray-600 rounded flex items-center justify-center mb-2">
          <span className="text-xs text-gray-500">No mockup yet</span>
        </div>
      )}

      {/* Upload Button */}
      <input
        type="file"
        id={`${requestId}-${slotId}`}
        accept="image/*"
        onChange={handleFileChange}
        disabled={uploading}
        className="hidden"
      />
      <label
        htmlFor={`${requestId}-${slotId}`}
        className={`flex items-center justify-center gap-1 px-3 py-1.5 rounded text-xs font-semibold cursor-pointer transition-all ${
          uploading
            ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
            : currentUrl
            ? 'bg-blue-500/80 hover:bg-blue-500 text-white'
            : 'bg-green-500/80 hover:bg-green-500 text-white'
        }`}
      >
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
        </svg>
        <span>{uploading ? 'Uploading...' : currentUrl ? 'Replace' : 'Upload'}</span>
      </label>
    </div>
  );
}
