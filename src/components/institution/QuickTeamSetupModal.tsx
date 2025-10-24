'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  name: string;
  price_clp: number;
  category: string;
  product_type_slug: string;
}

interface QuickTeamSetupModalProps {
  open: boolean;
  onClose: () => void;
  designRequestId: string;
  sportId: number;
  sportName: string;
  sportSlug: string;
  institutionName: string;
  institutionId: string;
  existingProductIds?: string[];
}

export default function QuickTeamSetupModal({
  open,
  onClose,
  designRequestId,
  sportId,
  sportName,
  sportSlug,
  institutionName: initialInstitutionName,
  institutionId,
  existingProductIds
}: QuickTeamSetupModalProps) {
  const router = useRouter();
  const supabase = getBrowserClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [institutionName, setInstitutionName] = useState(initialInstitutionName);
  const [subTeamName, setSubTeamName] = useState('');
  const [genderCategory, setGenderCategory] = useState<'male' | 'female'>('male');
  const [rosterSize, setRosterSize] = useState(25);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  // Auto-suggest sub-team name based on gender
  useEffect(() => {
    if (!subTeamName) {
      let suggestion = '';
      if (genderCategory === 'male') {
        suggestion = `Varsity Boys ${sportName}`;
      } else {
        suggestion = `Varsity Girls ${sportName}`;
      }
      setSubTeamName(suggestion);
    }
  }, [genderCategory, sportName, subTeamName]);

  // Load products on mount
  useEffect(() => {
    const loadProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, price_clp, category, product_type_slug')
        .contains('sport_ids', [sportId])
        .eq('status', 'active')
        .order('category');

      if (data && !error) {
        setProducts(data);

        // Use existing product IDs if available, otherwise default to jersey + shorts
        if (existingProductIds && existingProductIds.length > 0) {
          console.log('[Modal] Pre-selecting existing products:', existingProductIds);
          setSelectedProducts(existingProductIds);
        } else {
          // Fallback: Auto-select jersey and shorts by default
          const defaults = data
            .filter((p: Product) => ['camiseta', 'short'].includes(p.product_type_slug))
            .map((p: Product) => p.id);
          console.log('[Modal] No existing products, defaulting to jersey + shorts:', defaults);
          setSelectedProducts(defaults);
        }
      }
    };

    if (open) {
      loadProducts();
    }
  }, [sportId, open, supabase, existingProductIds]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      console.log('[Modal] Submitting quick-complete with:', {
        institutionId,
        institutionName,
        subTeamName,
        genderCategory,
        rosterSize,
        productCount: selectedProducts.length
      });

      const response = await fetch(`/api/design-requests/${designRequestId}/quick-complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          institutionId,
          institutionName, // Send to API to update with admin client
          sportId,
          sportName,
          sportSlug, // Need this to add to institution's sports array
          subTeamName,
          genderCategory,
          rosterSize,
          productIds: selectedProducts
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to complete setup');
      }

      const result = await response.json();
      console.log('[Modal] Quick-complete successful:', result);

      // Close modal and let parent handle refresh
      onClose();
    } catch (err: any) {
      console.error('[Modal] Setup error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const totalPerPlayer = products
    .filter(p => selectedProducts.includes(p.id))
    .reduce((sum, p) => sum + p.price_clp, 0);

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="relative bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto border border-gray-700">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>

        {/* Header */}
        <div className="relative p-6 border-b border-gray-700 sticky top-0 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-white">Tell Us More About Your Team</h2>
              <p className="text-sm text-gray-400 mt-1">Sport: <span className="font-medium text-white">{sportName}</span></p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="relative p-6 space-y-6">
          {error && (
            <div className="bg-red-900/30 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-200">{error}</p>
            </div>
          )}

          {/* Institution Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Institution Name</label>
            <input
              type="text"
              value={institutionName}
              onChange={(e) => setInstitutionName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              placeholder="e.g., Lincoln High School Athletics"
              required
            />
            <p className="text-xs text-gray-500">This is your institution's main name</p>
          </div>

          {/* Sub-Team Name */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-gray-300">Team/Program Name</label>
            <input
              type="text"
              value={subTeamName}
              onChange={(e) => setSubTeamName(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:border-transparent"
              placeholder="e.g., Varsity Boys Basketball"
              required
            />
            <p className="text-xs text-gray-500">Specific name for this {sportName} team</p>
          </div>

          {/* Gender Category */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Gender Category</label>
            <div className="space-y-2">
              {['male', 'female'].map((gender) => (
                <label
                  key={gender}
                  className="flex items-center space-x-3 cursor-pointer group"
                >
                  <input
                    type="radio"
                    name="gender"
                    value={gender}
                    checked={genderCategory === gender}
                    onChange={(e) => setGenderCategory(e.target.value as any)}
                    className="w-4 h-4 text-[#e21c21] bg-gray-900 border-gray-700 focus:ring-[#e21c21]"
                  />
                  <span className="text-white group-hover:text-gray-200">
                    {gender === 'male' ? "Men's Team" : "Women's Team"}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Roster Size */}
          <div className="space-y-3">
            <div className="flex justify-between">
              <label className="block text-sm font-medium text-gray-300">Estimated Roster Size</label>
              <span className="text-sm font-medium text-white">{rosterSize} players</span>
            </div>
            <input
              type="range"
              min="10"
              max="100"
              step="5"
              value={rosterSize}
              onChange={(e) => setRosterSize(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#e21c21]"
            />
            <p className="text-xs text-gray-500">Approximate number of players for sizing estimates</p>
          </div>

          {/* Products */}
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-300">Products for this Design</label>
            {products.length === 0 ? (
              <div className="text-sm text-gray-400 py-4 text-center">Loading products...</div>
            ) : (
              <>
                <div className="space-y-2 border border-gray-700 rounded-lg p-3 bg-gray-900/30">
                  {products.map(product => (
                    <label
                      key={product.id}
                      className="flex items-center justify-between p-2 hover:bg-gray-800/50 rounded cursor-pointer group"
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProduct(product.id)}
                          className="w-4 h-4 text-[#e21c21] bg-gray-900 border-gray-700 rounded focus:ring-[#e21c21]"
                        />
                        <span className="text-white group-hover:text-gray-200">{product.name}</span>
                      </div>
                      <span className="text-sm text-gray-400">${(product.price_clp / 1000).toFixed(3)}</span>
                    </label>
                  ))}
                </div>

                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="font-medium text-gray-300">Total per player:</span>
                  <span className="font-bold text-white">${(totalPerPlayer / 1000).toFixed(3)} CLP</span>
                </div>
              </>
            )}
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors"
            >
              Skip for now
            </button>
            <button
              type="submit"
              disabled={loading || selectedProducts.length === 0 || !subTeamName.trim() || !institutionName.trim()}
              className="px-6 py-2 bg-[#e21c21] hover:bg-[#c11a1e] text-white rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Saving...' : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
