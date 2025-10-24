'use client';

import { useState, memo } from 'react';
import type { SizingInput, SizeRecommendation, Gender, FitPreference, JerseyFitFeeling } from '@/types/sizing';

interface Sport {
  id: number;
  name: string;
  slug: string;
}

interface SizingTestClientProps {
  sports: Sport[];
}

const PRODUCT_TYPES = [
  { slug: 'jersey', name: 'Jersey' },
  { slug: 'shorts', name: 'Shorts' },
  { slug: 'polo', name: 'Polo' },
  { slug: 'tracksuit-jacket', name: 'Chaqueta' },
  { slug: 'tracksuit-pants', name: 'Pantalón' },
];

const SizingTestClient = memo(function SizingTestClient({ sports }: SizingTestClientProps) {
  // Selection state
  const [sportId, setSportId] = useState<number>(sports[0]?.id || 1);
  const [gender, setGender] = useState<Gender>('boys');
  const [productType, setProductType] = useState<string>('jersey');

  // Measurement state
  const [heightCm, setHeightCm] = useState<string>('');
  const [weightKg, setWeightKg] = useState<string>('');
  const [fitPreference, setFitPreference] = useState<FitPreference>('regular');

  // Optional favorite jersey measurements
  const [jerseyLengthCm, setJerseyLengthCm] = useState<string>('');
  const [jerseyWidthCm, setJerseyWidthCm] = useState<string>('');
  const [fitFeeling, setFitFeeling] = useState<JerseyFitFeeling>('perfect');

  // Result state
  const [recommendation, setRecommendation] = useState<SizeRecommendation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedSport = sports.find(s => s.id === sportId);

  const handleCalculate = async () => {
    // V2: Both height and weight are required
    if (!heightCm) {
      setError('Height is required');
      return;
    }
    if (!weightKg) {
      setError('Weight is required for accurate sizing');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Build favorite jersey object if user provided measurements
      let favoriteJersey = undefined;
      if (jerseyLengthCm && jerseyWidthCm) {
        favoriteJersey = {
          lengthCm: parseFloat(jerseyLengthCm),
          widthCm: parseFloat(jerseyWidthCm),
          fitFeeling,
        };
      }

      const input: SizingInput = {
        heightCm: parseFloat(heightCm),
        weightKg: parseFloat(weightKg),
        fitPreference,
        sportId,
        productTypeSlug: productType,
        gender,
        favoriteJersey,
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
        throw new Error(data.error || data.details || 'Failed to calculate size');
      }

      setRecommendation(data.recommendation);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-gray-900 via-black to-gray-900 rounded-xl border border-gray-700 shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-[#e21c21] to-[#c11a1e] px-6 py-4">
        <h2 className="text-2xl font-bold text-white">Find Your Size</h2>
        <p className="text-gray-100 text-sm mt-1">Select your sport, gender, and measurements</p>
      </div>

      <div className="p-6 space-y-6">
        {/* Sport Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-3">
            Sport
          </label>
          <div className="grid grid-cols-3 gap-2">
            {sports.map((sport) => (
              <button
                key={sport.id}
                type="button"
                onClick={() => setSportId(sport.id)}
                className={`py-3 px-4 rounded-lg font-medium text-sm transition-all ${
                  sportId === sport.id
                    ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {sport.name}
              </button>
            ))}
          </div>
        </div>

        {/* Gender Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-3">
            Gender
          </label>
          <div className="grid grid-cols-2 gap-2">
            {(['boys', 'girls'] as Gender[]).map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGender(g)}
                className={`py-3 px-4 rounded-lg font-medium transition-all ${
                  gender === g
                    ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {g === 'boys' ? '👦 Boys' : '👧 Girls'}
              </button>
            ))}
          </div>
        </div>

        {/* Product Type Selection */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-3">
            Product Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {PRODUCT_TYPES.map((product) => (
              <button
                key={product.slug}
                type="button"
                onClick={() => setProductType(product.slug)}
                className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                  productType === product.slug
                    ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                    : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                }`}
              >
                {product.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border-t border-gray-700 pt-6"></div>

        {/* Height (Required) */}
        <div>
          <label htmlFor="height" className="block text-sm font-semibold text-gray-200 mb-2">
            Height (cm) <span className="text-[#e21c21]">*</span>
          </label>
          <input
            id="height"
            type="number"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="e.g., 165"
            min="120"
            max="250"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
          />
        </div>

        {/* Weight (Required for BMI) */}
        <div>
          <label htmlFor="weight" className="block text-sm font-semibold text-gray-200 mb-2">
            Weight (kg) <span className="text-[#e21c21]">*</span>
          </label>
          <input
            id="weight"
            type="number"
            value={weightKg}
            onChange={(e) => setWeightKg(e.target.value)}
            placeholder="e.g., 60"
            min="20"
            max="200"
            className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
          />
        </div>

        {/* Optional Favorite Jersey Measurements - Highly Recommended */}
        <details className="group">
          <summary className="cursor-pointer text-sm font-semibold text-gray-200 hover:text-[#e21c21] transition-colors list-none flex items-center gap-2">
            <svg className="w-5 h-5 transform transition-transform group-open:rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            Optional: Favorite Jersey Measurements
            <span className="text-xs text-gray-400 font-normal">(recommended for best accuracy)</span>
          </summary>

          <div className="mt-4 space-y-4 pl-7">
            <p className="text-xs text-gray-400 mb-3">
              Measure your favorite jersey that fits well to help us recommend the perfect size!
            </p>

            <div>
              <label htmlFor="jerseyLength" className="block text-sm font-medium text-gray-300 mb-2">
                Jersey Length (cm)
              </label>
              <input
                id="jerseyLength"
                type="number"
                value={jerseyLengthCm}
                onChange={(e) => setJerseyLengthCm(e.target.value)}
                placeholder="e.g., 68"
                min="40"
                max="120"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Measure from shoulder to hem
              </p>
            </div>

            <div>
              <label htmlFor="jerseyWidth" className="block text-sm font-medium text-gray-300 mb-2">
                Jersey Width (cm)
              </label>
              <input
                id="jerseyWidth"
                type="number"
                value={jerseyWidthCm}
                onChange={(e) => setJerseyWidthCm(e.target.value)}
                placeholder="e.g., 50"
                min="30"
                max="80"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              />
              <p className="text-xs text-gray-500 mt-1">
                Measure armpit to armpit when flat
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                How does it fit you?
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(['tight', 'perfect', 'loose'] as JerseyFitFeeling[]).map((feeling) => (
                  <button
                    key={feeling}
                    type="button"
                    onClick={() => setFitFeeling(feeling)}
                    className={`py-2 px-3 rounded-lg font-medium text-sm transition-all ${
                      fitFeeling === feeling
                        ? 'bg-[#e21c21] text-white shadow-lg shadow-[#e21c21]/30'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                    }`}
                  >
                    {feeling.charAt(0).toUpperCase() + feeling.slice(1)}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                This helps us adjust for your fit preference
              </p>
            </div>
          </div>
        </details>

        {/* Fit Preference */}
        <div>
          <label className="block text-sm font-semibold text-gray-200 mb-3">
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
          disabled={loading || !heightCm || !weightKg}
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

        {/* Recommendation Results - V2 Risk-Based Display */}
        {recommendation && (
          <div className={`rounded-xl border-2 overflow-hidden mt-6 ${
            recommendation.riskLevel === 'LOW' ? 'border-green-500/50 bg-gradient-to-br from-green-900/20 to-gray-900/50' :
            recommendation.riskLevel === 'MEDIUM' ? 'border-yellow-500/50 bg-gradient-to-br from-yellow-900/20 to-gray-900/50' :
            recommendation.riskLevel === 'HIGH' ? 'border-orange-500/50 bg-gradient-to-br from-orange-900/20 to-gray-900/50' :
            'border-red-500/50 bg-gradient-to-br from-red-900/20 to-gray-900/50'
          }`}>
            {/* Header with Title */}
            <div className={`px-6 py-4 ${
              recommendation.riskLevel === 'LOW' ? 'bg-gradient-to-r from-green-600/30 to-green-700/30' :
              recommendation.riskLevel === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-600/30 to-yellow-700/30' :
              recommendation.riskLevel === 'HIGH' ? 'bg-gradient-to-r from-orange-600/30 to-orange-700/30' :
              'bg-gradient-to-r from-red-600/30 to-red-700/30'
            }`}>
              <h3 className="text-xl font-bold text-white">{recommendation.title}</h3>
              {recommendation.subtitle && (
                <p className="text-gray-200 text-sm mt-1">{recommendation.subtitle}</p>
              )}
            </div>

            <div className="p-6 space-y-4">
              {/* BMI Analysis (if available) */}
              {recommendation.bmiAnalysis && (
                <div className="bg-gray-800/50 rounded-lg p-4 border border-gray-700">
                  <p className="text-xs font-semibold text-gray-400 mb-1">BODY ANALYSIS</p>
                  <p className="text-sm text-gray-200">
                    BMI: {recommendation.bmiAnalysis.bmi.toFixed(1)} ({recommendation.bmiAnalysis.category})
                  </p>
                  <p className="text-xs text-gray-400 mt-1">{recommendation.bmiAnalysis.message}</p>
                </div>
              )}

              {/* Primary Size */}
              <div className={`border-2 rounded-lg p-6 text-center ${
                recommendation.riskLevel === 'LOW' ? 'bg-green-500/10 border-green-500' :
                recommendation.riskLevel === 'MEDIUM' ? 'bg-yellow-500/10 border-yellow-500' :
                recommendation.riskLevel === 'HIGH' ? 'bg-orange-500/10 border-orange-500' :
                'bg-red-500/10 border-red-500'
              }`}>
                <p className="text-gray-300 text-sm mb-2">Recommended Size</p>
                <p className={`text-6xl font-black ${
                  recommendation.riskLevel === 'LOW' ? 'text-green-400' :
                  recommendation.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                  recommendation.riskLevel === 'HIGH' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {recommendation.primary}
                </p>
              </div>

              {/* Alternate Size */}
              {recommendation.alternate !== recommendation.primary && (
                <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
                  <p className="text-gray-400 text-sm mb-1">Alternative Size</p>
                  <p className="text-3xl font-bold text-gray-300">{recommendation.alternate}</p>
                </div>
              )}

              {/* Warnings (if any) */}
              {recommendation.warnings && recommendation.warnings.length > 0 && (
                <div className="bg-orange-900/20 border border-orange-500/50 rounded-lg p-4">
                  <p className="text-orange-400 font-semibold text-sm mb-2">⚠️ Important Notes:</p>
                  <ul className="space-y-1">
                    {recommendation.warnings.map((warning, idx) => (
                      <li key={idx} className="text-sm text-orange-300">{warning}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Edge Cases (if any) */}
              {recommendation.edgeCases && recommendation.edgeCases.length > 0 && (
                <div className="bg-gray-800/50 border border-gray-600 rounded-lg p-4 space-y-2">
                  <p className="text-gray-300 font-semibold text-sm mb-2">Sizing Notes:</p>
                  {recommendation.edgeCases.map((edgeCase, idx) => (
                    <div key={idx} className="text-sm">
                      <span className={`font-medium ${
                        edgeCase.severity === 'HIGH' ? 'text-red-400' :
                        edgeCase.severity === 'MEDIUM' ? 'text-yellow-400' :
                        'text-gray-400'
                      }`}>
                        {edgeCase.type.replace(/_/g, ' ')}:
                      </span>
                      <span className="text-gray-300 ml-2">{edgeCase.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Confidence */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-gray-800 rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      recommendation.riskLevel === 'LOW' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                      recommendation.riskLevel === 'MEDIUM' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                      recommendation.riskLevel === 'HIGH' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                      'bg-gradient-to-r from-red-500 to-red-400'
                    }`}
                    style={{ width: `${recommendation.confidence}%` }}
                  />
                </div>
                <span className="text-gray-300 font-semibold text-sm">
                  {recommendation.confidence}%
                </span>
              </div>

              {/* Rationale */}
              <div className="space-y-2">
                <p className="text-sm font-semibold text-gray-200">Why this size:</p>
                <ul className="space-y-1.5">
                  {recommendation.rationale.map((reason, idx) => (
                    <li key={idx} className="text-sm text-gray-300 flex items-start gap-2">
                      <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                        recommendation.riskLevel === 'LOW' ? 'text-green-400' :
                        recommendation.riskLevel === 'MEDIUM' ? 'text-yellow-400' :
                        recommendation.riskLevel === 'HIGH' ? 'text-orange-400' :
                        'text-red-400'
                      }`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>{reason}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Recommended Action */}
              {recommendation.recommendedAction === 'MUST_CONTACT' && recommendation.shouldShowContact && (
                <div className="bg-red-900/30 border-2 border-red-500 rounded-lg p-5 text-center space-y-3">
                  <p className="text-red-300 font-bold text-lg">⚠️ Please Contact Us Before Ordering</p>
                  <p className="text-gray-300 text-sm">
                    Your measurements require custom sizing consultation to ensure the perfect fit.
                  </p>
                  <button className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white py-3 rounded-lg font-bold transition-all">
                    Contact Support
                  </button>
                </div>
              )}

              {recommendation.recommendedAction === 'CONTACT_RECOMMENDED' && recommendation.shouldShowContact && (
                <div className="bg-orange-900/30 border border-orange-500 rounded-lg p-4 text-center space-y-2">
                  <p className="text-orange-300 font-semibold">We recommend contacting us for sizing guidance</p>
                  <button className="bg-orange-600 hover:bg-orange-700 text-white py-2 px-4 rounded-lg font-medium transition-all">
                    Get Sizing Help
                  </button>
                </div>
              )}

              {recommendation.recommendedAction === 'ORDER_NOW' && (
                <div className="bg-green-900/30 border border-green-500 rounded-lg p-4 text-center">
                  <p className="text-green-300 font-semibold">✓ You're good to go! This size should fit perfectly.</p>
                </div>
              )}

              {recommendation.recommendedAction === 'ORDER_WITH_INFO' && (
                <div className="bg-yellow-900/30 border border-yellow-500 rounded-lg p-4 text-center">
                  <p className="text-yellow-300 font-semibold">Read the sizing notes above before ordering</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

export default SizingTestClient;
