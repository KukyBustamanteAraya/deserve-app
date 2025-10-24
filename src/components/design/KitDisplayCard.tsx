'use client';

import Image from 'next/image';
import { useState } from 'react';

interface KitMockup {
  front?: string;
  back?: string;
}

interface KitDisplayData {
  home?: KitMockup;
  away?: KitMockup;
}

interface KitDisplayCardProps {
  mockups: KitDisplayData;
  teamName?: string;
  onReorder?: () => void;
  onModify?: () => void;
  onNewKit?: () => void;
  onDetails?: () => void;
}

export function KitDisplayCard({
  mockups,
  teamName = 'Equipo',
  onReorder,
  onModify,
  onNewKit,
  onDetails
}: KitDisplayCardProps) {
  const [homeView, setHomeView] = useState<'front' | 'back'>('front');
  const [awayView, setAwayView] = useState<'front' | 'back'>('front');

  const hasHome = mockups.home?.front || mockups.home?.back;
  const hasAway = mockups.away?.front || mockups.away?.back;

  // If no mockups at all, don't render anything
  if (!hasHome && !hasAway) {
    return null;
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:gap-8 mb-8">
      {/* Home Kit */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <h2 className="text-sm sm:text-base lg:text-xl font-bold text-white">Kit Local</h2>
            <div className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 bg-[#e21c21]/20 border border-[#e21c21] rounded-full">
              <span className="text-[#e21c21] text-[10px] sm:text-xs lg:text-sm font-medium">LOCAL</span>
            </div>
          </div>

          {/* Kit Mockup */}
          <div className="aspect-square bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 relative overflow-hidden">
            {hasHome ? (
              <>
                <Image
                  src={homeView === 'front' && mockups.home?.front
                    ? mockups.home.front
                    : mockups.home?.back || mockups.home?.front || ''}
                  alt={`${teamName} - Kit Local`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain p-2"
                />

                {/* Front/Back Toggle - Only show if both views exist */}
                {mockups.home?.front && mockups.home?.back && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => setHomeView('front')}
                      className={`px-2 py-1 text-[8px] sm:text-[10px] lg:text-xs rounded transition-all ${
                        homeView === 'front'
                          ? 'bg-[#e21c21] text-white'
                          : 'bg-gray-800/80 text-gray-400 hover:text-white'
                      }`}
                    >
                      FRENTE
                    </button>
                    <button
                      onClick={() => setHomeView('back')}
                      className={`px-2 py-1 text-[8px] sm:text-[10px] lg:text-xs rounded transition-all ${
                        homeView === 'back'
                          ? 'bg-[#e21c21] text-white'
                          : 'bg-gray-800/80 text-gray-400 hover:text-white'
                      }`}
                    >
                      ATRÁS
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-500 mx-auto mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-[10px] sm:text-xs lg:text-sm">Kit no disponible</p>
              </div>
            )}
          </div>

          {/* Kit Info */}
          <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
            <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">
              Diseño: <span className="text-white">{hasHome ? teamName : 'Sin asignar'}</span>
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">
              Vistas: <span className="text-white">{hasHome ? (mockups.home?.front && mockups.home?.back ? '2' : '1') : '0'}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2">
            <button
              onClick={onReorder}
              disabled={!hasHome || !onReorder}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-[#e21c21] hover:bg-[#c11a1e] disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Reordenar
            </button>
            <button
              onClick={onModify}
              disabled={!hasHome || !onModify}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Modificar
            </button>
            <button
              onClick={onNewKit}
              disabled={!onNewKit}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Nuevo
            </button>
            <button
              onClick={onDetails}
              disabled={!hasHome || !onDetails}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Detalles
            </button>
          </div>
        </div>
      </div>

      {/* Away Kit */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl border border-gray-700 overflow-hidden">
        <div className="p-3 sm:p-4 lg:p-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
            <h2 className="text-sm sm:text-base lg:text-xl font-bold text-white">Kit Visitante</h2>
            <div className="px-1.5 sm:px-2 lg:px-3 py-0.5 sm:py-1 bg-blue-500/20 border border-blue-400 rounded-full">
              <span className="text-blue-400 text-[10px] sm:text-xs lg:text-sm font-medium">VISIT</span>
            </div>
          </div>

          {/* Kit Mockup */}
          <div className="aspect-square bg-gradient-to-br from-gray-700/50 to-gray-800/50 rounded-lg border border-gray-600 flex items-center justify-center mb-2 sm:mb-3 lg:mb-4 relative overflow-hidden">
            {hasAway ? (
              <>
                <Image
                  src={awayView === 'front' && mockups.away?.front
                    ? mockups.away.front
                    : mockups.away?.back || mockups.away?.front || ''}
                  alt={`${teamName} - Kit Visitante`}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  className="object-contain p-2"
                />

                {/* Front/Back Toggle - Only show if both views exist */}
                {mockups.away?.front && mockups.away?.back && (
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button
                      onClick={() => setAwayView('front')}
                      className={`px-2 py-1 text-[8px] sm:text-[10px] lg:text-xs rounded transition-all ${
                        awayView === 'front'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800/80 text-gray-400 hover:text-white'
                      }`}
                    >
                      FRENTE
                    </button>
                    <button
                      onClick={() => setAwayView('back')}
                      className={`px-2 py-1 text-[8px] sm:text-[10px] lg:text-xs rounded transition-all ${
                        awayView === 'back'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-800/80 text-gray-400 hover:text-white'
                      }`}
                    >
                      ATRÁS
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center">
                <svg className="w-8 h-8 sm:w-12 sm:h-12 lg:w-16 lg:h-16 text-gray-500 mx-auto mb-1 sm:mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-gray-500 text-[10px] sm:text-xs lg:text-sm">Kit no disponible</p>
              </div>
            )}
          </div>

          {/* Kit Info */}
          <div className="space-y-1 sm:space-y-2 mb-2 sm:mb-3 lg:mb-4">
            <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">
              Diseño: <span className="text-white">{hasAway ? teamName : 'Sin asignar'}</span>
            </p>
            <p className="text-gray-400 text-[10px] sm:text-xs lg:text-sm">
              Vistas: <span className="text-white">{hasAway ? (mockups.away?.front && mockups.away?.back ? '2' : '1') : '0'}</span>
            </p>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-1 sm:gap-1.5 lg:gap-2">
            <button
              onClick={onReorder}
              disabled={!hasAway || !onReorder}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Reordenar
            </button>
            <button
              onClick={onModify}
              disabled={!hasAway || !onModify}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Modificar
            </button>
            <button
              onClick={onNewKit}
              disabled={!onNewKit}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Nuevo
            </button>
            <button
              onClick={onDetails}
              disabled={!hasAway || !onDetails}
              className="px-2 sm:px-3 lg:px-4 py-1.5 sm:py-2 bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800 disabled:text-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors text-[10px] sm:text-xs lg:text-sm font-medium"
            >
              Detalles
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
