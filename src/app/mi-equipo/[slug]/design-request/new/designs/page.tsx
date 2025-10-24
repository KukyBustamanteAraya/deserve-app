'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard, type Design } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import { GenderBadge } from '@/components/team/orders/GenderBadge';
import Image from 'next/image';
import { toast, Toaster } from 'sonner';

interface DesignWithMockups {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  designer_name: string | null;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  design_mockups: {
    id: string;
    sport_id: number;
    product_type_slug: string;
    mockup_url: string;
    view_angle: string;
    is_primary: boolean;
  }[];
}

interface TeamProductKey {
  teamId: string;
  productId: string;
}

export default function DesignsSelectionPage({ params }: { params: { slug: string } }) {
  const { slug } = params;
  const router = useRouter();
  const {
    selectedTeams,
    teamProducts,
    teamProductDesigns,
    setDesignsForTeamProduct,
    applyDesignToAllProducts,
    favoriteDesigns,
    setFavoriteDesigns,
  } = useDesignRequestWizard();

  const [designs, setDesigns] = useState<DesignWithMockups[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesigns, setSelectedDesigns] = useState<Record<string, string>>({}); // "teamId:productId" -> designId
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);
  const [activeTeamIndex, setActiveTeamIndex] = useState(0);
  const [activeProductIndex, setActiveProductIndex] = useState(0);

  // Map product categories to product_type_slug
  const categoryToProductTypeSlug = (category: string): string => {
    const mapping: Record<string, string> = {
      'camiseta': 'jersey',
      'shorts': 'shorts',
      'poleron': 'hoodie',
      'medias': 'socks',
      'chaqueta': 'jacket',
    };
    return mapping[category] || category;
  };

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

    // Redirect if no teams or products selected
    if (selectedTeams.length === 0) {
      router.push(`/mi-equipo/${slug}/design-request/new/teams`);
      return;
    }

    // Check if at least one team has products
    const hasProducts = selectedTeams.some(team => {
      const teamId = team.id || team.slug || team.name;
      return (teamProducts[teamId] || []).length > 0;
    });

    if (!hasProducts) {
      router.push(`/mi-equipo/${slug}/design-request/new/products`);
      return;
    }

    loadDesigns();

    // Initialize from store if available
    const initial: Record<string, string> = {};
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const products = teamProducts[teamId] || [];

      products.forEach(product => {
        const designs = teamProductDesigns[teamId]?.[product.id];
        if (designs && designs.length > 0) {
          initial[`${teamId}:${product.id}`] = designs[0].id;
        }
      });
    });
    setSelectedDesigns(initial);
  }, [slug]);

  const loadDesigns = async () => {
    try {
      const supabase = getBrowserClient();

      // Get all unique sport IDs from selected teams
      const sportIds = selectedTeams.map(t => t.sport_id).filter((id): id is number => Boolean(id));
      const uniqueSportIds = Array.from(new Set(sportIds));

      if (uniqueSportIds.length === 0) {
        throw new Error('No sports selected');
      }

      // Get designs with mockups
      const { data: designsData, error } = await supabase
        .from('designs')
        .select(`
          *,
          design_mockups (
            id,
            sport_id,
            product_type_slug,
            mockup_url,
            view_angle,
            is_primary
          )
        `)
        .eq('active', true)
        .order('featured', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;

      console.log('All designs fetched:', designsData?.length || 0);

      // Filter designs that have mockups for our sports
      const filtered = (designsData || []).filter((design: any) => {
        const mockups = design.design_mockups || [];
        return mockups.some((m: any) => uniqueSportIds.includes(m.sport_id));
      });

      console.log('Filtered designs:', filtered.length);
      setDesigns(filtered);
    } catch (error) {
      console.error('Error loading designs:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate total products across all teams
  const getTotalProducts = () => {
    return selectedTeams.reduce((total, team) => {
      const teamId = team.id || team.slug || team.name;
      const products = teamProducts[teamId] || [];
      return total + products.length;
    }, 0);
  };

  const handleDesignSelect = (teamId: string, productId: string, designId: string) => {
    const key = `${teamId}:${productId}`;
    const isFirstSelection = Object.keys(selectedDesigns).length === 0;
    const totalProducts = getTotalProducts();

    setSelectedDesigns({
      ...selectedDesigns,
      [key]: designId,
    });

    // Show toast on first selection ONLY if user has more than 1 product
    if (isFirstSelection && totalProducts > 1) {
      toast.custom((t) => (
        <div className="bg-gradient-to-br from-blue-800/90 via-blue-900/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-lg p-4 border border-blue-500/30 max-w-md">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-blue-400">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-white mb-1">Great choice!</h3>
              <p className="text-xs text-gray-300 mb-3">
                Would you like to apply this design to all products?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    handleApplyToAll(designId);
                    toast.dismiss(t);
                  }}
                  className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Apply to All
                </button>
                <button
                  onClick={() => toast.dismiss(t)}
                  className="px-3 py-1.5 text-xs bg-gray-700 hover:bg-gray-600 text-gray-200 rounded-md font-medium transition-colors"
                >
                  Pick Individually
                </button>
              </div>
            </div>
          </div>
        </div>
      ), {
        position: 'bottom-right',
        duration: 8000,
      });
    }
  };

  const handleApplyToAll = (designId: string) => {
    const newSelections: Record<string, string> = {};

    // Apply this design to ALL products across ALL teams
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const products = teamProducts[teamId] || [];

      products.forEach(product => {
        const key = `${teamId}:${product.id}`;
        newSelections[key] = designId;
      });
    });

    setSelectedDesigns(newSelections);
  };

  const handleContinue = () => {
    // Save designs for each team-product combination
    selectedTeams.forEach(team => {
      const teamId = team.id || team.slug || team.name;
      const products = teamProducts[teamId] || [];

      products.forEach(product => {
        const key = `${teamId}:${product.id}`;
        const designId = selectedDesigns[key];

        if (designId) {
          const design = designs.find(d => d.id === designId);
          if (design) {
            const productTypeSlug = categoryToProductTypeSlug(product.category);
            const sportId = team.sport_id;

            const mockup = design.design_mockups.find(
              m => m.product_type_slug === productTypeSlug && m.sport_id === sportId
            );

            const designData: Design[] = [{
              id: design.id,
              name: design.name,
              slug: design.slug,
              mockup_url: mockup?.mockup_url || '',
            }];

            setDesignsForTeamProduct(teamId, product.id, designData);
          }
        }
      });
    });

    router.push(`/mi-equipo/${slug}/design-request/new/colors`);
  };

  const canContinue = () => {
    // Check if at least one team-product has a design selected
    return Object.keys(selectedDesigns).length > 0;
  };

  if (loading || teamType === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando diseños...</p>
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
  const activeTeamProducts = teamProducts[activeTeamId] || [];
  const activeProduct = activeTeamProducts[activeProductIndex];

  if (!activeProduct) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-300">No hay productos seleccionados para este equipo</p>
        </div>
      </div>
    );
  }

  const productTypeSlug = categoryToProductTypeSlug(activeProduct.category);
  const activeTeamSportId = activeTeam?.sport_id;

  // Filter designs for current product type and sport
  const availableDesigns = designs.filter((design: any) =>
    design.design_mockups.some(
      (m: any) => m.product_type_slug === productTypeSlug && m.sport_id === activeTeamSportId
    )
  );

  const currentDesignKey = `${activeTeamId}:${activeProduct.id}`;
  const selectedDesignId = selectedDesigns[currentDesignKey];

  const getCategoryName = (productTypeSlug: string): string => {
    const nameMap: Record<string, string> = {
      'jersey': 'Camiseta',
      'shorts': 'Shorts',
      'hoodie': 'Polerón',
      'socks': 'Medias',
      'jacket': 'Chaqueta',
    };
    return nameMap[productTypeSlug] || productTypeSlug;
  };

  const handleNextProduct = () => {
    if (activeProductIndex < activeTeamProducts.length - 1) {
      setActiveProductIndex(activeProductIndex + 1);
    } else if (activeTeamIndex < selectedTeams.length - 1) {
      // Move to next team
      setActiveTeamIndex(activeTeamIndex + 1);
      setActiveProductIndex(0);
    }
  };

  const handlePreviousProduct = () => {
    if (activeProductIndex > 0) {
      setActiveProductIndex(activeProductIndex - 1);
    } else if (activeTeamIndex > 0) {
      // Move to previous team
      setActiveTeamIndex(activeTeamIndex - 1);
      const prevTeamId = selectedTeams[activeTeamIndex - 1]?.id || selectedTeams[activeTeamIndex - 1]?.slug || selectedTeams[activeTeamIndex - 1]?.name;
      const prevTeamProducts = teamProducts[prevTeamId] || [];
      setActiveProductIndex(prevTeamProducts.length - 1);
    }
  };

  const isFirstProduct = activeTeamIndex === 0 && activeProductIndex === 0;
  const isLastProduct = activeTeamIndex === selectedTeams.length - 1 && activeProductIndex === activeTeamProducts.length - 1;

  // Calculate total products selected
  const totalProductsWithDesigns = Object.keys(selectedDesigns).length;
  let totalProducts = 0;
  selectedTeams.forEach(team => {
    const teamId = team.id || team.slug || team.name;
    totalProducts += (teamProducts[teamId] || []).length;
  });

  // Calculate progress
  const currentProductNumber = selectedTeams.slice(0, activeTeamIndex).reduce((sum, team) => {
    const teamId = team.id || team.slug || team.name;
    return sum + (teamProducts[teamId] || []).length;
  }, 0) + activeProductIndex + 1;

  // Adjust step numbers: single teams at designs (2/5), institutions at designs (3/6)
  const currentStep = teamType === 'single_team' ? 2 : 3;
  const totalWizardSteps = teamType === 'single_team' ? 5 : 6;

  const teamGenderCategory = activeTeam?.gender_category ||
    (activeTeam?.name.toLowerCase().includes('women') || activeTeam?.name.toLowerCase().includes('femenino')
      ? 'female'
      : activeTeam?.name.toLowerCase().includes('men') || activeTeam?.name.toLowerCase().includes('masculino')
      ? 'male'
      : 'both');

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title="Selecciona diseños"
      subtitle={`Producto ${currentProductNumber} de ${totalProducts}`}
      onBack={() => router.push(`/mi-equipo/${slug}/design-request/new/products`)}
      onContinue={handleContinue}
      canContinue={canContinue()}
    >
      {/* Toast notifications */}
      <Toaster position="bottom-right" />

      <div className="space-y-6">
        {/* Current Team and Product */}
        <div className="bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg border border-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div>
                <h3 className="text-lg font-semibold text-white">{activeTeam?.name}</h3>
                <p className="text-sm text-gray-400">{activeTeam?.sport_name}</p>
              </div>
              <GenderBadge
                gender={teamGenderCategory as 'male' | 'female' | 'both'}
                size="sm"
              />
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-blue-400">{getCategoryName(productTypeSlug)}</p>
              <p className="text-xs text-gray-500">{activeProduct.name}</p>
            </div>
          </div>
        </div>

        {/* Designs Grid */}
        {availableDesigns.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {availableDesigns.map(design => {
              const mockup = design.design_mockups.find(
                m => m.product_type_slug === productTypeSlug && m.sport_id === activeTeamSportId
              );
              const isSelected = selectedDesignId === design.id;

              return (
                <button
                  key={design.id}
                  onClick={() => handleDesignSelect(activeTeamId, activeProduct.id, design.id)}
                  className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm overflow-hidden transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                    isSelected
                      ? 'border-blue-500 ring-2 ring-blue-500/50'
                      : 'border-gray-700 hover:border-gray-600'
                  }`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

                  {/* Mockup Image */}
                  <div className="relative aspect-square bg-gray-900">
                    {mockup?.mockup_url ? (
                      <Image
                        src={mockup.mockup_url}
                        alt={design.name}
                        fill
                        sizes="(max-width: 768px) 50vw, (max-width: 1024px) 33vw, 25vw"
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-600">
                        No Image
                      </div>
                    )}

                    {isSelected && (
                      <div className="absolute top-2 right-2 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center z-10">
                        <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    )}

                    {design.featured && (
                      <div className="absolute top-2 left-2 px-2 py-1 bg-yellow-500/90 text-xs font-bold text-black rounded">
                        ⭐ Destacado
                      </div>
                    )}
                  </div>

                  {/* Design Info */}
                  <div className="p-3">
                    <h4 className="font-semibold text-white text-sm mb-1 truncate">
                      {design.name}
                    </h4>
                    {design.designer_name && (
                      <p className="text-xs text-gray-400 mb-2">
                        por {design.designer_name}
                      </p>
                    )}
                    {design.style_tags && design.style_tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {design.style_tags.slice(0, 2).map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-[10px] px-1.5 py-0.5 bg-gray-700/50 text-gray-300 rounded"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg border border-gray-700">
            <p className="text-gray-400">
              No hay diseños disponibles para {getCategoryName(productTypeSlug).toLowerCase()}
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between gap-4 bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg border border-gray-700 p-4">
          <button
            onClick={handlePreviousProduct}
            disabled={isFirstProduct}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isFirstProduct
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-gray-700 hover:bg-gray-600 text-white'
            }`}
          >
            ← Anterior
          </button>

          <div className="text-center">
            <p className="text-sm text-gray-400">
              {totalProductsWithDesigns} de {totalProducts} productos con diseño
            </p>
          </div>

          <button
            onClick={handleNextProduct}
            disabled={isLastProduct}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              isLastProduct
                ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Siguiente →
          </button>
        </div>
      </div>
    </WizardLayout>
  );
}
