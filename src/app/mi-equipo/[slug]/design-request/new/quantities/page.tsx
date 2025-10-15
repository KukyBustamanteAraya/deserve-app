'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

export default function QuantitiesPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    sport_name,
    gender_category,
    selectedProducts,
    quantities,
    setQuantities,
  } = useDesignRequestWizard();

  const [quantityData, setQuantityData] = useState<{
    male?: Record<string, number>;
    female?: Record<string, number>;
  }>({});
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

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
    // Initialize quantity data structure
    initializeQuantities();

    // Load from store if available
    if (quantities.male || quantities.female) {
      setQuantityData({
        male: quantities.male || {},
        female: quantities.female || {},
      });
    }
  }, []);

  const initializeQuantities = () => {
    const initial: typeof quantityData = {};

    if (gender_category === 'male' || gender_category === 'both') {
      const maleProducts = selectedProducts.male || [];
      initial.male = {};
      maleProducts.forEach(product => {
        initial.male![product.slug] = 0;
      });
    }

    if (gender_category === 'female' || gender_category === 'both') {
      const femaleProducts = selectedProducts.female || [];
      initial.female = {};
      femaleProducts.forEach(product => {
        initial.female![product.slug] = 0;
      });
    }

    setQuantityData(initial);
  };

  const handleQuantityChange = (
    gender: 'male' | 'female',
    productSlug: string,
    value: string
  ) => {
    const numValue = parseInt(value) || 0;

    setQuantityData(prev => ({
      ...prev,
      [gender]: {
        ...prev[gender],
        [productSlug]: numValue,
      },
    }));
  };

  const handleContinue = () => {
    setQuantities(quantityData);
    router.push(`/mi-equipo/${params.slug}/design-request/new/review`);
  };

  const getGrandTotal = (): { male: number; female: number; total: number } => {
    let maleTotal = 0;
    let femaleTotal = 0;

    if (quantityData.male) {
      maleTotal = Object.values(quantityData.male).reduce((sum, qty) => sum + qty, 0);
    }

    if (quantityData.female) {
      femaleTotal = Object.values(quantityData.female).reduce((sum, qty) => sum + qty, 0);
    }

    return {
      male: maleTotal,
      female: femaleTotal,
      total: maleTotal + femaleTotal,
    };
  };

  const getCategoryName = (slug: string): string => {
    const nameMap: Record<string, string> = {
      'camiseta': 'Camisetas',
      'shorts': 'Shorts',
      'poleron': 'Polerones',
      'medias': 'Medias',
      'chaqueta': 'Chaquetas',
    };
    return nameMap[slug] || slug;
  };

  const totals = getGrandTotal();

  // Adjust step numbers for single teams (skip teams step)
  const currentStep = teamType === 'single_team' ? 4 : 5;
  const totalWizardSteps = teamType === 'single_team' ? 6 : 7;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title={`Cantidades estimadas para ${sport_name}`}
      subtitle="Opcional - Danos una estimación aproximada de las cantidades que necesitas"
      onBack={() => router.push(`/mi-equipo/${params.slug}/design-request/new/colors`)}
      onContinue={handleContinue}
      canContinue={true}
    >
      <div className="space-y-4">
        {(
          <>
            {/* Male Quantities */}
            {(gender_category === 'male' || gender_category === 'both') && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>♂️</span>
                  Hombres
                </h3>

                {(selectedProducts.male || []).map(product => (
                  <div
                    key={product.id}
                    className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-base font-semibold text-white">
                        {getCategoryName(product.slug)}
                      </h4>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400">Cantidad (opcional):</label>
                        <input
                          type="number"
                          min="0"
                          value={quantityData.male?.[product.slug] || ''}
                          onChange={(e) => handleQuantityChange('male', product.slug, e.target.value)}
                          className="w-24 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Female Quantities */}
            {(gender_category === 'female' || gender_category === 'both') && (
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                  <span>♀️</span>
                  Mujeres
                </h3>

                {(selectedProducts.female || []).map(product => (
                  <div
                    key={product.id}
                    className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <h4 className="text-base font-semibold text-white">
                        {getCategoryName(product.slug)}
                      </h4>
                      <div className="flex items-center gap-3">
                        <label className="text-sm text-gray-400">Cantidad (opcional):</label>
                        <input
                          type="number"
                          min="0"
                          value={quantityData.female?.[product.slug] || ''}
                          onChange={(e) => handleQuantityChange('female', product.slug, e.target.value)}
                          className="w-24 px-3 py-2 bg-black/50 border border-gray-700 rounded-lg text-white text-center focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                          placeholder="0"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Grand Total Summary */}
            {totals.total > 0 && (
              <div className="relative bg-gradient-to-br from-blue-800/30 via-blue-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-4 border border-blue-500/30">
                <h4 className="text-base font-semibold text-white mb-2">Resumen Total</h4>
                <div className="flex items-center gap-6">
                  {totals.male > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">♂️ Hombres:</span>
                      <span className="text-lg font-bold text-white">{totals.male}</span>
                    </div>
                  )}
                  {totals.female > 0 && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-300">♀️ Mujeres:</span>
                      <span className="text-lg font-bold text-white">{totals.female}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-300">Total:</span>
                    <span className="text-xl font-bold text-blue-400">{totals.total}</span>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </WizardLayout>
  );
}
