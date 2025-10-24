'use client';

import { useState, useRef, useEffect } from 'react';
import { logger } from '@/lib/logger';

interface Design {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  mockup_count?: number;
  available_sports?: string[];
  design_mockups?: any[];
}

interface ImageWithName {
  file: File;
  previewUrl: string;
  name: string;
}

interface BulkUploadModalProps {
  designs: Design[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function BulkUploadModal({ designs, onClose, onSuccess }: BulkUploadModalProps) {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [images, setImages] = useState<ImageWithName[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number; currentName: string }>({
    current: 0,
    total: 0,
    currentName: '',
  });
  const [errors, setErrors] = useState<{ name: string; error: string }[]>([]);
  const [successes, setSuccesses] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const templateDesign = designs.find((d) => d.id === selectedTemplateId);

  // Keyboard shortcut: Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isUploading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isUploading, onClose]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validate file types and size
    const validFiles: ImageWithName[] = [];
    const maxSize = 5 * 1024 * 1024; // 5MB

    Array.from(files).forEach((file) => {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert(`${file.name} is not an image file`);
        return;
      }

      // Check file size
      if (file.size > maxSize) {
        alert(`${file.name} is too large (max 5MB)`);
        return;
      }

      // Create preview URL
      const previewUrl = URL.createObjectURL(file);

      // Auto-generate name from filename (remove extension, clean up)
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, '');
      const cleanName = nameWithoutExt
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, (l) => l.toUpperCase());

      validFiles.push({
        file,
        previewUrl,
        name: cleanName,
      });
    });

    setImages((prev) => [...prev, ...validFiles]);

    // Reset input to allow selecting the same files again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const updateImageName = (index: number, name: string) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, name } : img)));
  };

  const removeImage = (index: number) => {
    setImages((prev) => {
      const newImages = [...prev];
      URL.revokeObjectURL(newImages[index].previewUrl);
      newImages.splice(index, 1);
      return newImages;
    });
  };

  const handleSubmit = async () => {
    // Validation
    if (!selectedTemplateId) {
      alert('Please select a template design');
      return;
    }

    if (images.length === 0) {
      alert('Please select at least one image');
      return;
    }

    // Check all images have names
    const emptyNames = images.filter((img) => !img.name.trim());
    if (emptyNames.length > 0) {
      alert('All images must have a name');
      return;
    }

    // Confirm
    if (!confirm(`Create ${images.length} designs based on "${templateDesign?.name}"?`)) {
      return;
    }

    setIsUploading(true);
    setErrors([]);
    setSuccesses([]);
    setUploadProgress({ current: 0, total: images.length, currentName: '' });

    // Create FormData with all images and metadata
    const formData = new FormData();
    formData.append('template_design_id', selectedTemplateId);

    images.forEach((image, index) => {
      formData.append(`images`, image.file);
      formData.append(`names`, image.name);
    });

    try {
      const response = await fetch('/api/admin/designs/bulk', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create designs');
      }

      // Show results
      setSuccesses(result.data.successes || []);
      setErrors(result.data.errors || []);

      // If all successful, close modal and refresh
      if (result.data.errors.length === 0) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      logger.error('Bulk upload error:', error);
      alert(error.message || 'Failed to create designs');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isUploading) {
          onClose();
        }
      }}
    >
      <div
        className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700 max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 sticky top-0 bg-gradient-to-br from-gray-800/95 via-black/85 to-gray-900/95 backdrop-blur-md z-10">
          <div>
            <h2 className="text-2xl font-bold text-white">Bulk Upload Designs</h2>
            <p className="text-sm text-gray-400 mt-1">Create multiple designs from a template</p>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Step 1: Select Template */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              1. Select Template Design <span className="text-red-400">*</span>
            </label>
            <select
              value={selectedTemplateId}
              onChange={(e) => setSelectedTemplateId(e.target.value)}
              disabled={isUploading}
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Choose a template...</option>
              {designs.map((design) => (
                <option key={design.id} value={design.id}>
                  {design.name} ({design.available_sports?.join(', ') || 'no sports'})
                </option>
              ))}
            </select>
            {templateDesign && (
              <div className="mt-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg">
                <p className="text-xs text-gray-400 mb-2">Template settings that will be copied:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <span className="px-2 py-1 bg-gray-700/50 rounded border border-gray-600 text-gray-300">
                    Sports: {templateDesign.available_sports?.join(', ') || 'None'}
                  </span>
                  <span className="px-2 py-1 bg-gray-700/50 rounded border border-gray-600 text-gray-300">
                    Customizable: {templateDesign.is_customizable ? 'Yes' : 'No'}
                  </span>
                  <span className="px-2 py-1 bg-gray-700/50 rounded border border-gray-600 text-gray-300">
                    Recolorable: {templateDesign.allows_recoloring ? 'Yes' : 'No'}
                  </span>
                  {templateDesign.style_tags && templateDesign.style_tags.length > 0 && (
                    <span className="px-2 py-1 bg-gray-700/50 rounded border border-gray-600 text-gray-300">
                      Tags: {templateDesign.style_tags.join(', ')}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Step 2: Upload Images */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              2. Upload Images <span className="text-red-400">*</span>
            </label>
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-600 rounded-lg p-8 text-center hover:border-[#e21c21]/50 transition-colors cursor-pointer bg-gray-800/20"
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
                disabled={isUploading}
                className="hidden"
              />
              <svg className="w-12 h-12 text-gray-500 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="text-white font-medium mb-1">Click to select images</p>
              <p className="text-sm text-gray-400">or drag and drop (max 5MB per image)</p>
            </div>
          </div>

          {/* Step 3: Name Each Design */}
          {images.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                3. Name Each Design ({images.length} image{images.length !== 1 ? 's' : ''})
              </label>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {images.map((image, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 bg-gray-800/50 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                  >
                    {/* Preview */}
                    <div className="w-16 h-16 flex-shrink-0 bg-gray-900 rounded overflow-hidden border border-gray-700">
                      <img src={image.previewUrl} alt={image.name} className="w-full h-full object-cover" />
                    </div>

                    {/* Name Input */}
                    <div className="flex-1">
                      <input
                        type="text"
                        value={image.name}
                        onChange={(e) => updateImageName(index, e.target.value)}
                        disabled={isUploading}
                        placeholder="Design name..."
                        className="w-full px-3 py-2 bg-black/50 border border-gray-700 text-white rounded-lg focus:ring-2 focus:ring-[#e21c21]/50 focus:border-[#e21c21]/50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Slug: {image.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}
                      </p>
                    </div>

                    {/* Remove Button */}
                    <button
                      onClick={() => removeImage(index)}
                      disabled={isUploading}
                      className="p-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      title="Remove image"
                    >
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Progress Display */}
          {isUploading && (
            <div className="p-4 bg-gray-800/50 border border-gray-700 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-300">Creating designs...</span>
                <span className="text-sm text-gray-400">
                  {uploadProgress.current} / {uploadProgress.total}
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#e21c21] h-full transition-all duration-300"
                  style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                ></div>
              </div>
              {uploadProgress.currentName && (
                <p className="text-xs text-gray-400 mt-2">Current: {uploadProgress.currentName}</p>
              )}
            </div>
          )}

          {/* Results Summary */}
          {(successes.length > 0 || errors.length > 0) && !isUploading && (
            <div className="space-y-3">
              {successes.length > 0 && (
                <div className="p-4 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <h4 className="text-green-300 font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Successfully Created ({successes.length})
                  </h4>
                  <ul className="text-sm text-green-200 space-y-1">
                    {successes.map((name, i) => (
                      <li key={i}>• {name}</li>
                    ))}
                  </ul>
                </div>
              )}

              {errors.length > 0 && (
                <div className="p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <h4 className="text-red-300 font-semibold mb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    Failed ({errors.length})
                  </h4>
                  <ul className="text-sm text-red-200 space-y-1">
                    {errors.map((err, i) => (
                      <li key={i}>
                        • {err.name}: {err.error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 p-6 border-t border-gray-700 sticky bottom-0 bg-gradient-to-br from-gray-800/95 via-black/85 to-gray-900/95 backdrop-blur-md">
          <button
            onClick={onClose}
            disabled={isUploading}
            className="px-6 py-3 bg-gray-700/50 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {isUploading ? 'Uploading...' : errors.length > 0 && successes.length > 0 ? 'Close' : 'Cancel'}
          </button>

          <button
            onClick={handleSubmit}
            disabled={isUploading || !selectedTemplateId || images.length === 0}
            className="relative px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Create {images.length} Design{images.length !== 1 ? 's' : ''}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
