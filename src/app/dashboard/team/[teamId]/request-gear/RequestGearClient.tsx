'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TeamBanner } from '../TeamBanner';

type ApparelItem = 'camiseta' | 'short' | 'medias' | 'set-visita' | 'entrenamiento' | 'poleron' | 'pantalon' | 'bolso';

const apparelItems = [
  { id: 'camiseta' as ApparelItem, emoji: '👕', name: 'Camiseta', needsDesign: true },
  { id: 'short' as ApparelItem, emoji: '🩳', name: 'Short', needsDesign: false },
  { id: 'medias' as ApparelItem, emoji: '🧦', name: 'Medias', needsDesign: false },
  { id: 'set-visita' as ApparelItem, emoji: '🎽', name: 'Set de Visita', needsDesign: true },
  { id: 'entrenamiento' as ApparelItem, emoji: '🏃', name: 'Entrenamiento', needsDesign: true },
  { id: 'poleron' as ApparelItem, emoji: '🧥', name: 'Poleron', needsDesign: true },
  { id: 'pantalon' as ApparelItem, emoji: '👖', name: 'Pantalon', needsDesign: true },
  { id: 'bolso' as ApparelItem, emoji: '🎒', name: 'Bolso', needsDesign: true },
];

interface Product {
  id: string;
  name: string;
  thumbnail_url: string | null;
  thumbnail_alt: string;
}

interface RequestGearClientProps {
  teamId: string;
  teamName: string;
  isOwner: boolean;
  initialSelections?: Record<string, Product>;
}

export function RequestGearClient({ teamId, teamName, isOwner, initialSelections = {} }: RequestGearClientProps) {
  const [selectedItems, setSelectedItems] = useState<ApparelItem[]>([]);
  const [selectedDesigns, setSelectedDesigns] = useState<Record<string, Product>>(initialSelections);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  useEffect(() => {
    // Update selected items based on initialSelections
    const items = Object.keys(initialSelections) as ApparelItem[];
    setSelectedItems(prev => {
      const newItems = [...prev];
      items.forEach(item => {
        if (!newItems.includes(item)) {
          newItems.push(item);
        }
      });
      return newItems;
    });
  }, [initialSelections]);

  const toggleItem = (itemId: ApparelItem) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };

  const itemsNeedingDesign = selectedItems.filter(itemId => {
    const item = apparelItems.find(a => a.id === itemId);
    return item?.needsDesign;
  });

  const handleSubmitRequest = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);

    try {
      // Prepare apparel selections
      const apparelSelections = selectedItems.map(itemId => ({
        apparel_type: itemId,
        product_id: selectedDesigns[itemId]?.id || '',
        quantity: 1, // Default quantity - can be made dynamic later
      }));

      // Validate all items have designs if needed
      const invalidSelections = apparelSelections.filter(sel => {
        const item = apparelItems.find(a => a.id === sel.apparel_type);
        return item?.needsDesign && !sel.product_id;
      });

      if (invalidSelections.length > 0) {
        setSubmitError('Please select designs for all apparel items that require them');
        setIsSubmitting(false);
        return;
      }

      // Submit to API
      const response = await fetch('/api/gear-requests', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: teamId,
          apparel_selections: apparelSelections,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit gear request');
      }

      setSubmitSuccess(true);
      // Clear selections after successful submit
      setTimeout(() => {
        window.location.href = `/dashboard/team/${teamId}`;
      }, 2000);
    } catch (error: any) {
      setSubmitError(error.message || 'An error occurred while submitting the request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = selectedItems.length > 0 && itemsNeedingDesign.every(itemId => selectedDesigns[itemId]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Back Link */}
        <Link
          href={`/dashboard/team/${teamId}`}
          className="text-sm text-blue-600 hover:text-blue-800 inline-block"
        >
          ← Back to Team
        </Link>

        {/* Team Name Banner */}
        <TeamBanner teamName={teamName} isOwner={isOwner} />

        {/* Apparel Selection Grid */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Select Apparel Items</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {apparelItems.map(item => (
              <button
                key={item.id}
                onClick={() => toggleItem(item.id)}
                className={`aspect-square border-2 rounded-lg transition-all p-4 flex flex-col items-center justify-center group ${
                  selectedItems.includes(item.id)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-300 hover:border-blue-500 hover:bg-blue-50'
                }`}
              >
                <div className="text-4xl mb-2 group-hover:scale-110 transition-transform">{item.emoji}</div>
                <span className={`text-sm font-medium ${
                  selectedItems.includes(item.id) ? 'text-blue-600' : 'text-gray-700 group-hover:text-blue-600'
                }`}>
                  {item.name}
                </span>
                {selectedItems.includes(item.id) && (
                  <div className="mt-2 w-5 h-5 bg-blue-600 rounded-full flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={3} stroke="currentColor" className="w-3 h-3 text-white">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Design Selection Container */}
        {itemsNeedingDesign.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6">Select Designs</h2>

            <div className="space-y-6">
              {itemsNeedingDesign.map(itemId => {
                const item = apparelItems.find(a => a.id === itemId);
                const selectedProduct = selectedDesigns[itemId];

                return (
                  <div key={itemId} className="border-2 border-gray-200 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">
                      {item?.emoji} {item?.name} - Choose Design
                    </h3>

                    {selectedProduct ? (
                      <div className="flex items-center gap-4 p-4 border-2 border-green-500 rounded-lg bg-green-50">
                        {selectedProduct.thumbnail_url ? (
                          <img
                            src={selectedProduct.thumbnail_url}
                            alt={selectedProduct.thumbnail_alt}
                            className="w-24 h-24 object-cover rounded-lg"
                          />
                        ) : (
                          <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-12 h-12 text-gray-400">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{selectedProduct.name}</p>
                          <p className="text-sm text-green-600 mt-1">✓ Design selected</p>
                        </div>
                        <Link
                          href={`/dashboard/team/${teamId}/request-gear/designs/${itemId}`}
                          className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors text-sm"
                        >
                          Change
                        </Link>
                      </div>
                    ) : (
                      <Link
                        href={`/dashboard/team/${teamId}/request-gear/designs/${itemId}`}
                        className="block w-full py-4 px-6 border-2 border-blue-500 border-dashed rounded-lg hover:border-blue-600 hover:bg-blue-50 transition-all text-center group"
                      >
                        <div className="text-blue-600 group-hover:text-blue-700">
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-12 h-12 mx-auto mb-2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                          </svg>
                          <p className="font-medium">Select Design</p>
                          <p className="text-sm opacity-75 mt-1">Browse catalog designs</p>
                        </div>
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Submit Button */}
        {selectedItems.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow sticky bottom-6">
            {submitError && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{submitError}</p>
              </div>
            )}

            {submitSuccess && (
              <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">✓ Gear request submitted successfully! Redirecting...</p>
              </div>
            )}

            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
                {itemsNeedingDesign.length > 0 && (
                  <span className="ml-2">
                    ({itemsNeedingDesign.filter(itemId => selectedDesigns[itemId]).length}/{itemsNeedingDesign.length} designs selected)
                  </span>
                )}
              </div>
              <button
                onClick={handleSubmitRequest}
                disabled={!canSubmit || isSubmitting}
                className={`px-8 py-3 rounded-lg font-semibold transition-all ${
                  canSubmit && !isSubmitting
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
