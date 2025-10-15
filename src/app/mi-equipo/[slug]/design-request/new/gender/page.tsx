'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard, type GenderCategory } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';

export default function GenderSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const { gender_category, both_config, setGenderCategory, setBothConfig } = useDesignRequestWizard();

  const [selectedGender, setSelectedGender] = useState<GenderCategory | null>(gender_category);
  const [sameDesign, setSameDesign] = useState<boolean>(both_config?.same_design ?? true);
  const [sameColors, setSameColors] = useState<boolean>(both_config?.same_colors ?? true);
  const [teamType, setTeamType] = useState<'single_team' | 'institution' | null>(null);

  useEffect(() => {
    // Initialize from store if available
    if (gender_category) {
      setSelectedGender(gender_category);
    }
    if (both_config) {
      setSameDesign(both_config.same_design);
      setSameColors(both_config.same_colors);
    }
  }, []);

  useEffect(() => {
    // Load team type to determine back button behavior
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

  const handleGenderSelect = (gender: GenderCategory) => {
    setSelectedGender(gender);
    setGenderCategory(gender);

    // Reset both_config if not selecting "both"
    if (gender !== 'both') {
      setBothConfig(null);
    }
  };

  const handleContinue = () => {
    if (selectedGender === 'both') {
      setBothConfig({
        same_design: sameDesign,
        same_colors: sameColors,
      });
    }
    router.push(`/mi-equipo/${params.slug}/design-request/new/products`);
  };

  const genderOptions = [
    {
      value: 'male' as GenderCategory,
      title: 'Hombres',
      description: 'Uniforme masculino',
    },
    {
      value: 'female' as GenderCategory,
      title: 'Mujeres',
      description: 'Uniforme femenino',
    },
    {
      value: 'both' as GenderCategory,
      title: 'Ambos',
      description: 'Para hombres y mujeres',
    },
  ];

  const handleBack = () => {
    if (teamType === 'institution') {
      // Institution: go back to teams selection
      router.push(`/mi-equipo/${params.slug}/design-request/new/teams`);
    } else {
      // Single team: go back to team dashboard (this is the first step)
      router.push(`/mi-equipo/${params.slug}`);
    }
  };

  // Adjust step numbers for single teams (skip teams step)
  const currentStep = teamType === 'single_team' ? 1 : 2;
  const totalWizardSteps = teamType === 'single_team' ? 6 : 7;

  return (
    <WizardLayout
      step={currentStep}
      totalSteps={totalWizardSteps}
      title="¿Para quién es este uniforme?"
      subtitle="Esto nos ayudará a mostrarte los productos y tallas correctas"
      onBack={handleBack}
      onContinue={handleContinue}
      canContinue={selectedGender !== null}
    >
      <div className="space-y-6">
        {/* Gender Selection Cards */}
        <div className="grid grid-cols-3 gap-4">
          {genderOptions.map((option) => {
            const isSelected = selectedGender === option.value;
            return (
              <button
                key={option.value}
                onClick={() => handleGenderSelect(option.value)}
                className={`relative group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-6 text-center transition-all hover:shadow-lg hover:scale-[1.02] border-2 ${
                  isSelected
                    ? 'border-blue-500 ring-2 ring-blue-500/50'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-lg"></div>

                <div className="relative flex flex-col items-center">
                  {isSelected && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                  )}

                  {/* Custom Gender Icons */}
                  <div className="mb-4">
                    {option.value === 'male' && (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 border-2 border-[#e21c21]' : 'bg-gradient-to-br from-blue-600/20 to-blue-800/20 border-2 border-blue-600'
                      }`}>
                        <svg className={`w-8 h-8 transition-colors ${isSelected ? 'text-[#e21c21]' : 'text-blue-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <circle cx="10" cy="14" r="6" />
                          <path d="M16 8l6-6m0 0h-5m5 0v5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {option.value === 'female' && (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 border-2 border-[#e21c21]' : 'bg-gradient-to-br from-pink-600/20 to-pink-800/20 border-2 border-pink-600'
                      }`}>
                        <svg className={`w-8 h-8 transition-colors ${isSelected ? 'text-[#e21c21]' : 'text-pink-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <circle cx="12" cy="8" r="6" />
                          <path d="M12 14v8m-3-3h6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                    {option.value === 'both' && (
                      <div className={`w-16 h-16 rounded-full flex items-center justify-center transition-colors ${
                        isSelected ? 'bg-gradient-to-br from-[#e21c21]/20 to-[#a01519]/20 border-2 border-[#e21c21]' : 'bg-gradient-to-br from-purple-600/20 to-purple-800/20 border-2 border-purple-600'
                      }`}>
                        <svg className={`w-8 h-8 transition-colors ${isSelected ? 'text-[#e21c21]' : 'text-purple-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <h3 className="text-lg font-bold text-white mb-1">{option.title}</h3>
                  <p className="text-sm text-gray-400">{option.description}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* "Both" Configuration Options */}
        {selectedGender === 'both' && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-6 border border-blue-500/50 space-y-4">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none rounded-lg"></div>

            <div className="relative">
              <h3 className="text-lg font-semibold text-white mb-4">Configuración para Ambos Géneros</h3>

              {/* Same Design Toggle */}
              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 bg-black/30 rounded-lg border border-gray-700">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-white mb-1">¿Mismo diseño para ambos?</h4>
                    <p className="text-sm text-gray-400">
                      Usar el mismo diseño de uniforme para hombres y mujeres
                    </p>
                  </div>
                  <button
                    onClick={() => setSameDesign(!sameDesign)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      sameDesign ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        sameDesign ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Same Colors Toggle */}
                <div className="flex items-start justify-between p-4 bg-black/30 rounded-lg border border-gray-700">
                  <div className="flex-1 pr-4">
                    <h4 className="font-medium text-white mb-1">¿Mismos colores para ambos?</h4>
                    <p className="text-sm text-gray-400">
                      Aplicar la misma combinación de colores para hombres y mujeres
                    </p>
                  </div>
                  <button
                    onClick={() => setSameColors(!sameColors)}
                    className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 ${
                      sameColors ? 'bg-blue-600' : 'bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        sameColors ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-sm text-blue-300">
                  💡 Puedes personalizar diseños y colores por separado más adelante si lo necesitas
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Helper Info */}
        <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
          <p className="text-sm text-gray-400">
            <span className="font-medium text-white">Nota:</span> La selección de género afectará los productos disponibles, las tallas y las cantidades en los siguientes pasos.
          </p>
        </div>
      </div>
    </WizardLayout>
  );
}
