'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatPrice, centsToCLP, formatCLPInteger } from '@/lib/currency';
import { CompactProductCard, FabricSelector, QuantitySlider, TeamPricing } from '@/components/catalog';
import type { ProductDetail, ProductListItem } from '@/types/catalog';
import { logger } from '@/lib/logger';

interface PricingResponse {
  unit_price: number;  // CLP integer
  quantity: number;
  total: number;       // CLP integer
  discount_pct?: number;  // Optional bundle discount
}

interface ComponentPricing {
  type_slug: string;
  type_name: string;
  qty: number;
  original_unit_price: number;
  unit_price: number;
  subtotal: number;
}

interface BundlePricingResponse {
  bundle_code: string;
  bundle_name: string;
  quantity: number;
  components: ComponentPricing[];
  original_total: number;
  quantity_discount_pct: number;
  quantity_discount_amount: number;
  subtotal_after_quantity_discount: number;
  bundle_discount_pct: number;
  bundle_discount_amount: number;
  total: number;
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
  const [bundlePricing, setBundlePricing] = useState<BundlePricingResponse | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);
  const [bundles, setBundles] = useState<any[]>([]);
  const [selectedBundleCode, setSelectedBundleCode] = useState<string | null>(null);
  const [priceOpacity, setPriceOpacity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);

  // Helper to determine pricing tier
  const getPricingTier = (qty: number) => {
    if (qty >= 100) return 100;
    if (qty >= 50) return 50;
    if (qty >= 25) return 25;
    if (qty >= 10) return 10;
    if (qty >= 5) return 5;
    return 1;
  };

  // Helper to get discount info for quantity
  const getDiscountInfo = (qty: number) => {
    if (qty >= 100) return { discount: 57.5, min: 100, max: null };
    if (qty >= 50) return { discount: 55, min: 50, max: 99 };
    if (qty >= 25) return { discount: 52.5, min: 25, max: 49 };
    if (qty >= 10) return { discount: 50, min: 10, max: 24 };
    if (qty >= 5) return { discount: 25, min: 5, max: 9 };
    return null;
  };

  // Fetch bundles on mount
  useEffect(() => {
    fetch('/api/bundles')
      .then(res => res.json())
      .then(data => {
        if (data.data && data.data.items) {
          setBundles(data.data.items);
        }
      })
      .catch(err => logger.error('Failed to fetch bundles:', err));
  }, []);

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  // Track the current pricing tier to avoid unnecessary API calls
  const [currentTier, setCurrentTier] = useState<number>(1);
  const [prevFabricModifier, setPrevFabricModifier] = useState<number>(0);
  const [prevBundleCode, setPrevBundleCode] = useState<string | null>(null);

  // Fetch pricing when crossing tier boundaries, fabric, or bundle changes
  useEffect(() => {
    const newTier = getPricingTier(quantity);

    // Only fetch if tier changed, or if fabric/bundle changed
    const tierChanged = newTier !== currentTier;
    const fabricChanged = fabricModifier !== prevFabricModifier;
    const bundleChanged = selectedBundleCode !== prevBundleCode;

    if (tierChanged || fabricChanged || bundleChanged) {
      setCurrentTier(newTier);
      setPrevFabricModifier(fabricModifier);
      setPrevBundleCode(selectedBundleCode);
      fetchPricing();
    }
  }, [quantity, fabricModifier, selectedBundleCode]);

  const fetchPricing = async () => {
    // Fade out
    setPriceOpacity(0);
    setLoadingPrice(true);

    try {
      // If bundle is selected, fetch bundle pricing
      if (selectedBundleCode) {
        const params = new URLSearchParams({
          bundleCode: selectedBundleCode,
          quantity: quantity.toString(),
          fabricModifier: fabricModifier.toString(),
          sportSlug: product.sport_slug
        });

        logger.debug('Fetching bundle pricing with params:', {
          bundleCode: selectedBundleCode,
          quantity,
          fabricModifier,
          sportSlug: product.sport_slug
        });

        const response = await fetch(`/api/pricing/bundle?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch bundle pricing');
        }

        const data = await response.json();
        logger.debug('Bundle pricing response:', data);

        // Wait for fade out to complete before updating
        await new Promise(resolve => setTimeout(resolve, 250));
        setBundlePricing(data);
        setPricing(null);

        // Fade in
        setTimeout(() => setPriceOpacity(1), 50);
      } else {
        // Single product pricing
        const params = new URLSearchParams({
          productId: product.id.toString(),
          quantity: quantity.toString()
        });

        const response = await fetch(`/api/pricing/calculate?${params}`);
        if (!response.ok) {
          throw new Error('Failed to fetch pricing');
        }

        const data = await response.json();

        // Apply fabric modifier to unit price
        const unitPriceWithFabric = data.unit_price + fabricModifier;
        const totalWithFabric = unitPriceWithFabric * quantity;

        logger.debug('Single product pricing:', {
          baseUnitPrice: data.unit_price,
          fabricModifier,
          unitPriceWithFabric,
          quantity,
          totalWithFabric
        });

        // Wait for fade out to complete before updating
        await new Promise(resolve => setTimeout(resolve, 250));
        setPricing({
          ...data,
          unit_price: unitPriceWithFabric,
          total: totalWithFabric
        });
        setBundlePricing(null);

        // Fade in
        setTimeout(() => setPriceOpacity(1), 50);
      }
    } catch (error) {
      logger.error('Pricing error:', error);
      setPriceOpacity(1);
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedFabricId) {
      alert('Por favor selecciona una tela primero');
      return;
    }

    setAddingToCart(true);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: Number(product.id),
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          // Redirect to login
          window.location.href = `/login?redirect=/catalog/${product.slug}`;
          return;
        }
        throw new Error(data.error || 'Error al agregar al carrito');
      }

      // Success - redirect to cart
      window.location.href = '/cart';
    } catch (error) {
      logger.error('Error adding to cart:', error);
      alert(error instanceof Error ? error.message : 'Error al agregar al carrito');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleFabricChange = (fabricId: string, priceModifier: number) => {
    logger.debug('Fabric changed:', { fabricId, priceModifier });
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
            <div className="bg-gray-50 p-4 rounded-lg min-h-[140px] flex flex-col justify-center">
              {loadingPrice ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
              ) : bundlePricing ? (
                <div
                  className="transition-opacity duration-500 ease-in-out"
                  style={{ opacity: priceOpacity }}
                >
                  {/* Bundle Pricing - Itemized */}
                  <div className="space-y-2">
                    <div className="text-sm font-semibold text-gray-900 mb-3">
                      {bundlePricing.bundle_name} ({quantity} {quantity === 1 ? 'set' : 'sets'})
                    </div>

                    {/* Component breakdown with discounted prices */}
                    {bundlePricing.components.map((comp, idx) => (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">
                            {comp.qty}x {comp.type_name}
                          </span>
                          <span className="font-medium text-gray-900">
                            {centsToCLP(comp.unit_price)} c/u
                          </span>
                        </div>
                        {/* Show strikethrough original price if there's a discount */}
                        {bundlePricing.quantity_discount_pct > 0 && (
                          <div className="flex justify-end text-xs text-gray-500">
                            <span className="line-through">{centsToCLP(comp.original_unit_price)} c/u</span>
                          </div>
                        )}
                      </div>
                    ))}

                    {/* Subtotal at original prices */}
                    <div className="flex justify-between text-sm pt-2 border-t border-gray-200 mt-2">
                      <span className="text-gray-600">Subtotal</span>
                      <span className="text-gray-900">{centsToCLP(bundlePricing.original_total)}</span>
                    </div>

                    {/* Quantity discount */}
                    {bundlePricing.quantity_discount_pct > 0 && (
                      <div className="flex justify-between text-sm mt-2">
                        <span className="text-green-700 font-medium">
                          Descuento por cantidad ({bundlePricing.quantity_discount_pct}%)
                        </span>
                        <span className="text-green-700 font-medium">
                          -{centsToCLP(bundlePricing.quantity_discount_amount)}
                        </span>
                      </div>
                    )}

                    {/* Subtotal after quantity discount */}
                    {bundlePricing.quantity_discount_pct > 0 && (
                      <div className="flex justify-between text-sm mt-1">
                        <span className="text-gray-600">Subtotal con descuento</span>
                        <span className="text-gray-900">{centsToCLP(bundlePricing.subtotal_after_quantity_discount)}</span>
                      </div>
                    )}

                    {/* Bundle discount */}
                    {bundlePricing.bundle_discount_pct > 0 && (
                      <div className="flex justify-between text-sm mt-2 pt-2 border-t border-gray-200">
                        <span className="text-green-700 font-medium">
                          Descuento paquete ({bundlePricing.bundle_discount_pct}%)
                        </span>
                        <span className="text-green-700 font-medium">
                          -{centsToCLP(bundlePricing.bundle_discount_amount)}
                        </span>
                      </div>
                    )}

                    {/* Total savings summary */}
                    {(bundlePricing.bundle_discount_pct > 0 || bundlePricing.quantity_discount_pct > 0) && (
                      <div className="mt-2 p-2 bg-green-50 rounded-md">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-semibold text-green-800">
                            Ahorras en total
                          </span>
                          <span className="text-lg font-bold text-green-700">
                            {centsToCLP(bundlePricing.original_total - bundlePricing.total)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="mt-3 pt-3 border-t-2 border-gray-300">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-gray-900">
                          Total
                        </span>
                        <span className="text-3xl font-bold text-red-600">
                          {centsToCLP(bundlePricing.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  className="transition-opacity duration-500 ease-in-out"
                  style={{ opacity: priceOpacity }}
                >
                  {/* Price Display - Always shows consistently */}
                  <div className="space-y-1">
                    <div className="text-sm text-gray-600">Precio por unidad</div>
                    <div className="text-4xl font-bold text-red-600">
                      {pricing ? centsToCLP(pricing.unit_price) : centsToCLP(product.price_cents ?? 0)}
                    </div>

                    {/* Quantity Discount Notice */}
                    {(() => {
                      const discountInfo = getDiscountInfo(quantity);
                      if (discountInfo) {
                        return (
                          <p className="text-xs text-green-700 mt-1.5 font-medium">
                            {discountInfo.discount}% descuento por ordenar {discountInfo.min}
                            {discountInfo.max ? `-${discountInfo.max}` : '+'} unidades
                          </p>
                        );
                      }
                      return null;
                    })()}
                  </div>

                  {/* Total */}
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">
                        Total ({quantity} {quantity === 1 ? 'unidad' : 'unidades'})
                      </span>
                      <span className="text-xl font-semibold text-gray-900">
                        {pricing ? centsToCLP(pricing.total) : centsToCLP((product.price_cents ?? 0) * quantity)}
                      </span>
                    </div>
                  </div>
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

            {/* Quantity Slider */}
            <QuantitySlider
              min={1}
              max={50}
              defaultValue={1}
              onQuantityChange={setQuantity}
            />

            {/* Fabric Selector */}
            <FabricSelector
              selectedFabricId={selectedFabricId}
              onFabricChange={handleFabricChange}
              productTypeSlug={product.product_type_slug}
            />

            {/* Team Pricing Calculator */}
            <TeamPricing
              productId={Number(product.id)}
              bundles={bundles}
              onBundleSelect={(bundleCode) => setSelectedBundleCode(bundleCode)}
              selectedBundleCode={selectedBundleCode}
            />

            {/* Action Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleAddToCart}
                disabled={!selectedFabricId || loadingPrice || addingToCart}
                className="w-full bg-red-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-red-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                {addingToCart ? 'Agregando...' : !selectedFabricId ? 'Selecciona una tela' : 'Añadir al carrito'}
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