'use client';
import React, { useState } from 'react';
import Image from 'next/image';
// import { useProductsBySport } from '../hooks/useProducts';

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState(new Set<number>());

  // Mock data instead of Supabase
  const productsBySport = {};
  const loading = false;
  const error = null;

  const handleImageError = (productId: number) => {
    setImageErrors(prev => new Set([...prev, productId]));
  };

  const sports = [
    { name: 'FÚTBOL', icon: '⚽', key: 'fútbol' },
    { name: 'BÁSQUETBOL', icon: '🏀', key: 'básquetbol' },
    { name: 'VOLEIBOL', icon: '🏐', key: 'voleibol' },
    { name: 'RUGBY', icon: '🏉', key: 'rugby' },
    { name: 'GOLF', icon: '⛳', key: 'golf' },
    { name: 'EQUIPO', icon: '👥', key: 'equipo' }
  ];

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-4">Cargando productos...</div>
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Error al cargar productos</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="flex items-start justify-center pt-16">
        <div className="text-center max-w-6xl mx-auto px-4 w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black mb-6 sm:mb-8 leading-tight font-montserrat">
            <span className="text-[#e21c21]">
              UNIFORMES
            </span>
            <br />
            <span className="text-black">PROFESIONALES</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-12 font-montserrat">
            Diseños únicos, telas premium y entregas puntuales.
          </p>

          {/* Sports Selection Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-16">
            {sports.map((sport, index) => (
              <button
                key={index}
                onClick={() => setSelectedSport(sport.name)}
                className={`group relative bg-white border-2 rounded-xl p-6 hover:border-red-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                  selectedSport === sport.name ? 'border-red-500 shadow-lg' : 'border-gray-200'
                }`}
              >
                <div className="text-center">
                  <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                    {sport.icon}
                  </div>
                  <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                    selectedSport === sport.name ? 'text-red-600' : 'text-gray-800 group-hover:text-red-600'
                  }`}>
                    {sport.name}
                  </h3>
                </div>
              </button>
            ))}
          </div>

          {/* Products Grid - Shows when sport is selected */}
          {selectedSport && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-black text-black font-montserrat">
                  <span className="text-[#e21c21]">PRODUCTOS DE</span>{' '}
                  <span className="text-black">{selectedSport}</span>
                </h2>
                <button
                  onClick={() => setSelectedSport(null)}
                  className="text-gray-600 hover:text-[#e21c21] transition-colors duration-300 font-montserrat text-sm"
                >
                  ✕ Cerrar
                </button>
              </div>

              <div className="text-center py-8">
                <p className="text-gray-500">
                  Productos se cargarán cuando la base de datos esté conectada
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}