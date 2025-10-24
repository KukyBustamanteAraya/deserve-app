'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import { GenderBadge } from '@/components/team/orders/GenderBadge';
import type { Product as ProductType } from '@/types/products';

export default function ProductsSelectionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const {
    selectedTeams,
    teamProducts,
    setProductsForTeam,
    isBulkOrder,
  } = useDesignRequestWizard();

  const [productsBySport, setProductsBySport] = useState<Record<number, ProductType[]>>({});
  const [loading, setLoading] = useState(true);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  // Track selected products per team (local state before committing to store)
  const [localSelections, setLocalSelections] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    // Load team type
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
    // For single teams: Load fresh team data if selectedTeams is empty
    async function initializeForSingleTeam() {
      if (teamType === 'single_team' && selectedTeams.length === 0) {
        console.log('[Products] Loading fresh team data for single team...');
        const supabase = getBrowserClient();
        const { data: team, error: teamError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            sport_id,
            gender_category,
            sports!teams_sport_id_fkey (
              id,
              name,
              slug
            )
          `)
          .eq('slug', slug)
          .single();

        if (teamError) {
          console.error('[Products] Error loading team:', teamError);
          router.push(`/mi-equipo/${slug}`);
          return;
        }

        if (team && team.sport_id && team.sports) {
          // Initialize wizard state with fresh team data
          const { setSport, setGenderCategory, setSelectedTeams, reset } = useDesignRequestWizard.getState();

          console.log('[Products] Resetting wizard state...');
          reset();

          setSport(team.sport_id, team.sports.name);
          setGenderCategory((team.gender_category || 'male') as 'male' | 'female' | 'both');
          setSelectedTeams([{
            id: team.id,
            name: team.name,
            slug: slug,
            sport_id: team.sport_id,
            sport_name: team.sports.name,
            isNew: false,
          }]);

          console.log('[Products] Wizard state initialized');
          return;
        }
      }

      // For institutions: redirect to team selection if no teams selected
      if (selectedTeams.length === 0 && teamType === 'institution') {
        router.push(`/mi-equipo/${slug}/design-request/new/teams`);
        return;
      }
    }

    if (teamType !== null) {
      initializeForSingleTeam();
    }
  }, [teamType, selectedTeams.length, slug, router]);

  useEffect(() => {
    // Initialize local selections from store
    const initialSelections: Record<string, Set<string>> = {};
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const storedProducts = teamProducts[teamId] || [];
      initialSelections[teamId] = new Set(storedProducts.map(p => p.id));
    });
    setLocalSelections(initialSelections);
  }, [selectedTeams, teamProducts]);

  useEffect(() => {
    // Load products for all unique sports
    async function loadProducts() {
      if (selectedTeams.length === 0) return;

      try {
        const supabase = getBrowserClient();
        const sportIds = selectedTeams.map(t => t.sport_id).filter((id): id is number => Boolean(id));
        const uniqueSportIds = Array.from(new Set(sportIds));

        const productsBySportMap: Record<number, ProductType[]> = {};

        for (const sportId of uniqueSportIds) {
          if (!sportId) continue;

          const { data: productsData, error } = await supabase
            .from('products')
            .select('*')
            .eq('status', 'active')
            .contains('sport_ids', [sportId])
            .order('category', { ascending: true });

          if (error) {
            console.error(`Error loading products for sport ${sportId}:`, error);
            continue;
          }

          console.log(`[Products] Loaded products for sport ${sportId}:`, {
            count: productsData?.length || 0,
            products: productsData?.map((p: any) => ({
              id: p.id,
              name: p.name,
              price_clp: p.price_clp,
              hasPriceClp: !!p.price_clp && p.price_clp > 0
            }))
          });

          productsBySportMap[sportId] = productsData || [];
        }

        setProductsBySport(productsBySportMap);
      } catch (error) {
        console.error('Error loading products:', error);
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, [selectedTeams]);

  const handleProductToggle = (teamId: string, product: ProductType) => {
    setLocalSelections(prev => {
      const newSelections = { ...prev };
      const teamSet = new Set(newSelections[teamId] || []);

      if (teamSet.has(product.id)) {
        teamSet.delete(product.id);
      } else {
        teamSet.add(product.id);
      }

      newSelections[teamId] = teamSet;
      return newSelections;
    });
  };

  const handleContinue = () => {
    // Commit all local selections to the store
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const sportId = team.sport_id;

      if (!sportId) return;

      const availableProducts = productsBySport[sportId] || [];
      const selectedProductIds = localSelections[teamId] || new Set();
      const selected = availableProducts.filter((p: any) => selectedProductIds.has(p.id));

      console.log('[Products] Saving products for team:', {
        teamId,
        teamName: team.name,
        selectedCount: selected.length,
        products: selected.map(p => ({
          id: p.id,
          name: p.name,
          price_clp: p.price_clp,
          hasPriceClp: !!p.price_clp && p.price_clp > 0
        }))
      });

      setProductsForTeam(teamId, selected);
    });

    router.push(`/mi-equipo/${slug}/design-request/new/designs`);
  };

  const getProductIcon = (product: ProductType): React.ReactNode => {
    if (product.icon_url) {
      return <img src={product.icon_url} alt={product.name} className="w-full h-full object-contain" />;
    }

    const iconMap: Record<string, string> = {
      'camiseta': '👕',
      'shorts': '🩳',
      'poleron': '🧥',
      'medias': '🧦',
      'chaqueta': '🧥',
    };
    const emoji = iconMap[product.category] || '👔';
    return <span className="text-2xl md:text-3xl lg:text-4xl">{emoji}</span>;
  };

  if (loading || teamType === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando productos...</p>
        </div>
      </div>
    );
  }

  if (selectedTeams.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay equipos seleccionados</p>
        </div>
      </div>
    );
  }

  const activeTeam = selectedTeams[activeTeamIndex];
  const activeTeamId = activeTeam?.id || activeTeam?.slug || activeTeam?.name;
  const activeTeamSportId = activeTeam?.sport_id;
  const activeTeamProducts = activeTeamSportId ? (productsBySport[activeTeamSportId] || []) : [];
  const activeTeamSelectedIds = localSelections[activeTeamId] || new Set();

  // Calculate total products selected across all teams
  const totalProductsSelected = Object.values(localSelections).reduce(
    (sum, teamSet) => sum + teamSet.size,
    0
  );

  // Check if at least one product is selected across all teams
  const canContinue = totalProductsSelected > 0;

  // Adjust step numbers: single teams start at products (1/5), institutions at products after teams (2/6)
  const currentStep = teamType === 'single_team' ? 1 : 2;
  const totalWizardSteps = teamType === 'single_team' ? 5 : 6;

  const handleBack = () => {
    if (teamType === 'institution') {
      router.push(`/mi-equipo/${slug}/design-request/new/teams`);
    } else {
      router.push(`/mi-equipo/${slug}`);
    }
  };

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title={
        selectedTeams.length === 1
          ? `¿Qué productos necesitas para ${activeTeam?.sport_name || 'tu equipo'}?`
          : 'Selecciona productos para cada equipo'
      }
      subtitle={
        selectedTeams.length === 1
          ? activeTeam?.name
          : `${selectedTeams.length} equipos seleccionados`
      }
      onBack={handleBack}
      onContinue={handleContinue}
      canContinue={canContinue}
    >
      <div className="space-y-6">
        {/* Multi-Team Accordion/Tabs */}
        {selectedTeams.length > 1 && (
          <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg border border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-700">
              {selectedTeams.map((team, index) => {
                const teamId = team.id || team.slug || team.name;
                const teamSelectedCount = (localSelections[teamId] || new Set()).size;
                const isActive = index === activeTeamIndex;
                // Use team.gender_category directly (teams always have this set now)
                // Fallback: parse from name if legacy data lacks gender_category
                const teamGenderCategory = team.gender_category ||
                  (team.name.toLowerCase().includes('women') || team.name.toLowerCase().includes('femenino')
                    ? 'female'
                    : 'male');

                return (
                  <div key={teamId}>
                    <button
                      onClick={() => setActiveTeamIndex(index)}
                      className={`w-full px-4 py-3 flex items-center justify-between transition-colors ${
                        isActive
                          ? 'bg-blue-500/20 border-l-4 border-blue-500'
                          : 'hover:bg-gray-800/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`text-sm font-medium ${isActive ? 'text-blue-400' : 'text-gray-300'}`}>
                          {team.name}
                        </span>
                        <span className="text-xs text-gray-500">({team.sport_name})</span>
                        <GenderBadge
                          gender={teamGenderCategory as 'male' | 'female' | 'both'}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        {teamSelectedCount > 0 && (
                          <span className="text-xs text-blue-400 font-medium">
                            {teamSelectedCount} producto{teamSelectedCount !== 1 ? 's' : ''}
                          </span>
                        )}
                        <svg
                          className={`w-5 h-5 text-gray-400 transition-transform ${
                            isActive ? 'rotate-90' : ''
                          }`}
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </button>

                    {/* Expanded Team Products */}
                    {isActive && (
                      <div className="p-4 bg-black/20">
                        {activeTeamProducts.length > 0 ? (
                          <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
                            {activeTeamProducts.map((product) => {
                              const isSelected = activeTeamSelectedIds.has(product.id);
                              return (
                                <button
                                  key={product.id}
                                  onClick={() => handleProductToggle(teamId, product)}
                                  className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-2 md:p-3 text-left transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                                    isSelected
                                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                                      : 'border-gray-700 hover:border-gray-600'
                                  }`}
                                >
                                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>

                                  <div className="relative">
                                    {isSelected && (
                                      <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
                                        <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                      </div>
                                    )}

                                    <div className="flex flex-col items-center gap-1.5 md:gap-2">
                                      <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center">
                                        {getProductIcon(product)}
                                      </div>
                                      <div className="w-full text-center">
                                        <h4 className="font-semibold text-white text-[10px] md:text-xs lg:text-sm line-clamp-2">
                                          {product.name}
                                        </h4>
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <p className="text-gray-400 mb-2">No hay productos disponibles para {team.sport_name}</p>
                            <p className="text-sm text-gray-500">Contacta con el administrador</p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Single Team Products (No Accordion) */}
        {selectedTeams.length === 1 && (
          <div className="space-y-4">
            {activeTeamProducts.length > 0 ? (
              <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
                {activeTeamProducts.map((product) => {
                  const isSelected = activeTeamSelectedIds.has(product.id);
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductToggle(activeTeamId, product)}
                      className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-2 md:p-3 text-left transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/50'
                          : 'border-gray-700 hover:border-gray-600'
                      }`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>

                      <div className="relative">
                        {isSelected && (
                          <div className="absolute -top-1 -right-1 w-5 h-5 md:w-6 md:h-6 bg-blue-500 rounded-full flex items-center justify-center z-10">
                            <svg className="w-3 h-3 md:w-4 md:h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          </div>
                        )}

                        <div className="flex flex-col items-center gap-1.5 md:gap-2">
                          <div className="w-12 h-12 md:w-14 md:h-14 lg:w-16 lg:h-16 flex items-center justify-center">
                            {getProductIcon(product)}
                          </div>
                          <div className="w-full text-center">
                            <h4 className="font-semibold text-white text-[10px] md:text-xs lg:text-sm line-clamp-2">
                              {product.name}
                            </h4>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-400 mb-2">No hay productos disponibles para {activeTeam?.sport_name}</p>
                <p className="text-sm text-gray-500">Contacta con el administrador para agregar productos</p>
              </div>
            )}
          </div>
        )}

        {/* Selection Summary */}
        {totalProductsSelected > 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <span className="text-sm text-gray-300">
                  {totalProductsSelected} producto{totalProductsSelected !== 1 ? 's' : ''} seleccionado{totalProductsSelected !== 1 ? 's' : ''}
                </span>
                {selectedTeams.length > 1 && (
                  <div className="text-xs text-gray-500">
                    {selectedTeams.map(team => {
                      const teamId = team.id || team.slug || team.name;
                      const count = (localSelections[teamId] || new Set()).size;
                      return count > 0 ? (
                        <div key={teamId}>
                          {team.name}: {count} producto{count !== 1 ? 's' : ''}
                        </div>
                      ) : null;
                    })}
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  const resetSelections: Record<string, Set<string>> = {};
                  selectedTeams.forEach(team => {
                    const teamId = team.id || team.slug || team.name;
                    resetSelections[teamId] = new Set();
                  });
                  setLocalSelections(resetSelections);
                }}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Limpiar todo
              </button>
            </div>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
