'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import { useDesignRequestWizard } from '@/store/design-request-wizard';
import { WizardLayout } from '@/components/institution/design-request/WizardLayout';
import type { Product as ProductType } from '@/types/products';

export default function ProductsSelectionPage({ params }: { params: { slug: string } }) {
  const router = useRouter();
  const {
    sport_id,
    sport_name,
    gender_category,
    both_config,
    selectedProducts,
    setProductsForGender,
  } = useDesignRequestWizard();

  const [products, setProducts] = useState<ProductType[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    // Redirect to team selection if wizard state is incomplete
    if (!sport_id) {
      router.push(`/mi-equipo/${params.slug}/design-request/new/teams`);
      return;
    }

    loadProducts();

    // Initialize from store if available
    if (gender_category === 'both') {
      const maleProducts = selectedProducts.male || [];
      const femaleProducts = selectedProducts.female || [];
      // For "both", we'll use the same products for now
      setSelectedProductIds(new Set(maleProducts.map(p => p.id)));
    } else if (gender_category === 'male' && selectedProducts.male) {
      setSelectedProductIds(new Set(selectedProducts.male.map(p => p.id)));
    } else if (gender_category === 'female' && selectedProducts.female) {
      setSelectedProductIds(new Set(selectedProducts.female.map(p => p.id)));
    }
  }, []);

  const loadProducts = async () => {
    try {
      const supabase = getBrowserClient();

      if (!sport_id) {
        throw new Error('Sport not selected');
      }

      // Get products that include this sport_id in their sport_ids array
      // icon_url is already included with SELECT '*'
      const { data: productsData, error } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'active')
        .contains('sport_ids', [sport_id])
        .order('category', { ascending: true });

      if (error) throw error;

      setProducts(productsData || []);
    } catch (error) {
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProductToggle = (product: ProductType) => {
    const newSelected = new Set(selectedProductIds);
    if (newSelected.has(product.id)) {
      newSelected.delete(product.id);
    } else {
      newSelected.add(product.id);
    }
    setSelectedProductIds(newSelected);
  };

  const handleContinue = () => {
    const selected = products.filter(p => selectedProductIds.has(p.id));

    if (gender_category === 'both') {
      setProductsForGender('male', selected);
      setProductsForGender('female', selected); // For now, same products for both
    } else if (gender_category === 'male') {
      setProductsForGender('male', selected);
    } else if (gender_category === 'female') {
      setProductsForGender('female', selected);
    }

    router.push(`/mi-equipo/${params.slug}/design-request/new/designs`);
  };

  const getProductIcon = (product: ProductType): React.ReactNode => {
    // Check if custom icon exists first
    if (product.icon_url) {
      return <img src={product.icon_url} alt={product.name} className="w-full h-full object-contain" />;
    }

    // Fallback to category-based emojis
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

  const getCategoryName = (category: string): string => {
    const nameMap: Record<string, string> = {
      'camiseta': 'Camiseta',
      'shorts': 'Shorts',
      'poleron': 'Polerón',
      'medias': 'Medias',
      'chaqueta': 'Chaqueta',
    };
    return nameMap[category] || category;
  };

  const formatPrice = (cents: number | undefined): string => {
    if (!cents || isNaN(cents)) {
      return 'Precio no disponible';
    }
    return `$${(cents / 100).toLocaleString('es-CL')} CLP`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-300">Cargando productos...</p>
        </div>
      </div>
    );
  }

  // Group products by category
  const productsByCategory = products.reduce((groups, product) => {
    const category = product.category;
    if (!groups[category]) {
      groups[category] = [];
    }
    groups[category].push(product);
    return groups;
  }, {} as Record<string, ProductType[]>);

  return (
    <WizardLayout
      step={2}
      totalSteps={6}
      title={`¿Qué productos necesitas para ${sport_name}?`}
      subtitle={
        gender_category === 'both'
          ? `Productos para hombres y mujeres${both_config?.same_design ? ' (mismo diseño)' : ''}`
          : gender_category === 'male'
          ? 'Productos para hombres'
          : 'Productos para mujeres'
      }
      onBack={() => router.push(`/mi-equipo/${params.slug}/design-request/new/teams`)}
      onContinue={handleContinue}
      canContinue={selectedProductIds.size > 0}
    >
      <div className="space-y-6">
        {/* Products Grid - All Products */}
        {products.length > 0 ? (
          <div className="grid grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 md:gap-3 lg:gap-4">
            {products.map((product) => {
              const isSelected = selectedProductIds.has(product.id);
              return (
                <button
                  key={product.id}
                  onClick={() => handleProductToggle(product)}
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
                        <h4 className="font-semibold text-white text-[10px] md:text-xs lg:text-sm line-clamp-2">{product.name}</h4>
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-2">No hay productos disponibles para {sport_name}</p>
            <p className="text-sm text-gray-500">Contacta con el administrador para agregar productos</p>
          </div>
        )}

        {/* Selection Summary */}
        {selectedProductIds.size > 0 && (
          <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-sm p-4 border border-gray-700">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-300">
                {selectedProductIds.size} producto{selectedProductIds.size !== 1 ? 's' : ''} seleccionado{selectedProductIds.size !== 1 ? 's' : ''}
              </span>
              <button
                onClick={() => setSelectedProductIds(new Set())}
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
