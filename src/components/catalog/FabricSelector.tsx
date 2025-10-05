'use client';

import { useEffect, useState } from 'react';
import { useFabrics } from '@/hooks/useFabrics';

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
  className?: string;
}

export default function FabricSelector({
  selectedFabricId,
  onFabricChange,
  className = ''
}: FabricSelectorProps) {
  const { items: fabrics, isLoading: loading, error } = useFabrics();
  const [showDetails, setShowDetails] = useState(false);

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
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Seleccionar Tela
      </label>

      <div className="relative">
        <select
          value={selectedFabricId || ''}
          onChange={(e) => {
            const fabric = fabrics.find(f => f.id === e.target.value);
            if (fabric) handleFabricSelect(fabric);
          }}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          disabled={(fabrics?.length ?? 0) === 0}
        >
          {(fabrics?.length ?? 0) === 0 ? (
            <option value="">No fabrics available</option>
          ) : (
            fabrics.map((fabric) => (
              <option key={fabric.id} value={fabric.id}>
                {fabric.name}
                {fabric.price_modifier_cents > 0 &&
                  ` (+$${(fabric.price_modifier_cents / 1000).toFixed(0)}k)`
                }
              </option>
            ))
          )}
        </select>
      </div>

      {selectedFabric && (
        <div className="mt-3 p-3 bg-gray-50 rounded-md text-sm">
          <div className="flex justify-between items-start mb-2">
            <div>
              <p className="font-medium text-gray-900">{selectedFabric.name}</p>
              <p className="text-gray-600 text-xs mt-1">{selectedFabric.composition}</p>
            </div>
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="text-primary text-xs underline"
            >
              {showDetails ? 'Ocultar' : 'Ver detalles'}
            </button>
          </div>

          {showDetails && (
            <div className="border-t border-gray-200 pt-2 mt-2 space-y-1">
              <p className="text-gray-700">
                <span className="font-medium">GSM:</span> {selectedFabric.gsm}
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
                  className="inline-block text-primary underline text-xs mt-2"
                >
                  Ver video de tela
                </a>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
