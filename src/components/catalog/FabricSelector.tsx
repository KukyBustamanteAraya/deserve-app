'use client';

import { useEffect, useState } from 'react';
import { useFabrics } from '@/hooks/useFabrics';
import { logger } from '@/lib/logger';

interface Fabric {
  id: string;
  name: string;
  composition: string;
  gsm: number;
  description: string;
  use_case: string;
  price_modifier_cents: number;
  video_url: string | null;
  sort_order: number;
}

interface FabricSelectorProps {
  selectedFabricId: string | null;
  onFabricChange: (fabricId: string, priceModifier: number) => void;
  productTypeSlug?: string | null;
  className?: string;
}

export default function FabricSelector({
  selectedFabricId,
  onFabricChange,
  productTypeSlug,
  className = ''
}: FabricSelectorProps) {
  const { items: allFabrics, isLoading: loading, error } = useFabrics();
  const [recommendedFabricNames, setRecommendedFabricNames] = useState<string[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  // Fetch fabric recommendations for this product type
  useEffect(() => {
    if (!productTypeSlug) {
      setRecommendedFabricNames([]);
      return;
    }

    const fetchRecommendations = async () => {
      try {
        const response = await fetch(`/api/fabric-recommendations?product_type=${productTypeSlug}`);
        const data = await response.json();

        if (data.recommendations) {
          setRecommendedFabricNames(data.recommendations.map((r: any) => r.fabric_name));
        }
      } catch (error) {
        logger.error('Error fetching fabric recommendations:', error);
        setRecommendedFabricNames([]);
      }
    };

    fetchRecommendations();
  }, [productTypeSlug]);

  // Filter fabrics based on recommendations
  const fabrics = productTypeSlug && recommendedFabricNames.length > 0
    ? allFabrics.filter(f => recommendedFabricNames.includes(f.name))
    : allFabrics;

  // Auto-select Deserve (baseline fabric) if none selected
  useEffect(() => {
    if (!selectedFabricId && (fabrics?.length ?? 0) > 0) {
      const deserveFabric = fabrics.find((f: Fabric) => f.name === 'Deserve');
      if (deserveFabric) {
        onFabricChange(deserveFabric.id, deserveFabric.price_modifier_cents);
      }
    }
  }, [fabrics, selectedFabricId, onFabricChange]);

  const handleFabricSelect = (fabric: Fabric) => {
    onFabricChange(fabric.id, fabric.price_modifier_cents);
  };

  const selectedFabric = fabrics.find(f => f.id === selectedFabricId);

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-red-600 text-sm ${className}`}>
        Error loading fabrics: {error}
      </div>
    );
  }

  return (
    <div className={className}>
      <label className="block text-sm font-medium text-gray-700 mb-3">
        Seleccionar Tela
      </label>

      {/* Fabric Grid */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
        {fabrics.map((fabric) => {
          const isSelected = fabric.id === selectedFabricId;
          return (
            <button
              key={fabric.id}
              onClick={() => handleFabricSelect(fabric)}
              className={`
                relative p-2 rounded-md border-2 transition-all text-left
                ${isSelected
                  ? 'border-[#E21C21] bg-red-50 shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm'
                }
              `}
            >
              {/* Fabric Image Placeholder */}
              <div className="aspect-square bg-gray-100 rounded mb-2 flex items-center justify-center">
                <span className="text-2xl text-gray-300">🧵</span>
              </div>

              {/* Fabric Info */}
              <div>
                <h3 className={`font-semibold text-xs mb-0.5 ${isSelected ? 'text-[#E21C21]' : 'text-gray-900'}`}>
                  {fabric.name}
                </h3>
                <p className="text-[10px] text-gray-600">
                  {fabric.gsm} GSM
                </p>
                {fabric.price_modifier_cents > 0 && (
                  <p className="text-[10px] font-medium text-gray-700 mt-0.5">
                    +${(fabric.price_modifier_cents / 100).toLocaleString('es-CL')}
                  </p>
                )}
              </div>

              {/* Selected Indicator */}
              {isSelected && (
                <div className="absolute top-1 right-1 w-5 h-5 bg-[#E21C21] rounded-full flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Fabric Details */}
      {selectedFabric && (
        <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h4 className="font-semibold text-gray-900">{selectedFabric.name}</h4>
              <p className="text-sm text-gray-600 mt-1">{selectedFabric.composition}</p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-[#E21C21] text-sm font-medium hover:underline"
            >
              {showDetails ? 'Ocultar' : 'Ver detalles'}
            </button>
          </div>

          {showDetails && (
            <div className="border-t border-gray-200 pt-3 mt-3 space-y-2 text-sm">
              <p className="text-gray-700">
                <span className="font-medium">Peso:</span> {selectedFabric.gsm} GSM
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Descripción:</span> {selectedFabric.description}
              </p>
              <p className="text-gray-700">
                <span className="font-medium">Uso:</span> {selectedFabric.use_case}
              </p>
              {selectedFabric.video_url && (
                <a
                  href={selectedFabric.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block text-[#E21C21] font-medium hover:underline mt-2"
                >
                  Ver video de tela →
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
