'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard, type ColorCustomization } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

export default function ColorsCustomizationPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const {
    selectedTeams,
    teamProducts,
    setBaseColors,
    setColorOverride,
    baseColors: storedBaseColors,
    colorOverrides: storedColorOverrides,
    setMockupPreference,
  } = useDesignRequestWizard();

  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  // Base colors (apply to all teams/products by default)
  const [homeColors, setHomeColors] = useState({
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    accent: '#FFFFFF',
  });

  const [awayColors, setAwayColors] = useState({
    primary: '#FFFFFF',
    secondary: '#FFFFFF',
    accent: '#FFFFFF',
  });

  // Which designs to create: 'local', 'visit', or 'both'
  const [selectedDesigns, setSelectedDesigns] = useState<'local' | 'visit' | 'both'>('both');

  // Track which team-product combinations have custom colors
  const [expandedOverrides, setExpandedOverrides] = useState<Set<string>>(new Set());

  // Local overrides state (teamId:productId -> colors)
  const [localOverrides, setLocalOverrides] = useState<Record<string, {
    home?: { primary: string; secondary: string; accent: string };
    away?: { primary: string; secondary: string; accent: string };
  }>>({});

  useEffect(() => {
    async function loadTeamType() {
      const supabase = getBrowserClient();
      const { data: team } = await supabase
        .from('teams')
        .select('team_type')
        .eq('slug', slug)
        .single();

      if (team) {
        setTeamType(team.team_type);
      }
    }

    loadTeamType();
  }, [slug]);

  useEffect(() => {
    loadInitialColors();
  }, [selectedTeams]);

  const loadInitialColors = () => {
    // Load from first team's colors
    if (selectedTeams && selectedTeams.length > 0 && selectedTeams[0].colors) {
      const teamColors = selectedTeams[0].colors;
      const colors = {
        primary: teamColors.primary || '#FFFFFF',
        secondary: teamColors.secondary || '#FFFFFF',
        accent: teamColors.accent || teamColors.tertiary || '#FFFFFF',
      };

      setHomeColors(colors);
      setAwayColors({
        primary: colors.secondary,
        secondary: colors.primary,
        accent: colors.accent,
      });
    } else {
      // Default white
      const defaultColors = {
        primary: '#FFFFFF',
        secondary: '#FFFFFF',
        accent: '#FFFFFF',
      };
      setHomeColors(defaultColors);
      setAwayColors(defaultColors);
    }

    // Load from store if available
    if (storedBaseColors) {
      const basePrimary = storedBaseColors.primary_color || homeColors.primary;
      const baseSecondary = storedBaseColors.secondary_color || homeColors.secondary;
      const baseAccent = storedBaseColors.tertiary_color || homeColors.accent;

      setHomeColors({
        primary: basePrimary,
        secondary: baseSecondary,
        accent: baseAccent,
      });

      // For simplicity, assume away is inverted (can be enhanced later)
      setAwayColors({
        primary: baseSecondary,
        secondary: basePrimary,
        accent: baseAccent,
      });
    }
  };

  // Auto-sync away colors when home colors change
  useEffect(() => {
    setAwayColors({
      primary: homeColors.secondary,
      secondary: homeColors.primary,
      accent: homeColors.accent,
    });
  }, [homeColors.primary, homeColors.secondary, homeColors.accent]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
    }
  };

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

  const toggleOverride = (key: string) => {
    const newExpanded = new Set(expandedOverrides);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
      // Remove override
      const newOverrides = { ...localOverrides };
      delete newOverrides[key];
      setLocalOverrides(newOverrides);
    } else {
      newExpanded.add(key);
      // Initialize with base colors
      setLocalOverrides({
        ...localOverrides,
        [key]: {
          home: { ...homeColors },
          away: { ...awayColors },
        },
      });
    }
    setExpandedOverrides(newExpanded);
  };

  const updateOverrideColors = (key: string, type: 'home' | 'away', colors: { primary: string; secondary: string; accent: string }) => {
    setLocalOverrides({
      ...localOverrides,
      [key]: {
        ...localOverrides[key],
        [type]: colors,
      },
    });
  };

  const handleContinue = () => {
    // Save base colors to store
    const baseColorCustomization: ColorCustomization = {
      primary_color: homeColors.primary,
      secondary_color: homeColors.secondary,
      tertiary_color: homeColors.accent,
      color_hierarchy: 'primary',
    };

    setBaseColors(baseColorCustomization);

    // Save mockup preference
    const mockupPref = selectedDesigns === 'local' ? 'home' : selectedDesigns === 'visit' ? 'away' : 'both';
    setMockupPreference(mockupPref);

    // Save overrides for each team-product combination
    Object.entries(localOverrides).forEach(([key, colors]) => {
      const [teamId, productId] = key.split(':');

      if (colors.home) {
        const homeOverride: ColorCustomization = {
          primary_color: colors.home.primary,
          secondary_color: colors.home.secondary,
          tertiary_color: colors.home.accent,
          color_hierarchy: 'primary',
        };
        setColorOverride(teamId, productId, homeOverride);
      }
    });

    // Navigate based on team type
    if (teamType === 'single_team') {
      router.push(`/mi-equipo/${slug}/design-request/new/review`);
    } else if (teamType === 'institution') {
      router.push(`/mi-equipo/${slug}/design-request/new/quantities`);
    } else {
      console.warn('[Colors] Team type not loaded, defaulting to quantities page');
      router.push(`/mi-equipo/${slug}/design-request/new/quantities`);
    }
  };

  // Calculate all team-product combinations
  const teamProductCombinations: Array<{ teamId: string; teamName: string; productId: string; productName: string; key: string }> = [];
  selectedTeams.forEach(team => {
    const teamId = team.id || team.slug || team.name;
    const products = teamProducts[teamId] || [];
    products.forEach(product => {
      teamProductCombinations.push({
        teamId,
        teamName: team.name,
        productId: product.id,
        productName: product.name,
        key: `${teamId}:${product.id}`,
      });
    });
  });

  const currentStep = teamType === 'single_team' ? 3 : 4;
  const totalWizardSteps = teamType === 'single_team' ? 4 : 6;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title="Personaliza los colores"
      subtitle="Define colores base y personalizaciones opcionales"
      onBack={() => router.push(`/mi-equipo/${slug}/design-request/new/designs`)}
      onContinue={handleContinue}
      canContinue={true}
    >
      <div className="space-y-6">
        {/* Design Selection */}
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

        {/* Base Colors */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border-2 border-blue-500">
          <h3 className="text-sm md:text-base font-semibold text-white mb-2">Colores Base</h3>
          <p className="text-xs text-gray-400 mb-4">Estos colores se aplicarán a todos los equipos y productos</p>

          <div className="grid grid-cols-2 gap-3 md:gap-4 lg:gap-6 items-start">
            {/* Home Colors */}
            <div className={`space-y-2 ${selectedDesigns === 'local' || selectedDesigns === 'both' ? '' : 'opacity-50'}`}>
              <h4 className="text-xs md:text-sm font-semibold text-white mb-2">Local</h4>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.primary}
                    onChange={(e) => setHomeColors({ ...homeColors, primary: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={homeColors.primary}
                    onChange={(e) => setHomeColors({ ...homeColors, primary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.secondary}
                    onChange={(e) => setHomeColors({ ...homeColors, secondary: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={homeColors.secondary}
                    onChange={(e) => setHomeColors({ ...homeColors, secondary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={homeColors.accent}
                    onChange={(e) => setHomeColors({ ...homeColors, accent: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={homeColors.accent}
                    onChange={(e) => setHomeColors({ ...homeColors, accent: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Away Colors */}
            <div className={`space-y-2 ${selectedDesigns === 'visit' || selectedDesigns === 'both' ? '' : 'opacity-50'}`}>
              <h4 className="text-xs md:text-sm font-semibold text-white mb-2">Visita</h4>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Primario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.primary}
                    onChange={(e) => setAwayColors({ ...awayColors, primary: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={awayColors.primary}
                    onChange={(e) => setAwayColors({ ...awayColors, primary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex">
                <button
                  onClick={swapAwayPrimarySecondary}
                  className="ml-auto px-1.5 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded transition-colors text-xs"
                  title="Intercambiar primario y secundario"
                >
                  ↕
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Secundario</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.secondary}
                    onChange={(e) => setAwayColors({ ...awayColors, secondary: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={awayColors.secondary}
                    onChange={(e) => setAwayColors({ ...awayColors, secondary: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex">
                <button
                  onClick={swapAwaySecondaryAccent}
                  className="ml-auto px-1.5 py-1 bg-gray-700/50 hover:bg-gray-600/50 border border-gray-600 rounded transition-colors text-xs"
                  title="Intercambiar secundario y acento"
                >
                  ↕
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-300 mb-1.5">Acento</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={awayColors.accent}
                    onChange={(e) => setAwayColors({ ...awayColors, accent: e.target.value })}
                    className="w-8 h-8 rounded border-2 border-gray-600 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={awayColors.accent}
                    onChange={(e) => setAwayColors({ ...awayColors, accent: e.target.value })}
                    onKeyDown={handleKeyDown}
                    className="w-20 px-2 py-1 bg-black/50 border border-gray-700 rounded text-white text-xs uppercase focus:border-blue-500 outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Optional Per-Team/Product Overrides */}
        {teamProductCombinations.length > 1 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
            <h3 className="text-sm md:text-base font-semibold text-white mb-2">Personalizaciones Opcionales</h3>
            <p className="text-xs text-gray-400 mb-4">
              Personaliza colores para equipos o productos específicos
            </p>

            <div className="space-y-2">
              {teamProductCombinations.map((combo) => {
                const isExpanded = expandedOverrides.has(combo.key);
                const override = localOverrides[combo.key];

                return (
                  <div key={combo.key} className="border border-gray-700 rounded-lg">
                    <button
                      onClick={() => toggleOverride(combo.key)}
                      className="w-full flex items-center justify-between p-3 hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="text-left">
                        <p className="text-sm font-medium text-white">{combo.teamName}</p>
                        <p className="text-xs text-gray-400">{combo.productName}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {isExpanded && <span className="text-xs text-blue-400">Personalizado</span>}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </button>

                    {isExpanded && override && (
                      <div className="p-4 border-t border-gray-700 bg-black/20">
                        <div className="grid grid-cols-2 gap-4">
                          {/* Home Override */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-white">Local</h5>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Primario</label>
                              <input
                                type="color"
                                value={override.home?.primary || homeColors.primary}
                                onChange={(e) => updateOverrideColors(combo.key, 'home', {
                                  ...override.home!,
                                  primary: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Secundario</label>
                              <input
                                type="color"
                                value={override.home?.secondary || homeColors.secondary}
                                onChange={(e) => updateOverrideColors(combo.key, 'home', {
                                  ...override.home!,
                                  secondary: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Acento</label>
                              <input
                                type="color"
                                value={override.home?.accent || homeColors.accent}
                                onChange={(e) => updateOverrideColors(combo.key, 'home', {
                                  ...override.home!,
                                  accent: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                          </div>

                          {/* Away Override */}
                          <div className="space-y-2">
                            <h5 className="text-xs font-semibold text-white">Visita</h5>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Primario</label>
                              <input
                                type="color"
                                value={override.away?.primary || awayColors.primary}
                                onChange={(e) => updateOverrideColors(combo.key, 'away', {
                                  ...override.away!,
                                  primary: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Secundario</label>
                              <input
                                type="color"
                                value={override.away?.secondary || awayColors.secondary}
                                onChange={(e) => updateOverrideColors(combo.key, 'away', {
                                  ...override.away!,
                                  secondary: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-300 mb-1">Acento</label>
                              <input
                                type="color"
                                value={override.away?.accent || awayColors.accent}
                                onChange={(e) => updateOverrideColors(combo.key, 'away', {
                                  ...override.away!,
                                  accent: e.target.value
                                })}
                                className="w-full h-8 rounded border border-gray-600 cursor-pointer"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
