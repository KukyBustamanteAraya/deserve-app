'use client';

import type { ApparelKey } from '@/hooks/useBuilderState';

interface ApparelGridProps {
  selectedApparel: Record<ApparelKey, boolean>;
  onToggle: (key: ApparelKey) => void;
  teamColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

const APPAREL_ITEMS: Array<{ key: ApparelKey; label: string }> = [
  { key: 'jersey', label: 'Camiseta' },
  { key: 'shorts', label: 'Shorts' },
  { key: 'socks', label: 'Medias' },
  { key: 'jacket', label: 'Chaqueta' },
  { key: 'pants', label: 'Pantalón' },
  { key: 'bag', label: 'Bolso' },
];

export function ApparelGrid({ selectedApparel, onToggle, teamColors }: ApparelGridProps) {
  const primaryColor = teamColors?.primary || '#e21c21';
  const accentColor = teamColors?.accent || '#000000';

  return (
    <div className="grid grid-cols-3 gap-3">
      {APPAREL_ITEMS.map((item) => {
        const isSelected = selectedApparel[item.key];
        return (
          <button
            key={item.key}
            onClick={() => onToggle(item.key)}
            className={`group relative p-3 rounded-lg border-2 overflow-hidden ${
              isSelected
                ? 'bg-white shadow-md'
                : 'border-gray-200 bg-white hover:shadow-md'
            }`}
            style={{
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              borderColor: isSelected ? primaryColor : undefined
            }}
            aria-label={`${isSelected ? 'Deseleccionar' : 'Seleccionar'} ${item.label}`}
            aria-pressed={isSelected}
          >
            {/* Top border gradient - only shows when selected */}
            <div
              className={`absolute top-0 left-0 right-0 h-[3px] origin-center ${
                isSelected ? 'scale-x-100' : 'scale-x-0'
              }`}
              style={{
                transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                background: `linear-gradient(90deg, ${primaryColor}, ${accentColor})`
              }}
            ></div>

            <div className="relative text-center">
              <div
                className={`text-xs font-bold uppercase tracking-wide ${
                  isSelected ? '' : 'text-gray-700'
                }`}
                style={{
                  transition: 'color 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  color: isSelected ? primaryColor : undefined
                }}
              >
                {item.label}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
