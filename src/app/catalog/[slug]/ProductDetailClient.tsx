'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, centsToCLP } from '@/lib/currency';
import { CompactProductCard } from '@/components/catalog/ProductCard';
import FabricSelector from '@/components/catalog/FabricSelector';
import QuantitySlider from '@/components/catalog/QuantitySlider';
import { TeamPricing } from '@/components/catalog/TeamPricing';
import type { ProductDetail, ProductListItem } from '@/types/catalog';

interface PricingResponse {
  base_price_cents: number;
  fabric_modifier_cents: number;
  unit_price_cents: number;
  total_price_cents: number;
  savings_cents: number;
  retail_price_cents: number;
  tier: {
    min_quantity: number;
    max_quantity: number | null;
    price_per_unit_cents: number;
  };
  currency: string;
}

interface ProductDetailClientProps {
  product: ProductDetail;
  relatedProducts: ProductListItem[];
}

export function ProductDetailClient({ product, relatedProducts }: ProductDetailClientProps) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState(new Set<string>());
  const [selectedFabricId, setSelectedFabricId] = useState<string | null>(null);
  const [fabricModifier, setFabricModifier] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [bundles, setBundles] = useState<any[]>([]);

  // Fetch bundles on mount
  useEffect(() => {
    fetch('/api/bundles')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.items) {
          setBundles(data.data.items);
        }
      })
      .catch(err => console.error('Failed to fetch bundles:', err));
  }, []);

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  // Fetch pricing when quantity or fabric changes
  useEffect(() => {
    if (selectedFabricId) {
      fetchPricing();
    }
  }, [quantity, selectedFabricId]);

  const fetchPricing = async () => {
    if (!selectedFabricId) return;

    setLoadingPrice(true);
    try {
      const params = new URLSearchParams({
        product_id: product.id,
        quantity: quantity.toString(),
        fabric_id: selectedFabricId
      });

      const response = await fetch(`/api/pricing/calculate?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch pricing');
      }

      const data = await response.json();
      setPricing(data);
    } catch (error) {
      console.error('Pricing error:', error);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleFabricChange = (fabricId: string, priceModifier: number) => {
    setSelectedFabricId(fabricId);
    setFabricModifier(priceModifier);
  };

  const validImages = product.images.filter(img => !imageErrors.has(img.id));
  const currentImage = validImages[selectedImageIndex] || validImages[0];

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="lg:grid lg:grid-cols-2 lg:gap-x-8">
        {/* Image Gallery */}
        <div className="lg:col-span-1">
          <div className="aspect-square relative bg-gray-100">
            {currentImage ? (
              <Image
                src={currentImage.url}
                alt={currentImage.alt_text || product.name}
                fill
                className="object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 50vw"
                onError={() => handleImageError(currentImage.id)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-8xl" role="img" aria-label="Product placeholder">
                  📦
                </span>
              </div>
            )}
          </div>

          {/* Image Thumbnails */}
          {validImages.length > 1 && (
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
              {validImages.map((image, index) => (
                <button
                  key={image.id}
                  onClick={() => setSelectedImageIndex(index)}
                  className={`flex-shrink-0 w-20 h-20 relative rounded-lg overflow-hidden border-2 transition-all duration-200 ${
                    index === selectedImageIndex
                      ? 'border-red-500 ring-2 ring-red-500 ring-opacity-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Image
                    src={image.url}
                    alt={image.alt_text || `${product.name} - Vista ${index + 1}`}
                    fill
                    className="object-cover"
                    sizes="80px"
                    onError={() => handleImageError(image.id)}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="lg:col-span-1 p-8">
          <div className="space-y-6">
            {/* Title and Sport */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Link
                  href={`/catalog?sport=${product.sport_slug}`}
                  className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 hover:bg-gray-200 transition-colors duration-200"
                >
                  {product.sport_name}
                </Link>
              </div>
              <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            </div>

            {/* Dynamic Price */}
            <div className="bg-gray-50 p-4 rounded-lg">
              {loadingPrice ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ) : pricing ? (
                <>
                  <div className="flex items-baseline gap-3">
                    <span className="text-3xl font-bold text-gray-900">
                      {formatPrice({ cents: pricing.total_price_cents })}
                    </span>
                    <span className="text-sm text-gray-500">
                      ({formatPrice({ cents: pricing.unit_price_cents })} c/u)
                    </span>
                  </div>

                  {pricing.savings_cents > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-sm text-gray-500 line-through">
                        {formatPrice({ cents: pricing.retail_price_cents * quantity })}
                      </span>
                      <span className="text-sm font-medium text-green-600">
                        Ahorras {formatPrice({ cents: pricing.savings_cents })}
                      </span>
                    </div>
                  )}

                  {pricing.tier && (
                    <div className="mt-2 text-xs text-gray-600">
                      Precio por nivel: {pricing.tier.min_quantity}
                      {pricing.tier.max_quantity ? `-${pricing.tier.max_quantity}` : '+'} unidades
                    </div>
                  )}
                </>
              ) : (
                <div className="text-2xl font-bold text-red-600">
                  {centsToCLP(product.display_price_cents ?? product.price_cents ?? product.retail_price_cents ?? product.base_price_cents ?? 0)}
                </div>
              )}
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Descripción</h3>
                <p className="text-gray-700 leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Fabric Selector */}
            <FabricSelector
              selectedFabricId={selectedFabricId}
              onFabricChange={handleFabricChange}
            />

            {/* Quantity Slider */}
            <QuantitySlider
              min={1}
              max={100}
              defaultValue={1}
              onQuantityChange={setQuantity}
            />

            {/* Team Pricing Calculator */}
            <TeamPricing
              productId={product.id}
              bundles={bundles}
            />

            {/* Features (placeholder for now) */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Características</h3>
              <ul className="space-y-2 text-gray-700">
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Tela de alta calidad y durabilidad
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Diseño profesional y moderno
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Disponible en múltiples tallas
                </li>
                <li className="flex items-center">
                  <span className="w-2 h-2 bg-red-500 rounded-full mr-3"></span>
                  Personalización disponible
                </li>
              </ul>
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={() => alert('Agregar al carrito: funcionalidad en desarrollo')}
                disabled={!selectedFabricId || loadingPrice}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {!selectedFabricId ? 'Selecciona una tela' : 'Añadir al carrito'}
              </button>

              <div className="flex gap-4">
                <button
                  disabled
                  className="flex-1 border border-gray-300 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                >
                  Cotizar
                </button>
                <button
                  disabled
                  className="flex-1 border border-gray-300 text-gray-500 py-3 px-6 rounded-lg font-medium cursor-not-allowed"
                >
                  Contactar
                </button>
              </div>
            </div>

            {/* Product Info */}
            <div className="border-t pt-6 text-sm text-gray-600">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="font-medium">Deporte:</span>
                  <span className="ml-2">{product.sport_name}</span>
                </div>
                <div>
                  <span className="font-medium">SKU:</span>
                  <span className="ml-2">{product.slug}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <div className="border-t bg-gray-50 p-8">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            Productos relacionados
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {relatedProducts.map((relatedProduct) => (
              <CompactProductCard
                key={relatedProduct.id}
                product={relatedProduct}
              />
            ))}
          </div>
          <div className="text-center mt-6">
            <Link
              href={`/catalog?sport=${product.sport_slug}`}
              className="inline-flex items-center px-4 py-2 border border-red-600 text-sm font-medium rounded-md text-red-600 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 transition-colors duration-200"
            >
              Ver todos los productos de {product.sport_name}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}