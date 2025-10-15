'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard, type Design } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import Image from 'next/image';

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

export default function DesignsSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    sport_id,
    sport_name,
    gender_category,
    both_config,
    selectedProducts,
    productDesigns,
    setDesignsForProduct,
  } = useDesignRequestWizard();

  const [designs, setDesigns] = useState<DesignWithMockups[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDesignsByProduct, setSelectedDesignsByProduct] = useState<Record<string, string>>({});

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

  // Get unique product type slugs from selected products
  const getProductTypeSlugs = () => {
    const products = gender_category === 'male'
      ? selectedProducts.male || []
      : gender_category === 'female'
      ? selectedProducts.female || []
      : selectedProducts.male || []; // For "both", use male products as reference

    // Map category to product_type_slug
    return [...new Set(products.map(p => categoryToProductTypeSlug(p.category)))];
  };

  useEffect(() => {
    // Redirect if no products selected
    const products = gender_category === 'male'
      ? selectedProducts.male || []
      : gender_category === 'female'
      ? selectedProducts.female || []
      : selectedProducts.male || [];

    if (!sport_id || products.length === 0) {
      router.push(`/mi-equipo/${params.slug}/design-request/new/products`);
      return;
    }

    loadDesigns();

    // Initialize from store if available
    if (gender_category && productDesigns[gender_category]) {
      const initial: Record<string, string> = {};
      Object.entries(productDesigns[gender_category]!).forEach(([productType, designs]) => {
        if (designs && designs.length > 0) {
          initial[productType] = designs[0].id;
        }
      });
      setSelectedDesignsByProduct(initial);
    }
  }, []);

  const loadDesigns = async () => {
    try {
      const supabase = getBrowserClient();

      if (!sport_id) {
        throw new Error('Sport not selected');
      }

      const productTypeSlugs = getProductTypeSlugs();
      console.log('Looking for designs with product types:', productTypeSlugs);
      console.log('Sport ID:', sport_id);

      // Get designs with mockups for this sport
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
      console.log('Sample design mockups:', designsData?.[0]?.design_mockups);

      // Show all unique product_type_slug values found
      const allProductTypes = new Set<string>();
      designsData?.forEach(design => {
        design.design_mockups?.forEach((m: any) => {
          allProductTypes.add(m.product_type_slug);
        });
      });
      console.log('Available product_type_slug values in mockups:', Array.from(allProductTypes));

      // Filter designs that have mockups for our sport and product types
      const filtered = (designsData || []).filter((design) => {
        const mockups = design.design_mockups || [];
        const hasMatch = mockups.some(
          (m) => m.sport_id === sport_id && productTypeSlugs.includes(m.product_type_slug)
        );

        if (!hasMatch && mockups.length > 0) {
          console.log(`Design "${design.name}" not matched. Has mockups for:`,
            mockups.map(m => `${m.product_type_slug} (sport: ${m.sport_id})`));
        }

        return hasMatch;
      });

      console.log('Filtered designs:', filtered.length);
      setDesigns(filtered);
    } catch (error) {
      console.error('Error loading designs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDesignSelect = (productType: string, designId: string) => {
    setSelectedDesignsByProduct({
      ...selectedDesignsByProduct,
      [productType]: designId,
    });
  };

  const handleContinue = () => {
    // Save designs for each product type
    Object.entries(selectedDesignsByProduct).forEach(([productType, designId]) => {
      const design = designs.find(d => d.id === designId);
      if (design) {
        const mockup = design.design_mockups.find(
          m => m.product_type_slug === productType && m.sport_id === sport_id
        );

        const designData: Design[] = [{
          id: design.id,
          name: design.name,
          slug: design.slug,
          mockup_url: mockup?.mockup_url || '',
        }];

        if (gender_category === 'both') {
          if (both_config?.same_design) {
            // Same designs for both genders
            setDesignsForProduct('male', productType, designData);
            setDesignsForProduct('female', productType, designData);
          } else {
            // For now, set male designs; user can customize female separately later
            setDesignsForProduct('male', productType, designData);
          }
        } else if (gender_category === 'male') {
          setDesignsForProduct('male', productType, designData);
        } else if (gender_category === 'female') {
          setDesignsForProduct('female', productType, designData);
        }
      }
    });

    router.push(`/mi-equipo/${params.slug}/design-request/new/colors`);
  };

  const canContinue = () => {
    const productTypeSlugs = getProductTypeSlugs();
    // Must have at least one design selected
    return Object.keys(selectedDesignsByProduct).length > 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando diseños...</p>
        </div>
      </div>
    );
  }

  // Group designs by product type
  const productTypeSlugs = getProductTypeSlugs();
  const designsByProductType: Record<string, DesignWithMockups[]> = {};

  productTypeSlugs.forEach(productType => {
    designsByProductType[productType] = designs.filter(design =>
      design.design_mockups.some(
        m => m.product_type_slug === productType && m.sport_id === sport_id
      )
    );
  });

  const getCategoryName = (productTypeSlug: string): string => {
    const nameMap: Record<string, string> = {
      'jersey': 'Camisetas',
      'shorts': 'Shorts',
      'hoodie': 'Polerones',
      'socks': 'Medias',
      'jacket': 'Chaquetas',
    };
    return nameMap[productTypeSlug] || productTypeSlug;
  };

  return (
    <WizardLayout
      step={3}
      totalSteps={6}
      title={`Selecciona los diseños para ${sport_name}`}
      subtitle={
        gender_category === 'both' && both_config?.same_design
          ? 'Los mismos diseños se aplicarán para hombres y mujeres'
          : 'Elige un diseño para cada producto'
      }
      onBack={() => router.push(`/mi-equipo/${params.slug}/design-request/new/products`)}
      onContinue={handleContinue}
      canContinue={canContinue()}
    >
      <div className="space-y-8">
        {/* Info Banner for "Both" Gender with Same Design */}
        {gender_category === 'both' && both_config?.same_design && (
          <div className="relative bg-gradient-to-br from-blue-800/30 via-blue-900/20 to-gray-900/30 backdrop-blur-md rounded-lg shadow-sm p-4 border border-blue-500/30">
            <p className="text-sm text-blue-200">
              💡 Los diseños seleccionados se aplicarán para hombres y mujeres. Podrás personalizar los colores por separado en el siguiente paso.
            </p>
          </div>
        )}

        {/* Designs by Product Type */}
        {productTypeSlugs.length > 0 ? (
          productTypeSlugs.map(productType => {
            const productDesigns = designsByProductType[productType] || [];
            const selectedDesignId = selectedDesignsByProduct[productType];

            return (
              <div key={productType} className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-white">
                    {getCategoryName(productType)}
                  </h3>
                  <span className="text-sm text-gray-400">
                    {productDesigns.length} diseño{productDesigns.length !== 1 ? 's' : ''} disponible{productDesigns.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {productDesigns.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {productDesigns.map(design => {
                      const mockup = design.design_mockups.find(
                        m => m.product_type_slug === productType && m.sport_id === sport_id
                      );
                      const isSelected = selectedDesignId === design.id;

                      return (
                        <button
                          key={design.id}
                          onClick={() => handleDesignSelect(productType, design.id)}
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
                  <div className="text-center py-8 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 rounded-lg border border-gray-700">
                    <p className="text-gray-400">
                      No hay diseños disponibles para {getCategoryName(productType).toLowerCase()}
                    </p>
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No hay productos seleccionados</p>
            <button
              onClick={() => router.push(`/mi-equipo/${params.slug}/design-request/new/products`)}
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              ← Volver a seleccionar productos
            </button>
          </div>
        )}

        {/* Selection Summary */}
        {Object.keys(selectedDesignsByProduct).length > 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                {Object.keys(selectedDesignsByProduct).length} diseño{Object.keys(selectedDesignsByProduct).length !== 1 ? 's' : ''} seleccionado{Object.keys(selectedDesignsByProduct).length !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedDesignsByProduct({})}
                className="text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Limpiar selección
              </button>
            </div>
          </div>
        )}
      </div>
    </WizardLayout>
  );
}
