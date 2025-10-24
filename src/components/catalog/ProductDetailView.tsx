'use client';

import { useState, useEffect } from 'react';
import FabricSelector from './FabricSelector';
import QuantitySlider from './QuantitySlider';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface Product {
  id: string;
  name: string;
  description: string;
  base_price_cents: number;
  retail_price_cents: number;
  fabric_id: string;
  images: any[];
  category: string;
  is_bundle: boolean;
}

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

interface ProductDetailViewProps {
  product: Product;
  onAddToCart: (productId: string, quantity: number, fabricId: string) => void;
}

export default function ProductDetailView({
  product,
  onAddToCart
}: ProductDetailViewProps) {
  const [selectedFabricId, setSelectedFabricId] = useState<string>(product.fabric_id);
  const [fabricModifier, setFabricModifier] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [pricing, setPricing] = useState<PricingResponse | null>(null);
  const [loadingPrice, setLoadingPrice] = useState(false);

  // Fetch pricing when quantity or fabric changes
  useEffect(() => {
    fetchPricing();
  }, [quantity, selectedFabricId]);

  const fetchPricing = async () => {
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
      logger.error('Pricing error:', toError(error));
    } finally {
      setLoadingPrice(false);
    }
  };

  const handleFabricChange = (fabricId: string, priceModifier: number) => {
    setSelectedFabricId(fabricId);
    setFabricModifier(priceModifier);
  };

  const handleAddToCart = () => {
    onAddToCart(product.id, quantity, selectedFabricId);
  };

  const formatPrice = (cents: number) => {
    return `$${(cents / 1000).toFixed(0)}k`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="aspect-square bg-gray-100 rounded-lg overflow-hidden">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0].url}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                Sin imagen
              </div>
            )}
          </div>

          {/* Thumbnail gallery */}
          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((image: any, idx: number) => (
                <div key={idx} className="aspect-square bg-gray-100 rounded overflow-hidden cursor-pointer hover:opacity-75">
                  <img
                    src={image.url}
                    alt={`${product.name} ${idx + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Product Info & Configuration */}
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{product.name}</h1>
            <p className="mt-2 text-gray-600">{product.description}</p>
            {product.is_bundle && (
              <span className="inline-block mt-2 px-3 py-1 bg-primary/10 text-primary text-sm rounded-full">
                Bundle - Ahorro incluido
              </span>
            )}
          </div>

          {/* Pricing Display */}
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
                    {formatPrice(pricing.total_price_cents)}
                  </span>
                  <span className="text-sm text-gray-500">
                    ({formatPrice(pricing.unit_price_cents)} c/u)
                  </span>
                </div>

                {pricing.savings_cents > 0 && (
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-sm text-gray-500 line-through">
                      {formatPrice(pricing.retail_price_cents * quantity)}
                    </span>
                    <span className="text-sm font-medium text-green-600">
                      Ahorras {formatPrice(pricing.savings_cents)}
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
              <div className="text-gray-500">Cargando precio...</div>
            )}
          </div>

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

          {/* Add to Cart */}
          <button
            onClick={handleAddToCart}
            className="w-full bg-primary text-white py-3 px-6 rounded-lg font-medium hover:bg-primary-dark transition-colors"
          >
            Agregar al Carrito
          </button>

          {/* Additional Info */}
          <div className="border-t border-gray-200 pt-6 space-y-3 text-sm text-gray-600">
            <p>✓ Entrega estimada: 28 días desde confirmación</p>
            <p>✓ Personalización incluida</p>
            <p>✓ Garantía de cambio por talla</p>
            {product.is_bundle && (
              <p>✓ Precio de bundle - No se venden piezas por separado</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
