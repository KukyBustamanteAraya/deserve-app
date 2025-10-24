'use client';

import { useState, useEffect, memo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useQuickDesignRequest } from '@/store/quick-design-request';
import { createClient } from '@/lib/supabase/client';

interface Team {
  id: string;
  name: string;
  slug: string;
  colors: {
    primary?: string;
    secondary?: string;
    accent?: string;
    tertiary?: string; // Backwards compatibility
  };
}

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
    price_clp: number;
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

const DesignDetailClient = memo(function DesignDetailClient({
  design,
  currentSport,
  availableSports,
  mockupsBySport,
  currentMockups,
}: DesignDetailClientProps) {
  const router = useRouter();
  const supabase = createClient();
  const [selectedSport, setSelectedSport] = useState(currentSport);
  const [selectedMockupIndex, setSelectedMockupIndex] = useState(0);

  // Mounted state to prevent hydration errors
  const [mounted, setMounted] = useState(false);

  // Authentication and teams state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [localSelectedTeamId, setLocalSelectedTeamId] = useState<string>(''); // Empty string = no selection
  const [isLoadingTeams, setIsLoadingTeams] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Quick Design Request state
  const {
    teamName,
    primaryColor,
    secondaryColor,
    accentColor,
    setTeamName,
    setPrimaryColor,
    setSecondaryColor,
    setAccentColor,
    setDesignContext,
    setSelectedTeamId,
    canProceedToStep2,
  } = useQuickDesignRequest();

  // Set mounted state and check authentication
  useEffect(() => {
    setMounted(true);

    const checkAuthAndFetchTeams = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          setIsAuthenticated(true);

          // Fetch user's teams
          const { data: teams, error } = await supabase
            .from('teams')
            .select('id, name, slug, colors')
            .eq('created_by', user.id)
            .order('created_at', { ascending: false });

          if (!error && teams) {
            setUserTeams(teams);
          }
        }
      } catch (error) {
        console.error('Error checking auth or fetching teams:', error);
      } finally {
        setIsLoadingTeams(false);
      }
    };

    checkAuthAndFetchTeams();
  }, []);

  // Get mockups for selected sport
  const currentMockupGroup = mockupsBySport.find(
    (group) => group.sport_id === selectedSport?.id
  );
  const mockups = currentMockupGroup?.mockups || [];

  // Set design context when component mounts
  useEffect(() => {
    if (design && currentSport) {
      setDesignContext({
        designId: design.id,
        designSlug: design.slug,
        designName: design.name,
        sportId: currentSport.id,
        sportSlug: currentSport.slug,
        sportName: currentSport.name,
        mockups: mockups,
      });
    }
  }, [design, currentSport, mockups]);

  // When team selection changes, update the form data
  useEffect(() => {
    if (localSelectedTeamId && localSelectedTeamId !== 'new') {
      const selectedTeam = userTeams.find(t => t.id === localSelectedTeamId);
      if (selectedTeam) {
        setTeamName(selectedTeam.name);
        setPrimaryColor(selectedTeam.colors.primary || '#e21c21');
        setSecondaryColor(selectedTeam.colors.secondary || '#ffffff');
        // Support both 'accent' and 'tertiary' for backwards compatibility
        setAccentColor(selectedTeam.colors.accent || selectedTeam.colors.tertiary || '#000000');
        setSelectedTeamId(localSelectedTeamId); // Store in Zustand
      }
    } else if (localSelectedTeamId === 'new') {
      // Clear the form when "Create new team" is selected
      setTeamName('');
      setPrimaryColor('#e21c21');
      setSecondaryColor('#ffffff');
      setAccentColor('#000000');
      setSelectedTeamId(null); // Clear from Zustand
    }
  }, [localSelectedTeamId, userTeams]);

  const selectedMockup = mockups[selectedMockupIndex];

  const handleSportChange = (sport: Sport) => {
    setSelectedSport(sport);
    setSelectedMockupIndex(0);
    router.push(`/designs/${design.slug}?sport=${sport.slug}`);
  };

  // Submit design request for existing team (skip organization page)
  const handleSubmitExistingTeam = async () => {
    if (!localSelectedTeamId || localSelectedTeamId === 'new' || !selectedSport) {
      return;
    }

    setIsSubmitting(true);

    try {
      // Get authenticated user's email
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.email) {
        throw new Error('User not authenticated');
      }

      // Prepare form data
      const formData = new FormData();
      formData.append('design_id', design.id);
      formData.append('sport_id', selectedSport.id.toString());
      formData.append('sport_slug', selectedSport.slug);
      formData.append('existing_team_id', localSelectedTeamId);
      formData.append('team_name', teamName); // Team name from state
      formData.append('primary_color', primaryColor);
      formData.append('secondary_color', secondaryColor);
      formData.append('accent_color', accentColor);
      formData.append('organization_type', 'single_team'); // Default for existing teams
      formData.append('additional_specifications', '');
      formData.append('email', user.email);
      formData.append('role', 'manager'); // Default role for existing team owners
      formData.append('custom_role', '');
      formData.append('is_authenticated', 'true');

      // Submit to API (include credentials for auth session)
      const response = await fetch('/api/quick-design-request', {
        method: 'POST',
        body: formData,
        credentials: 'include', // Ensure session cookies are sent
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Failed to submit design request');
      }

      // Success! Redirect to team page
      const teamSlug = userTeams.find(t => t.id === localSelectedTeamId)?.slug;
      if (teamSlug) {
        router.push(`/mi-equipo/${teamSlug}?request_created=true`);
      } else {
        router.push('/mi-equipo');
      }
    } catch (error) {
      console.error('Error submitting design request:', error);
      alert('Hubo un error al enviar tu solicitud. Por favor intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Design Image Section */}
      <div className="space-y-4 md:space-y-4 fixed top-24 left-0 right-0 md:relative z-40 md:z-auto px-4 md:px-0 pt-2 md:pt-0 pb-2 md:pb-0">
        {/* Main Mockup Image */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-xl border border-gray-700 overflow-hidden aspect-square flex items-center justify-center shadow-2xl group">
          {/* Glass shine effect */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          {selectedMockup ? (
            <img
              src={selectedMockup.mockup_url}
              alt={`${design.name} - ${selectedMockup.view_angle}`}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-gray-400 text-center p-12">
              <svg className="w-24 h-24 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-gray-300">No hay mockup disponible para este deporte</p>
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
                className={`aspect-square rounded-lg border-2 overflow-hidden transition-all backdrop-blur-sm ${
                  index === selectedMockupIndex
                    ? 'border-[#e21c21] ring-2 ring-[#e21c21]/50 shadow-lg shadow-[#e21c21]/20'
                    : 'border-gray-700 hover:border-[#e21c21]/50 bg-gray-800/50'
                }`}
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
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

      {/* Spacer for mobile fixed image */}
      <div className="h-[calc(100vw-2rem)] md:h-0"></div>

      {/* Quick Design Request - Team Info */}
      <div className="mt-2 md:mt-2">
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl p-2.5 sm:p-3 shadow-2xl group">
          {/* Glass shine effect */}
          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

          <div className="relative space-y-2 sm:space-y-2.5">
            {/* Team Selection Dropdown (only for authenticated users with teams, after mount) */}
            {mounted && !isLoadingTeams && isAuthenticated && userTeams.length > 0 && (
              <div>
                <label htmlFor="team-select" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1">
                  ¿Para qué equipo? *
                </label>
                <select
                  id="team-select"
                  value={localSelectedTeamId}
                  onChange={(e) => setLocalSelectedTeamId(e.target.value)}
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white focus:border-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none"
                >
                  <option value="" disabled>Selecciona un equipo...</option>
                  <option value="new">Crear nuevo equipo</option>
                  {userTeams.map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Team Name (only shown when not authenticated, has no teams, or explicitly creating new team) */}
            {((!mounted || !isAuthenticated || userTeams.length === 0) || (mounted && isAuthenticated && userTeams.length > 0 && localSelectedTeamId === 'new')) && (
              <div>
                <label htmlFor="team-name" className="block text-xs sm:text-sm font-semibold text-gray-300 mb-0.5 sm:mb-1">
                  Nombre del equipo *
                </label>
                <input
                  id="team-name"
                  type="text"
                  value={teamName}
                  onChange={(e) => setTeamName(e.target.value)}
                  placeholder="Ej: Leones FC"
                  className="w-full px-2.5 py-1.5 sm:px-3 sm:py-2 text-sm bg-gray-900/50 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:border-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 transition-all outline-none"
                />
              </div>
            )}

            {/* Team Colors (only shown when not authenticated, has no teams, or explicitly creating new) */}
            {((!mounted || !isAuthenticated || userTeams.length === 0) || (mounted && isAuthenticated && userTeams.length > 0 && localSelectedTeamId === 'new')) && (
              <div>
                <label className="block text-xs sm:text-sm font-semibold text-gray-300 mb-1 sm:mb-1.5">
                  Colores del equipo *
                </label>
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                  {/* Primary Color */}
                  <div>
                    <label htmlFor="primary-color" className="block text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2">
                      Primario
                    </label>
                    <div className="relative">
                      <input
                        id="primary-color"
                        type="color"
                        value={primaryColor}
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-[#e21c21] transition-all"
                        style={{ backgroundColor: primaryColor }}
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-white/10"></div>
                    </div>
                    <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-mono truncate">{primaryColor}</p>
                  </div>

                  {/* Secondary Color */}
                  <div>
                    <label htmlFor="secondary-color" className="block text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2">
                      Secundario
                    </label>
                    <div className="relative">
                      <input
                        id="secondary-color"
                        type="color"
                        value={secondaryColor}
                        onChange={(e) => setSecondaryColor(e.target.value)}
                        className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-[#e21c21] transition-all"
                        style={{ backgroundColor: secondaryColor }}
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-white/10"></div>
                    </div>
                    <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-mono truncate">{secondaryColor}</p>
                  </div>

                  {/* Accent Color */}
                  <div>
                    <label htmlFor="accent-color" className="block text-[10px] sm:text-xs text-gray-400 mb-1 sm:mb-2">
                      Acento
                    </label>
                    <div className="relative">
                      <input
                        id="accent-color"
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-full h-10 sm:h-12 rounded-lg cursor-pointer border-2 border-gray-600 hover:border-[#e21c21] transition-all"
                        style={{ backgroundColor: accentColor }}
                      />
                      <div className="absolute inset-0 rounded-lg pointer-events-none border-2 border-white/10"></div>
                    </div>
                    <p className="text-[9px] sm:text-xs text-gray-500 mt-0.5 sm:mt-1 font-mono truncate">{accentColor}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Continue Button */}
            <button
              onClick={async () => {
                if (!mounted || isSubmitting) return;

                const hasSelectedExistingTeam = isAuthenticated && userTeams.length > 0 && localSelectedTeamId && localSelectedTeamId !== 'new';

                if (hasSelectedExistingTeam) {
                  // Submit directly for existing team
                  await handleSubmitExistingTeam();
                } else if (canProceedToStep2()) {
                  // Go to organization page for new team
                  router.push(`/designs/${design.slug}/request/organization`);
                }
              }}
              disabled={!mounted || isSubmitting || !((isAuthenticated && userTeams.length > 0 && localSelectedTeamId && localSelectedTeamId !== 'new') || canProceedToStep2())}
              className={`relative w-full px-4 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold text-sm sm:text-base transition-all shadow-lg overflow-hidden group ${
                mounted && !isSubmitting && ((isAuthenticated && userTeams.length > 0 && localSelectedTeamId && localSelectedTeamId !== 'new') || canProceedToStep2())
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white border border-[#e21c21]/50 shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 cursor-pointer'
                  : 'bg-gray-700/50 text-gray-500 border border-gray-600 cursor-not-allowed'
              }`}
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {/* Glass shine effect - always render to avoid hydration mismatch */}
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
              <span className="relative flex items-center justify-center gap-1.5 sm:gap-2">
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enviando...
                  </>
                ) : mounted && isAuthenticated && userTeams.length > 0 && localSelectedTeamId && localSelectedTeamId !== 'new' ? (
                  <>
                    Enviar solicitud
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                ) : (
                  <>
                    Continuar con el pedido
                    <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </>
                )}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

export default DesignDetailClient;
