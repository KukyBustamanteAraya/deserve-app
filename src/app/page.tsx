'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';

interface Sport {
  id: string;
  slug: string;
  name: string;
}

export default function Home() {
  const router = useRouter();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { setSport } = useBuilderState();

  // Fetch sports on mount
  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await fetch('/api/catalog/sports');
        if (!res.ok) throw new Error('Failed to fetch sports');
        const data = await res.json();

        // Filter out unwanted sports
        const excludedSlugs = ['training', 'crossfit', 'padel', 'yoga-pilates', 'golf'];
        const filteredSports = (data.data || []).filter(
          (sport: Sport) => !excludedSlugs.includes(sport.slug)
        );

        setSports(filteredSports);
      } catch (err: any) {
        console.error('Error fetching sports:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSports();
  }, []);

  // Map sports to display with icons
  const getSportIcon = (slug: string) => {
    const iconMap: Record<string, string> = {
      'soccer': '⚽',
      'basketball': '🏀',
      'volleyball': '🏐',
      'rugby': '🏉',
      'hockey': '🏒',
    };
    return iconMap[slug] || '🏆';
  };

  const handleSportClick = (sport: Sport) => {
    // Save selected sport to global state
    setSport(sport.slug);

    // Navigate to catalog with sport filter (using 'sport' param as expected by catalog)
    router.push(`/catalog?sport=${sport.slug}`);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-4">Cargando deportes...</div>
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Error al cargar deportes</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-white overflow-hidden flex flex-col">
      {/* Spacer to account for header - adjust this value based on your header height */}
      <div className="h-16 sm:h-20 flex-shrink-0"></div>

      {/* Main content - centered vertically in remaining space */}
      <div className="flex-1 flex items-center justify-center px-4 pb-20 sm:pb-24">
        <div className="text-center w-full">
          {/* Hero Section */}
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-black mb-3 sm:mb-4 leading-tight font-montserrat">
            <span className="text-[#e21c21]">UNIFORMES</span>
            <br />
            <span className="text-black">PROFESIONALES</span>
          </h1>

          <p className="text-sm sm:text-base md:text-lg lg:text-xl text-gray-700 leading-relaxed mb-6 sm:mb-8 md:mb-10 font-montserrat">
            Diseños únicos · Telas premium · Entregas puntuales
          </p>

          {/* Sports Grid - ALWAYS Single Line, auto-sized to fit screen */}
          {sports.length > 0 && (
            <div className="w-full max-w-6xl mx-auto px-2 sm:px-4">
              <div className="grid gap-2 sm:gap-3 md:gap-4 lg:gap-5" style={{ gridTemplateColumns: `repeat(${sports.length}, minmax(0, 1fr))` }}>
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    onClick={() => handleSportClick(sport)}
                    className="group relative bg-white border-2 border-gray-200 rounded-xl p-2 sm:p-4 md:p-5 lg:p-6 transition-all duration-400 hover:border-[#e21c21] hover:-translate-y-1 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 overflow-hidden"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    aria-label={`Ver diseños de ${sport.name}`}
                  >
                    {/* Top border gradient that expands on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e21c21] to-black scale-x-0 group-hover:scale-x-100 origin-center"
                      style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    ></div>

                    <div className="relative text-center flex flex-col items-center justify-center">
                      <div
                        className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl mb-1 sm:mb-2 md:mb-3 group-hover:scale-110"
                        style={{ transition: 'all 0.3s ease' }}
                      >
                        {getSportIcon(sport.slug)}
                      </div>
                      <h3
                        className="text-[10px] sm:text-xs md:text-sm font-bold text-gray-800 group-hover:text-[#e21c21] leading-tight relative inline-block px-2 sm:px-4 py-1 sm:py-2 rounded transition-all"
                        style={{
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {sport.name.toUpperCase()}
                        {/* Underline that expands on hover */}
                        <span
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-4/5 bg-gradient-to-r from-[#e21c21] to-black rounded-full"
                          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                        ></span>
                      </h3>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
