'use client';

import { useState, useCallback, useMemo } from 'react';
import type { SportSlug } from '@/types/catalog';
import { getFieldLayout } from '@/lib/sports/fieldLayouts';
import { STANDARD_SIZES } from '@/constants/sizing';

interface PlayerInfoFormProps {
  teamId: string;
  userId: string;
  sport: SportSlug;
  onSubmit: (data: PlayerInfoData) => Promise<void>;
  onCancel?: () => void;
  existingData?: PlayerInfoData;
  requireEmail?: boolean; // For collection link flow
  teamName?: string; // To show in email field description
}

export interface PlayerInfoData {
  player_name: string;
  jersey_number: string;
  size: string;
  position: string;
  additional_notes?: string;
  email?: string; // Optional email for collection link flow
}

// Import standard sizes from constants (single source of truth)
const SIZES = STANDARD_SIZES;

export function PlayerInfoForm({ teamId, userId, sport, onSubmit, onCancel, existingData, requireEmail = false, teamName }: PlayerInfoFormProps) {
  const [formData, setFormData] = useState<PlayerInfoData>(existingData || {
    player_name: '',
    jersey_number: '',
    size: 'M',
    position: '',
    additional_notes: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Debug: log sport value
  console.log('[PlayerInfoForm] Sport value:', sport);

  // Default to futbol/soccer if sport is null or undefined
  const normalizedSport = sport || 'soccer';

  // Get positions from field layout for accurate position list
  const fieldLayout = useMemo(() => getFieldLayout(normalizedSport), [normalizedSport]);
  const positions = useMemo(() => fieldLayout.positions.map(pos => pos.name), [fieldLayout]);

  console.log('[PlayerInfoForm] Normalized sport:', normalizedSport);
  console.log('[PlayerInfoForm] Available positions:', positions);

  // Generic input change handler
  const handleInputChange = useCallback((field: keyof PlayerInfoData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.player_name) {
      setError('Please fill in all required fields');
      return;
    }

    // Size is required only when NOT collecting via requireEmail (collection link flow)
    if (!requireEmail && !formData.size) {
      setError('Please select a jersey size');
      return;
    }

    // Validate email if required
    if (requireEmail && !formData.email) {
      setError('Please enter your email address');
      return;
    }

    // More robust email validation: requires proper local part, domain, and TLD
    const emailPattern = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (requireEmail && formData.email && !emailPattern.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Position is optional if no sport is set or no positions available
    if (positions.length > 0 && !formData.position) {
      setError('Please select a position');
      return;
    }

    // Validate that selected position is actually valid for this sport
    if (positions.length > 0 && formData.position && !positions.includes(formData.position)) {
      setError('Invalid position selected for this sport');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit player info');
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, requireEmail, positions, onSubmit]);

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 max-w-2xl mx-auto border border-gray-700 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

      <div className="relative">
        <h2 className="text-2xl font-bold text-white mb-6">
          {existingData ? 'Edit Your Player Information' : 'Submit Your Player Information'}
        </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (for collection link flow) */}
        {requireEmail && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
              placeholder="your.email@example.com"
              required
            />
            <p className="mt-1 text-sm text-gray-400">
              We&apos;ll send you a magic link to join {teamName || 'the team'} and view updates
            </p>
          </div>
        )}

        {/* Player Name */}
        <div>
          <label htmlFor="player_name" className="block text-sm font-medium text-gray-300 mb-2">
            Player Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="player_name"
            value={formData.player_name}
            onChange={(e) => handleInputChange('player_name', e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
            placeholder="Enter your name"
            required
          />
        </div>

        {/* Jersey Number */}
        <div>
          <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-300 mb-2">
            Jersey Number
          </label>
          <input
            type="text"
            id="jersey_number"
            value={formData.jersey_number}
            onChange={(e) => handleInputChange('jersey_number', e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all"
            placeholder="e.g., 10"
            maxLength={3}
          />
        </div>

        {/* Size - Only show if NOT in collection link flow */}
        {!requireEmail && (
          <div>
            <label htmlFor="size" className="block text-sm font-medium text-gray-300 mb-2">
              Jersey Size <span className="text-red-500">*</span>
            </label>
            <select
              id="size"
              value={formData.size}
              onChange={(e) => handleInputChange('size', e.target.value)}
              className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
                backgroundPosition: 'right 0.5rem center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: '1.5em 1.5em',
                paddingRight: '2.5rem'
              }}
              required
            >
              {SIZES.map((size) => (
                <option key={size} value={size} className="bg-black text-white">
                  {size}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Position */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-gray-300 mb-2">
            Position <span className="text-red-500">*</span>
          </label>
          <select
            id="position"
            value={formData.position}
            onChange={(e) => handleInputChange('position', e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all appearance-none cursor-pointer"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
              backgroundPosition: 'right 0.5rem center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: '1.5em 1.5em',
              paddingRight: '2.5rem'
            }}
            required
          >
            <option value="" className="bg-black text-white">Select position</option>
            {positions.map((pos) => (
              <option key={pos} value={pos} className="bg-black text-white">
                {pos}
              </option>
            ))}
          </select>
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-300 mb-2">
            Additional Notes
          </label>
          <textarea
            id="additional_notes"
            value={formData.additional_notes}
            onChange={(e) => handleInputChange('additional_notes', e.target.value)}
            className="w-full px-4 py-3 bg-black/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-[#e21c21] focus:border-[#e21c21] outline-none transition-all resize-none"
            placeholder="Any special requests or notes..."
            rows={3}
          />
        </div>

        {/* Error/Warning Message */}
        {error && (
          <div className={`${
            error.includes('saved successfully')
              ? 'bg-yellow-900/30 border-yellow-500/50 text-yellow-200'
              : 'bg-red-900/30 border-red-500/50 text-red-300'
          } border px-4 py-3 rounded-lg`}>
            <div className="flex items-start gap-2">
              <span className="text-lg flex-shrink-0">
                {error.includes('saved successfully') ? '⚠️' : '❌'}
              </span>
              <div className="flex-1">
                <p className="font-medium mb-1">
                  {error.includes('saved successfully') ? 'Almost There!' : 'Error'}
                </p>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-700 rounded-lg text-gray-300 font-medium hover:bg-gray-800/50 transition-all"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="relative flex-1 px-6 py-3 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed overflow-hidden group/btn border border-[#e21c21]/50 shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            disabled={isSubmitting}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <span className="relative">
              {isSubmitting
                ? (existingData ? 'Updating...' : 'Submitting...')
                : (existingData ? 'Update Information' : 'Submit Information')
              }
            </span>
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
