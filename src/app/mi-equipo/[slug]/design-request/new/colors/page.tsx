'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

export default function ColorsCustomizationPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    sport_name,
    gender_category,
    both_config,
    colorCustomization,
    setColorCustomization,
    selectedTeams,
    updateTeam,
  } = useDesignRequestWizard();

  const [teamColors, setTeamColors] = useState<{ primary: string; secondary: string; accent?: string } | null>(null);
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  // Home colors (Local)
  const [homeColors, setHomeColors] = useState({
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    accent: '#FFFFFF',
  });

  // Away colors (Visita)
  const [awayColors, setAwayColors] = useState({
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    accent: '#FFFFFF',
  });

  // Which designs to create: 'local', 'visit', or 'both'
  const [selectedDesigns, setSelectedDesigns] = useState<'local' | 'visit' | 'both'>('both');

  useEffect(() => {
    // Load team type
    async function loadTeamType() {
      const supabase = getBrowserClient();
      const { data: team } = await supabase
        .from('teams')
        .select('team_type')
        .eq('slug', params.slug)
        .single();

      if (team) {
        setTeamType(team.team_type);
      }
    }

    loadTeamType();
  }, [params.slug]);

  useEffect(() => {
    loadTeamColors();

    // Initialize from store if available
    if (gender_category && colorCustomization[gender_category]) {
      const saved = colorCustomization[gender_category]!;
      if (saved.home_colors) {
        setHomeColors(saved.home_colors);
      }
      if (saved.away_colors) {
        setAwayColors(saved.away_colors);
      }
    }
  }, []);

  // Auto-sync away colors when home colors change
  useEffect(() => {
    // Only auto-sync if we haven't loaded custom away colors from store
    const hasCustomAwayColors = gender_category && colorCustomization[gender_category]?.away_colors;

    if (!hasCustomAwayColors) {
      setAwayColors({
        primary: homeColors.secondary,
        secondary: homeColors.primary,
        accent: homeColors.accent,
      });
    }
  }, [homeColors.primary, homeColors.secondary, homeColors.accent]);

  const loadTeamColors = () => {
    // Get colors from the first selected team
    if (selectedTeams && selectedTeams.length > 0 && selectedTeams[0].colors) {
      const teamColors = selectedTeams[0].colors;

      // Team has colors set - use them
      // Support both 'accent' and 'tertiary' for backwards compatibility
      const colors = {
        primary: teamColors.primary || '#FFFFFF',
        secondary: teamColors.secondary || '#FFFFFF',
        accent: teamColors.accent || teamColors.tertiary || '#FFFFFF',
      };

      setTeamColors(colors);

      // Set home colors to team colors
      setHomeColors(colors);

      // Set away colors to inverted team colors
      setAwayColors({
        primary: colors.secondary,
        secondary: colors.primary,
        accent: colors.accent,
      });
    } else {
      // Team has no colors set - default to white
      const defaultColors = {
        primary: '#FFFFFF',
        secondary: '#FFFFFF',
        accent: '#FFFFFF',
      };

      setHomeColors(defaultColors);
      setAwayColors(defaultColors);
    }
  };

  // Prevent Enter key from triggering any navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

  // Swap functions for away colors
  const swapAwayPrimarySecondary = () => {
    setAwayColors({
      primary: awayColors.secondary,
      secondary: awayColors.primary,
      accent: awayColors.accent,
    });
  };

  const swapAwaySecondaryAccent = () => {
    setAwayColors({
      primary: awayColors.primary,
      secondary: awayColors.accent,
      accent: awayColors.secondary,
    });
  };

  const handleContinue = () => {
    // Save colors to team (official team colors)
    if (selectedTeams && selectedTeams.length > 0) {
      updateTeam(0, {
        colors: {
          primary: homeColors.primary,
          secondary: homeColors.secondary,
          tertiary: homeColors.accent,
        }
      });
    }

    // Prepare color config based on selected designs
    let colorConfig: any = {};

    if (selectedDesigns === 'both') {
      colorConfig = {
        home_colors: homeColors,
        away_colors: awayColors,
      };
    } else if (selectedDesigns === 'local') {
      colorConfig = {
        home_colors: homeColors,
      };
    } else if (selectedDesigns === 'visit') {
      colorConfig = {
        away_colors: awayColors,
      };
    }

    if (gender_category === 'both') {
      if (both_config?.same_colors) {
        // Same colors for both genders
        setColorCustomization({
          male: colorConfig,
          female: colorConfig,
        });
      } else {
        // Set male colors; female can be customized separately later
        setColorCustomization({
          male: colorConfig,
        });
      }
    } else if (gender_category === 'male') {
      setColorCustomization({
        male: colorConfig,
      });
    } else if (gender_category === 'female') {
      setColorCustomization({
        female: colorConfig,
      });
    }

    router.push(`/mi-equipo/${params.slug}/design-request/new/quantities`);
  };

  // Adjust step numbers: single teams at colors (3/5), institutions at colors (4/6)
  const currentStep = teamType === 'single_team' ? 3 : 4;
  const totalWizardSteps = teamType === 'single_team' ? 5 : 6;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title={`Personaliza los colores para ${sport_name}`}
      subtitle="Define los colores de local y visita"
      onBack={() => router.push(`/mi-equipo/${params.slug}/design-request/new/designs`)}
      onContinue={handleContinue}
      canContinue={true}
    >
      <div className="space-y-6">
        {/* Selection: Which designs to create */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
          <h3 className="text-sm md:text-base font-semibold text-white mb-3">¿Qué diseños deseas crear?</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setSelectedDesigns('local')}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                selectedDesigns === 'local'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 bg-black/30 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="text-xs md:text-sm font-medium">Solo Local</span>
            </button>
            <button
              onClick={() => setSelectedDesigns('visit')}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                selectedDesigns === 'visit'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 bg-black/30 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="text-xs md:text-sm font-medium">Solo Visita</span>
            </button>
            <button
              onClick={() => setSelectedDesigns('both')}
              className={`flex-1 px-3 py-2 rounded-lg border-2 transition-all ${
                selectedDesigns === 'both'
                  ? 'border-blue-500 bg-blue-500/20 text-white'
                  : 'border-gray-600 bg-black/30 text-gray-400 hover:border-gray-500'
              }`}
            >
              <span className="text-xs md:text-sm font-medium">Ambos</span>
            </button>
          </div>
        </div>

        {/* 2-Column Layout for Home and Away Colors */}
        <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 items-start">
          {/* LEFT COLUMN - Home Colors (Colores de Local) */}
          <div className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-3 md:p-4 border-2 transition-all h-full ${
            selectedDesigns === 'local' || selectedDesigns === 'both'
              ? 'border-blue-500'
              : 'border-gray-700 opacity-50'
          }`}>
            <h3 className="text-sm md:text-base lg:text-lg font-semibold text-white mb-3 md:mb-4">Colores de Local</h3>

            <div className="space-y-2">
              {/* Primary Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Primario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.primary}
                    onChange={(e) => setHomeColors({ ...homeColors, primary: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={homeColors.primary}
                    onChange={(e) => setHomeColors({ ...homeColors, primary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Spacer matching swap button height */}
              <div className="h-6"></div>

              {/* Secondary Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.secondary}
                    onChange={(e) => setHomeColors({ ...homeColors, secondary: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={homeColors.secondary}
                    onChange={(e) => setHomeColors({ ...homeColors, secondary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Spacer matching swap button height */}
              <div className="h-6"></div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.accent}
                    onChange={(e) => setHomeColors({ ...homeColors, accent: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={homeColors.accent}
                    onChange={(e) => setHomeColors({ ...homeColors, accent: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN - Away Colors (Colores de Visita) */}
          <div className={`relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-3 md:p-4 border-2 transition-all h-full ${
            selectedDesigns === 'visit' || selectedDesigns === 'both'
              ? 'border-blue-500'
              : 'border-gray-700 opacity-50'
          }`}>
            <h3 className="text-sm md:text-base lg:text-lg font-semibold text-white mb-3 md:mb-4">Colores de Visita</h3>

            <div className="space-y-2">
              {/* Primary Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Primario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.primary}
                    onChange={(e) => setAwayColors({ ...awayColors, primary: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={awayColors.primary}
                    onChange={(e) => setAwayColors({ ...awayColors, primary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>

              {/* Swap Primary ↔ Secondary */}
              <div className="flex">
                <button
                  onClick={swapAwayPrimarySecondary}
                  className="ml-[67%] px-1.5 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded transition-colors"
                  title="Intercambiar primario y secundario"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-2.5 h-2.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-2.5 h-2.5 text-gray-300 -mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Secondary Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Secundario
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.secondary}
                    onChange={(e) => setAwayColors({ ...awayColors, secondary: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={awayColors.secondary}
                    onChange={(e) => setAwayColors({ ...awayColors, secondary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#003366"
                  />
                </div>
              </div>

              {/* Swap Secondary ↔ Accent */}
              <div className="flex">
                <button
                  onClick={swapAwaySecondaryAccent}
                  className="ml-[67%] px-1.5 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded transition-colors"
                  title="Intercambiar secundario y acento"
                >
                  <div className="flex flex-col items-center">
                    <svg className="w-2.5 h-2.5 text-gray-300" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
                    </svg>
                    <svg className="w-2.5 h-2.5 text-gray-300 -mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </div>
                </button>
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-1.5">
                  Acento
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.accent}
                    onChange={(e) => setAwayColors({ ...awayColors, accent: e.target.value })}
                    className="w-8 h-8 md:w-10 md:h-10 rounded border-2 border-gray-600 cursor-pointer flex-shrink-0"
                  />
                  <input
                    type="text"
                    value={awayColors.accent}
                    onChange={(e) => setAwayColors({ ...awayColors, accent: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 md:w-24 px-1.5 md:px-2 py-1 md:py-1.5 bg-black/50 border border-gray-700 rounded text-white text-[10px] md:text-xs uppercase focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                    placeholder="#FFFFFF"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </WizardLayout>
  );
}
