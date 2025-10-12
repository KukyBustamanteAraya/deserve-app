'use client';

import { useState } from 'react';
import { SportFieldSelector } from './SportFieldSelector';
import type { SportSlug } from '@/types/catalog';

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

const SPORT_POSITIONS: Record<string, string[]> = {
  soccer: [
    'Goalkeeper',
    'Defender',
    'Midfielder',
    'Forward',
  ],
  futbol: [ // Spanish alias for soccer
    'Goalkeeper',
    'Defender',
    'Midfielder',
    'Forward',
  ],
  basketball: [
    'Point Guard',
    'Shooting Guard',
    'Small Forward',
    'Power Forward',
    'Center',
  ],
  basquetbol: [ // Spanish alias for basketball
    'Point Guard',
    'Shooting Guard',
    'Small Forward',
    'Power Forward',
    'Center',
  ],
  volleyball: [
    'Setter',
    'Outside Hitter',
    'Middle Blocker',
    'Opposite Hitter',
    'Libero',
  ],
  voleibol: [ // Spanish alias for volleyball
    'Setter',
    'Outside Hitter',
    'Middle Blocker',
    'Opposite Hitter',
    'Libero',
  ],
  baseball: [
    'Pitcher',
    'Catcher',
    'First Base',
    'Second Base',
    'Third Base',
    'Shortstop',
    'Left Field',
    'Center Field',
    'Right Field',
  ],
  rugby: [
    'Prop',
    'Hooker',
    'Lock',
    'Flanker',
    'Number 8',
    'Scrum-half',
    'Fly-half',
    'Center',
    'Wing',
    'Fullback',
  ],
  golf: ['Player'],
  padel: [
    'Player 1 (Left)',
    'Player 1 (Right)',
    'Player 2 (Left)',
    'Player 2 (Right)',
  ],
  crossfit: ['Athlete'],
  training: ['Athlete'],
  'yoga-pilates': ['Participant'],
};

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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
  const normalizedSport = sport || 'futbol';
  const positions = SPORT_POSITIONS[normalizedSport] || SPORT_POSITIONS['futbol'] || [];

  console.log('[PlayerInfoForm] Normalized sport:', normalizedSport);
  console.log('[PlayerInfoForm] Available positions:', positions);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.player_name || !formData.size) {
      setError('Please fill in all required fields');
      return;
    }

    // Validate email if required
    if (requireEmail && !formData.email) {
      setError('Please enter your email address');
      return;
    }

    if (requireEmail && formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      setError('Please enter a valid email address');
      return;
    }

    // Position is optional if no sport is set or no positions available
    if (positions.length > 0 && !formData.position) {
      setError('Please select a position');
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
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {existingData ? 'Edit Your Player Information' : 'Submit Your Player Information'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Email (for collection link flow) */}
        {requireEmail && (
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address <span className="text-red-600">*</span>
            </label>
            <input
              type="email"
              id="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="your.email@example.com"
              required
            />
            <p className="mt-1 text-sm text-gray-500">
              We'll send you a magic link to join {teamName || 'the team'} and view updates
            </p>
          </div>
        )}

        {/* Player Name */}
        <div>
          <label htmlFor="player_name" className="block text-sm font-medium text-gray-700 mb-2">
            Player Name <span className="text-red-600">*</span>
          </label>
          <input
            type="text"
            id="player_name"
            value={formData.player_name}
            onChange={(e) => setFormData({ ...formData, player_name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Enter your name"
            required
          />
        </div>

        {/* Jersey Number */}
        <div>
          <label htmlFor="jersey_number" className="block text-sm font-medium text-gray-700 mb-2">
            Jersey Number
          </label>
          <input
            type="text"
            id="jersey_number"
            value={formData.jersey_number}
            onChange={(e) => setFormData({ ...formData, jersey_number: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="e.g., 10"
            maxLength={3}
          />
        </div>

        {/* Size */}
        <div>
          <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
            Jersey Size <span className="text-red-600">*</span>
          </label>
          <select
            id="size"
            value={formData.size}
            onChange={(e) => setFormData({ ...formData, size: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
          >
            {SIZES.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>

        {/* Position - Visual Field Selector for complex sports, dropdown for simple ones */}
        <div>
          <label htmlFor="position" className="block text-sm font-medium text-gray-700 mb-2">
            Position <span className="text-red-600">*</span>
          </label>
          {/* Use visual field selector for sports with detailed positions */}
          {['soccer', 'futbol', 'basketball', 'basquetbol', 'volleyball', 'voleibol', 'baseball', 'rugby', 'padel'].includes(normalizedSport) ? (
            <SportFieldSelector
              sport={normalizedSport as any}
              selectedPosition={formData.position}
              onPositionChange={(position) => setFormData({ ...formData, position })}
            />
          ) : (
            /* Use dropdown for simple sports (golf, crossfit, training, yoga-pilates) */
            <select
              id="position"
              value={formData.position}
              onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            >
              <option value="">Select position</option>
              {positions.map((pos) => (
                <option key={pos} value={pos}>
                  {pos}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Additional Notes */}
        <div>
          <label htmlFor="additional_notes" className="block text-sm font-medium text-gray-700 mb-2">
            Additional Notes
          </label>
          <textarea
            id="additional_notes"
            value={formData.additional_notes}
            onChange={(e) => setFormData({ ...formData, additional_notes: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="Any special requests or notes..."
            rows={3}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-6 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              disabled={isSubmitting}
            >
              Cancel
            </button>
          )}
          <button
            type="submit"
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isSubmitting}
          >
            {isSubmitting
              ? (existingData ? 'Updating...' : 'Submitting...')
              : (existingData ? 'Update Information' : 'Submit Information')
            }
          </button>
        </div>
      </form>
    </div>
  );
}
