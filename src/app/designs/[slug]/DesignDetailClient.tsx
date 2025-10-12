'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Design {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
}

interface Sport {
  id: number;
  slug: string;
  name: string;
}

interface Mockup {
  id: string;
  mockup_url: string;
  view_angle: string;
  is_primary: boolean;
  sort_order: number;
  product_id: number;
  product: {
    id: number;
    name: string;
    slug: string;
    price_cents: number;
    category: string;
  };
}

interface MockupGroup {
  sport_id: number;
  sport: Sport;
  mockups: Mockup[];
  products: any[];
}

interface DesignDetailClientProps {
  design: Design;
  currentSport: Sport | null;
  availableSports: Sport[];
  mockupsBySport: MockupGroup[];
  currentMockups: MockupGroup[];
}

export function DesignDetailClient({
  design,
  currentSport,
  availableSports,
  mockupsBySport,
  currentMockups,
}: DesignDetailClientProps) {
  const router = useRouter();
  const [selectedSport, setSelectedSport] = useState(currentSport);
  const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);

  // Get mockups for selected sport
  const currentMockupGroup = mockupsBySport.find(
    (group) => group.sport_id === selectedSport?.id
  );
  const mockups = currentMockupGroup?.mockups || [];
  const selectedMockup = mockups[selectedMockupIndex];

  const handleSportChange = (sport: Sport) => {
    setSelectedSport(sport);
    setSelectedMockupIndex(0);
    router.push(`/designs/${design.slug}?sport=${sport.slug}`);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
      {/* Left Column - Image */}
      <div className="space-y-4">
        {/* Main Mockup Image */}
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl border border-gray-700 overflow-hidden aspect-square flex items-center justify-center">
          {selectedMockup ? (
            <img
              src={selectedMockup.mockup_url}
              alt={`${design.name} - ${selectedMockup.view_angle}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-500 text-center p-12">
              <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p>No hay mockup disponible para este deporte</p>
            </div>
          )}
        </div>

        {/* Mockup Thumbnails */}
        {mockups.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {mockups.map((mockup, index) => (
              <button
                key={mockup.id}
                onClick={() => setSelectedMockupIndex(index)}
                className={`aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                  index === selectedMockupIndex
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <img
                  src={mockup.mockup_url}
                  alt={`Vista ${mockup.view_angle}`}
                  className="w-full h-full object-cover"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Column - Info */}
      <div className="space-y-6">
        {/* Design Header */}
        <div>
          {design.featured && (
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500 text-gray-900 rounded-full text-sm font-bold mb-3">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
              Destacado
            </div>
          )}

          <h1 className="text-4xl font-bold text-white mb-2">{design.name}</h1>

          {design.designer_name && (
            <p className="text-lg text-gray-400">
              por <span className="text-blue-400 font-medium">{design.designer_name}</span>
            </p>
          )}
        </div>

        {/* Description */}
        {design.description && (
          <p className="text-gray-300 text-lg leading-relaxed">{design.description}</p>
        )}

        {/* Sport Switcher */}
        {availableSports.length > 1 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
              Disponible en {availableSports.length} deportes
            </h3>
            <div className="flex flex-wrap gap-2">
              {availableSports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => handleSportChange(sport)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedSport?.id === sport.id
                      ? 'bg-blue-600 text-white shadow-lg'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 border border-gray-700'
                  }`}
                >
                  {sport.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-2 gap-4">
          {design.is_customizable && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="font-semibold">Personalizable</span>
              </div>
              <p className="text-sm text-gray-400">Puedes agregar nombres y números</p>
            </div>
          )}

          {design.allows_recoloring && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
                <span className="font-semibold">Recoloreable</span>
              </div>
              <p className="text-sm text-gray-400">Puedes cambiar los colores</p>
            </div>
          )}
        </div>

        {/* Style Tags */}
        {design.style_tags && design.style_tags.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Estilo</h3>
            <div className="flex flex-wrap gap-2">
              {design.style_tags.map((tag, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/50"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Color Scheme */}
        {design.color_scheme && design.color_scheme.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">Colores</h3>
            <div className="flex flex-wrap gap-2">
              {design.color_scheme.map((color, idx) => (
                <span
                  key={idx}
                  className="px-3 py-1 text-sm rounded-full bg-gray-800 text-gray-300 border border-gray-700"
                >
                  {color}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Available Products */}
        {currentMockupGroup && currentMockupGroup.products.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
              Productos disponibles para {selectedSport?.name}
            </h3>
            <div className="space-y-2">
              {currentMockupGroup.products.map((product: any) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between bg-gray-800/50 border border-gray-700 rounded-lg p-4"
                >
                  <div>
                    <p className="font-semibold text-white">{product.name}</p>
                    <p className="text-sm text-gray-400 capitalize">{product.category}</p>
                  </div>
                  <p className="text-lg font-bold text-blue-400">
                    ${product.price_cents.toLocaleString()} CLP
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 pt-4">
          <button
            className="flex-1 px-6 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold text-lg transition-colors shadow-lg hover:shadow-blue-500/50"
            onClick={() => {
              // TODO: Implement "Add to Order" functionality
              alert('Funcionalidad de "Agregar a pedido" próximamente!');
            }}
          >
            Agregar a pedido
          </button>
          <Link
            href={`/catalog/${selectedSport?.slug}`}
            className="px-6 py-4 bg-gray-800 text-white rounded-lg hover:bg-gray-700 font-semibold transition-colors border border-gray-700"
          >
            Volver al catálogo
          </Link>
        </div>
      </div>
    </div>
  );
}
