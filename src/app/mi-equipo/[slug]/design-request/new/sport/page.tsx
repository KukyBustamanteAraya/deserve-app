'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

interface Sport {
  id: number;
  name: string;
  slug: string;
}

export default function SportSelectionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const { setSport, setInstitutionContext, sport_id } = useDesignRequestWizard();
  const [sports, setSports] = useState<Sport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSportId, setSelectedSportId] = useState<number | null>(sport_id);
  const [customIcons, setCustomIcons] = useState<Record<string, string | null>>({});
  const [iconsLoaded, setIconsLoaded] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load both in parallel and wait for both to complete
      await Promise.all([
        loadInstitutionAndSports(),
        loadCustomIcons()
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadCustomIcons = async () => {
    try {
      const res = await fetch('/api/admin/theme/sport-icons');
      if (res.ok) {
        const data = await res.json();
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
    } catch (error) {
      console.error('Error loading custom icons:', error);
      // Continue without custom icons
    } finally {
      setIconsLoaded(true);
    }
  };

  const loadInstitutionAndSports = async () => {
    try {
      const supabase = getBrowserClient();

      // Get institution
      const { data: institution } = await supabase
        .from('teams')
        .select('id')
        .eq('slug', slug)
        .single();

      if (!institution) {
        throw new Error('Institution not found');
      }

      setInstitutionContext(institution.id, slug);

      // Get all sports
      const { data: sportsData, error: sportsError } = await supabase
        .from('sports')
        .select('id, name, slug')
        .order('name');

      if (sportsError) throw sportsError;

      setSports(sportsData || []);
    } catch (error) {
      console.error('Error loading sports:', error);
    }
  };

  const getSportIcon = (slug: string): React.ReactNode => {
    // Check if custom icon exists first
    if (customIcons[slug]) {
      return <img src={customIcons[slug]!} alt={slug} className="w-full h-full object-contain" />;
    }

    // Fallback to hardcoded SVG icons (same as homepage)
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

  const handleSportSelect = (sport: Sport) => {
    setSelectedSportId(sport.id);
    setSport(sport.id, sport.name);
  };

  const handleContinue = () => {
    if (selectedSportId) {
      router.push(`/mi-equipo/${slug}/design-request/new/teams`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando deportes...</p>
        </div>
      </div>
    );
  }

  return (
    <WizardLayout
      step={1}
      totalSteps={6}
      title="¿Para qué deporte es este pedido?"
      subtitle="Selecciona el deporte para filtrar productos y diseños relevantes"
      onBack={() => router.push(`/mi-equipo/${slug}`)}
      onContinue={handleContinue}
      canContinue={selectedSportId !== null}
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {sports.map((sport) => {
          const isSelected = selectedSportId === sport.id;
          return (
            <button
              key={sport.id}
              onClick={() => handleSportSelect(sport)}
              className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-6 text-center transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                isSelected
                  ? 'border-blue-500 ring-2 ring-blue-500/50'
                  : 'border-gray-700 hover:border-gray-600'
              }`}
            >
              <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>

              <div className="relative flex flex-col items-center">
                {isSelected && (
                  <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                )}

                <div className="w-16 h-16 mb-3 text-white">
                  {getSportIcon(sport.slug)}
                </div>
                <h3 className="text-base font-bold text-white">{sport.name}</h3>
              </div>
            </button>
          );
        })}
      </div>

      {sports.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-400">No se encontraron deportes disponibles</p>
        </div>
      )}
    </WizardLayout>
  );
}
