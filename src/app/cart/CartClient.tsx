'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import QuantityStepper from '@/components/orders/QuantityStepper';
import CartSummary from '@/components/orders/CartSummary';
import { formatCurrency } from '@/types/orders';
import type { CartWithItems, CartItem } from '@/types/orders';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface CartClientProps {
  initialCart: CartWithItems;
}

export default function CartClient({ initialCart }: CartClientProps) {
  const [cart, setCart] = useState(initialCart);
  const [updatingItems, setUpdatingItems] = useState<Set<string>>(new Set());
  const router = useRouter();

  const updateItemQuantity = async (itemId: string, quantity: number) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity })
      });

      if (response.ok) {
        const result = await response.json();
        setCart(result.data.cart);
      } else {
        logger.error('Error updating cart item');
      }
    } catch (error) {
      logger.error('Error updating cart item:', toError(error));
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const removeItem = async (itemId: string) => {
    setUpdatingItems(prev => new Set(prev).add(itemId));

    try {
      const response = await fetch(`/api/cart/items/${itemId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        const result = await response.json();
        setCart(result.data.cart);
      } else {
        logger.error('Error removing cart item');
      }
    } catch (error) {
      logger.error('Error removing cart item:', toError(error));
    } finally {
      setUpdatingItems(prev => {
        const newSet = new Set(prev);
        newSet.delete(itemId);
        return newSet;
      });
    }
  };

  const handleCheckout = () => {
    router.push('/checkout');
  };

  if (cart.items.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="text-6xl mb-4">🛒</div>
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          Tu carrito está vacío
        </h2>
        <p className="text-gray-600 mb-8">
          Explora nuestro catálogo y encuentra productos increíbles
        </p>
        <Link
          href="/catalog"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-red-600 hover:bg-red-700 transition-colors duration-200"
        >
          Ir al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Cart Items */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos en tu carrito
            </h2>
          </div>

          <div className="divide-y divide-gray-200">
            {cart.items.map((item: CartItem) => (
              <div key={item.id} className="p-6">
                <div className="flex items-start space-x-4">
                  {/* Product Image */}
                  <div className="flex-shrink-0 w-20 h-20 bg-gray-100 rounded-lg overflow-hidden">
                    {item.product_images && item.product_images.length > 0 ? (
                      <Image
                        src={item.product_images[0]}
                        alt={item.product_name || 'Product'}
                        width={80}
                        height={80}
                        className="object-cover w-full h-full"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <span className="text-2xl">📦</span>
                      </div>
                    )}
                  </div>

                  {/* Product Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-medium text-gray-900 mb-1">
                      {item.product_name}
                    </h3>
                    <p className="text-sm text-gray-500 mb-2">
                      {formatCurrency(item.product_price_clp || 0, 'CLP')} por unidad
                    </p>

                    <div className="flex items-center justify-between">
                      {/* Quantity Stepper */}
                      <QuantityStepper
                        value={item.quantity}
                        min={1}
                        max={50}
                        onChange={(quantity) => updateItemQuantity(item.id, quantity)}
                        loading={updatingItems.has(item.id)}
                      />

                      {/* Line Total */}
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900">
                          {formatCurrency(item.line_total_clp || 0, 'CLP')}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Remove Button */}
                  <button
                    onClick={() => removeItem(item.id)}
                    disabled={updatingItems.has(item.id)}
                    className="p-2 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                    title="Eliminar producto"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Cart Summary */}
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <CartSummary cart={cart} className="mb-6" />

          <button
            onClick={handleCheckout}
            disabled={cart.items.length === 0 || updatingItems.size > 0}
            className="w-full bg-red-600 text-white py-3 px-4 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 font-medium"
          >
            {updatingItems.size > 0 ? 'Actualizando...' : 'Proceder al checkout'}
          </button>

          <Link
            href="/catalog"
            className="block w-full text-center text-gray-600 hover:text-gray-800 py-2 mt-4 transition-colors duration-200"
          >
            ← Continuar comprando
          </Link>
        </div>
      </div>
    </div>
  );
}