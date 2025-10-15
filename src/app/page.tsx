'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { logger } from '@/lib/logger';
import RotatingBanner from '@/components/RotatingBanner';

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

  // Custom sport icons from theme settings
  const [customIcons, setCustomIcons] = useState<Record<string, string | null>>({});

  // Fetch sports on mount
  useEffect(() => {
    async function fetchSports() {
      try {
        const res = await fetch('/api/catalog/sports');
        if (!res.ok) throw new Error('Failed to fetch sports');
        const data = await res.json();

        // Sports table is now clean - no filtering needed
        setSports(data.data || []);
      } catch (err: any) {
        logger.error('Error fetching sports:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSports();
  }, []);

  // Fetch custom sport icons from theme settings
  useEffect(() => {
    async function fetchCustomIcons() {
      try {
        const res = await fetch('/api/admin/theme/sport-icons');
        if (res.ok) {
          const data = await res.json();
          logger.info('Loaded custom sport icons:', data);
          setCustomIcons({
            futbol: data.futbolIconUrl || null,
            basquetbol: data.basquetbolIconUrl || null,
            voleibol: data.voleibolIconUrl || null,
            rugby: data.rugbyIconUrl || null,
            hockey: data.hockeyIconUrl || null,
            tenis: data.tenisIconUrl || null,
            handball: data.handballIconUrl || null,
            beisbol: data.beisbolIconUrl || null,
          });
        }
      } catch (err: any) {
        logger.error('Error fetching custom sport icons:', err);
        // Continue with default icons
      }
    }

    fetchCustomIcons();
  }, []);

  // Map sports to display with custom SVG icons - USE SPANISH SLUGS
  const getSportIcon = (slug: string): React.ReactNode => {
    // Check if custom icon exists first
    if (customIcons[slug]) {
      return <img src={customIcons[slug]!} alt={slug} className="w-full h-full object-contain" />;
    }

    // Fallback to hardcoded SVG icons
    const icons: Record<string, React.ReactNode> = {
      'futbol': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#futbolGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M50 10 L60 35 L85 35 L65 52 L73 77 L50 62 L27 77 L35 52 L15 35 L40 35 Z" fill="white" opacity="0.2"/>
          <defs>
            <radialGradient id="futbolGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'basquetbol': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#basketGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M50 5 Q75 50 50 95" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <path d="M5 50 Q50 25 95 50" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <path d="M5 50 Q50 75 95 50" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <defs>
            <radialGradient id="basketGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'voleibol': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#voleiGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 50 Q35 30 50 50 Q65 70 80 50" stroke="white" strokeWidth="3" opacity="0.3" fill="none"/>
          <path d="M50 20 Q30 35 50 50 Q70 65 50 80" stroke="white" strokeWidth="3" opacity="0.3" fill="none"/>
          <defs>
            <radialGradient id="voleiGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'rugby': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <ellipse cx="50" cy="50" rx="45" ry="38" fill="url(#rugbyGrad)" stroke="currentColor" strokeWidth="2"/>
          <line x1="50" y1="12" x2="50" y2="88" stroke="white" strokeWidth="2" opacity="0.3"/>
          <line x1="35" y1="15" x2="35" y2="85" stroke="white" strokeWidth="1.5" opacity="0.2"/>
          <line x1="65" y1="15" x2="65" y2="85" stroke="white" strokeWidth="1.5" opacity="0.2"/>
          <defs>
            <radialGradient id="rugbyGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'hockey': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="35" fill="url(#hockeyGrad)" stroke="currentColor" strokeWidth="3"/>
          <circle cx="50" cy="50" r="25" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
          <circle cx="50" cy="50" r="15" fill="none" stroke="white" strokeWidth="2" opacity="0.3"/>
          <defs>
            <radialGradient id="hockeyGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'tenis': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#tenisGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M15 50 Q50 20 85 50" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <path d="M15 50 Q50 80 85 50" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <defs>
            <radialGradient id="tenisGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'handball': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#handGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M30 30 Q50 40 70 30 Q80 50 70 70 Q50 60 30 70 Q20 50 30 30" fill="white" opacity="0.2"/>
          <defs>
            <radialGradient id="handGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
      'beisbol': (
        <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
          <circle cx="50" cy="50" r="45" fill="url(#beisbolGrad)" stroke="currentColor" strokeWidth="2"/>
          <path d="M20 35 Q30 30 40 35 Q50 40 60 35 Q70 30 80 35" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <path d="M20 65 Q30 70 40 65 Q50 60 60 65 Q70 70 80 65" stroke="white" strokeWidth="2" opacity="0.3" fill="none"/>
          <defs>
            <radialGradient id="beisbolGrad">
              <stop offset="0%" stopColor="#e21c21"/>
              <stop offset="100%" stopColor="#a01519"/>
            </radialGradient>
          </defs>
        </svg>
      ),
    };
    return icons[slug] || (
      <svg viewBox="0 0 100 100" className="w-full h-full" fill="none">
        <circle cx="50" cy="50" r="45" fill="url(#defaultGrad)" stroke="currentColor" strokeWidth="2"/>
        <defs>
          <radialGradient id="defaultGrad">
            <stop offset="0%" stopColor="#e21c21"/>
            <stop offset="100%" stopColor="#a01519"/>
          </radialGradient>
        </defs>
      </svg>
    );
  };

  const handleSportClick = (sport: Sport) => {
    // Save selected sport to global state
    setSport(sport.slug);

    // Navigate to catalog with sport filter (using 'sport' param as expected by catalog)
    router.push(`/catalog?sport=${sport.slug}`);
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-white mb-4">Cargando deportes...</div>
          <div className="w-16 h-16 border-4 border-[#e21c21] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-400 mb-4">Error al cargar deportes</div>
          <p className="text-gray-300">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-[calc(100vh-5rem)] flex flex-col justify-center">
      {/* Main content - centered in viewport */}
      <div className="flex items-center justify-center px-4 py-8">
        <div className="text-center w-full max-w-3xl mx-auto">
          {/* Hero Section */}
          <h1 className="text-3xl sm:text-4xl md:text-3xl lg:text-4xl font-black text-white mb-2 sm:mb-3 leading-tight font-montserrat">
            <span className="text-[#e21c21]">UNIFORMES</span>
            <br />
            <span className="text-white">PROFESIONALES</span>
          </h1>

          <p className="text-[11px] sm:text-base md:text-sm lg:text-base text-gray-300 leading-relaxed mb-4 sm:mb-5 md:mb-6 font-montserrat whitespace-nowrap">
            Diseños únicos · Telas premium · Entregas puntuales
          </p>

          {/* Rotating Banner */}
          <div className="w-3/4 max-w-md mx-auto px-2 sm:px-4 mb-4 sm:mb-5 md:mb-6">
            <RotatingBanner />
          </div>

          {/* Sports Grid - ALWAYS Single Line, auto-sized to fit screen */}
          {sports.length > 0 && (
            <div className="w-full max-w-xl mx-auto px-2 sm:px-4">
              <div className="grid gap-2 sm:gap-3 md:gap-2 lg:gap-3" style={{ gridTemplateColumns: `repeat(${sports.length}, minmax(0, 1fr))` }}>
                {sports.map((sport) => (
                  <button
                    key={sport.id}
                    onClick={() => handleSportClick(sport)}
                    className="group relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2 sm:p-4 md:p-3 lg:p-4 transition-all duration-400 hover:border-[#e21c21]/50 hover:-translate-y-1 hover:shadow-lg hover:shadow-[#e21c21]/30 focus:outline-none focus:ring-2 focus:ring-[#e21c21] focus:ring-offset-2 focus:ring-offset-black overflow-hidden shadow-xl"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    aria-label={`Ver diseños de ${sport.name}`}
                  >
                    {/* Glass shine effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                    {/* Top border gradient that expands on hover */}
                    <div
                      className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e21c21] via-white to-[#e21c21] scale-x-0 group-hover:scale-x-100 origin-center"
                      style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                    ></div>

                    <div className="relative text-center flex flex-col items-center justify-center">
                      <div
                        className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 mb-1 sm:mb-2 md:mb-2 text-white group-hover:scale-110"
                        style={{ transition: 'all 0.3s ease' }}
                      >
                        {getSportIcon(sport.slug)}
                      </div>
                      <h3
                        className="text-[8px] sm:text-xs md:text-xs font-bold text-gray-300 group-hover:text-white leading-tight relative inline-block px-1 sm:px-4 py-1 sm:py-2 rounded transition-all whitespace-nowrap"
                        style={{
                          transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                          letterSpacing: '0.5px'
                        }}
                      >
                        {sport.name.toUpperCase()}
                        {/* Underline that expands on hover */}
                        <span
                          className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-4/5 bg-gradient-to-r from-[#e21c21] via-white to-[#e21c21] rounded-full"
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
