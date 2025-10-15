'use client';

import { useState } from 'react';
import Image from 'next/image';
import type { DesignRequestDetail } from '@/types/clients';

interface DesignRequestCardProps {
  request: DesignRequestDetail;
  onRefresh: () => void;
}

const DESIGN_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pendiente', color: 'yellow' },
  { value: 'rendering', label: 'En proceso', color: 'blue' },
  { value: 'ready', label: 'Listo', color: 'green' },
  { value: 'cancelled', label: 'Cancelado', color: 'red' },
];

export default function DesignRequestCard({ request, onRefresh }: DesignRequestCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [uploadingMockup, setUploadingMockup] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const handleMockupUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploadingMockup(true);

    try {
      const formData = new FormData();
      formData.append('designRequestId', request.id);

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
      onRefresh();
    } catch (error: any) {
      console.error('Error uploading mockups:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setUploadingMockup(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdatingStatus(true);

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

      alert('Status updated successfully!');
      onRefresh();
    } catch (error: any) {
      console.error('Error updating status:', error);
      alert('Error updating status');
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

  return (
    <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden hover:border-[#e21c21]/50 transition-all">
      <div className="p-4">
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
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 bg-gray-700/50 hover:bg-gray-700 text-white text-sm rounded transition-colors"
          >
            {expanded ? 'Hide' : 'Manage'}
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
        {expanded && (
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

            {/* Current Mockups */}
            {request.mockup_urls && request.mockup_urls.length > 0 && (
              <div>
                <h5 className="text-sm font-semibold text-gray-300 mb-2">
                  Current Mockups ({request.mockup_urls.length})
                </h5>
                <div className="grid grid-cols-3 gap-2">
                  {request.mockup_urls.map((url, index) => (
                    <div key={index} className="relative group">
                      <Image
                        src={url}
                        alt={`Mockup ${index + 1}`}
                        width={150}
                        height={150}
                        className="rounded border-2 border-gray-600 w-full h-24 object-cover hover:border-[#e21c21] transition-colors"
                      />
                      <div className="absolute top-1 right-1 bg-gray-900/90 text-white text-xs px-1.5 py-0.5 rounded">
                        #{index + 1}
                      </div>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Upload New Mockups */}
            <div>
              <h5 className="text-sm font-semibold text-gray-300 mb-2">Upload New Mockups</h5>
              <input
                type="file"
                id={`mockup-upload-${request.id}`}
                accept="image/*"
                multiple
                onChange={(e) => handleMockupUpload(e.target.files)}
                disabled={uploadingMockup}
                className="hidden"
              />
              <label
                htmlFor={`mockup-upload-${request.id}`}
                className={`flex items-center justify-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm cursor-pointer transition-all ${
                  uploadingMockup
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-br from-green-500/90 via-green-600/80 to-green-700/90 text-white hover:shadow-lg hover:shadow-green-500/30'
                }`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>{uploadingMockup ? 'Uploading...' : 'Upload Images'}</span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                💡 After uploading, change status to "Listo" so customer can review
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
