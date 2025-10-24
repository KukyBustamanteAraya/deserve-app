'use client';

import { useState } from 'react';
import type { SizingInput, SizeRecommendation, Gender, FitPreference, FavoriteJerseyMeasurements } from '@/types/sizing';

interface SizingCalculatorProps {
  sportId: number;
  sportName: string;
  productTypeSlug: string;
  initialGender?: Gender;
}

export function SizingCalculator({
  sportId,
  sportName,
  productTypeSlug,
  initialGender = 'boys',
}: SizingCalculatorProps) {
  const [gender, setGender] = useState<Gender>(initialGender);
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [shirtLengthCm, setShirtLengthCm] = useState<string>('');
  const [shirtWidthCm, setShirtWidthCm] = useState<string>('');
  const [fitPreference, setFitPreference] = useState<FitPreference>('regular');

  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCalculate = async () => {
    // Validate required fields
    if (!heightCm) {
      setError('Height is required');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const input: Partial<SizingInput> = {
        heightCm: parseFloat(heightCm),
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        favoriteJersey: (shirtLengthCm || shirtWidthCm) ? {
          lengthCm: shirtLengthCm ? parseFloat(shirtLengthCm) : 0,
          widthCm: shirtWidthCm ? parseFloat(shirtWidthCm) : 0,
          fitFeeling: 'perfect' as const
        } : undefined,
        fitPreference,
        sportId,
        productTypeSlug,
        gender,
      };

      const response = await fetch('/api/sizing/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to calculate size');
      }

      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl border border-gray-700 shadow-2xl">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e21c21] to-[#c11a1e] px-6 py-4 rounded-t-xl">
        <h2 className="text-2xl font-bold text-white">Sizing Calculator</h2>
        <p className="text-gray-100 text-sm mt-1">{sportName} - {productTypeSlug}</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Gender Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['boys', 'girls', 'men', 'women'] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`py-2 px-4 rounded-lg font-medium transition-all ${
                  gender === g
                    ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {g.charAt(0).toUpperCase() + g.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Required: Height */}
        <div>
          <label htmlFor="height" className="block text-sm font-semibold text-gray-200 mb-2">
            Height (cm) <span className="text-[#e21c21]">*</span>
          </label>
          <input
            id="height"
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g., 175"
            min="120"
            max="250"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
          />
        </div>

        {/* Optional: Weight */}
        <div>
          <label htmlFor="weight" className="block text-sm font-semibold text-gray-200 mb-2">
            Weight (kg) <span className="text-gray-500 text-xs">(optional)</span>
          </label>
          <input
            id="weight"
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="e.g., 70"
            min="20"
            max="200"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
          />
        </div>

        {/* Collapsible: Shirt Measurements */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-200 hover:text-[#e21c21] transition-colors list-none flex items-center gap-2">
            <svg className="w-5 h-5 transform transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Optional: Shirt Measurements (for better accuracy)
          </summary>

          <div className="mt-4 space-y-4 pl-7">
            <div>
              <label htmlFor="shirtLength" className="block text-sm font-medium text-gray-300 mb-2">
                Favorite Shirt Length (cm)
              </label>
              <input
                id="shirtLength"
                type="number"
                value={shirtLengthCm}
                onChange={(e) => setShirtLengthCm(e.target.value)}
                placeholder="e.g., 73"
                min="40"
                max="120"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Measure from shoulder to hem
              </p>
            </div>

            <div>
              <label htmlFor="shirtWidth" className="block text-sm font-medium text-gray-300 mb-2">
                Favorite Shirt Width (cm)
              </label>
              <input
                id="shirtWidth"
                type="number"
                value={shirtWidthCm}
                onChange={(e) => setShirtWidthCm(e.target.value)}
                placeholder="e.g., 52"
                min="30"
                max="80"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Measure armpit to armpit when flat
              </p>
            </div>
          </div>
        </details>

        {/* Fit Preference */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-2">
            Fit Preference
          </label>
          <div className="grid grid-cols-3 gap-2">
            {(['slim', 'regular', 'relaxed'] as FitPreference[]).map((fit) => (
              <button
                key={fit}
                type="button"
                onClick={() => setFitPreference(fit)}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                  fitPreference === fit
                    ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {fit.charAt(0).toUpperCase() + fit.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Calculate Button */}
        <button
          onClick={handleCalculate}
          disabled={loading || !heightCm}
          className="w-full bg-gradient-to-r from-[#e21c21] to-[#c11a1e] text-white py-4 rounded-lg font-bold text-lg shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-[#e21c21]/30"
        >
          {loading ? 'Calculating...' : 'Calculate My Size'}
        </button>

        {/* Error Message */}
        {error && (
          <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Recommendation Results */}
        {recommendation && (
          <div className="bg-gradient-to-br from-gray-800/50 to-gray-900/50 backdrop-blur-md rounded-xl border border-gray-700 p-6 space-y-4">
            <h3 className="text-xl font-bold text-white mb-4">Your Recommended Size</h3>

            {/* Primary Size */}
            <div className="bg-gradient-to-r from-[#e21c21]/20 to-[#c11a1e]/20 border-2 border-[#e21c21] rounded-lg p-6 text-center">
              <p className="text-gray-300 text-sm mb-2">Primary Size</p>
              <p className="text-6xl font-black text-[#e21c21]">{recommendation.primary}</p>
            </div>

            {/* Alternate Size */}
            {recommendation.alternate !== recommendation.primary && (
              <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm mb-1">Alternative Size</p>
                <p className="text-3xl font-bold text-gray-300">{recommendation.alternate}</p>
              </div>
            )}

            {/* Confidence */}
            <div className="flex items-center gap-3">
              <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-[#e21c21] to-[#ff6b6b] h-full transition-all duration-500"
                  style={{ width: `${recommendation.confidence}%` }}
                />
              </div>
              <span className="text-gray-300 font-semibold text-sm">
                {recommendation.confidence}% confident
              </span>
            </div>

            {/* Rationale */}
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-200">Why this size:</p>
              <ul className="space-y-1.5">
                {recommendation.rationale.map((reason, idx) => (
                  <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                    <svg className="w-5 h-5 text-[#e21c21] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
