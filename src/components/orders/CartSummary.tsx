'use client';

import { formatCurrency } from '@/types/orders';
import type { CartWithItems } from '@/types/orders';

interface CartSummaryProps {
  cart: CartWithItems;
  className?: string;
}

export default function CartSummary({ cart, className = '' }: CartSummaryProps) {
  const itemCount = cart.items.reduce((total, item) => total + item.quantity, 0);

  return (
    <div className={`bg-gray-50 rounded-lg p-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Resumen del carrito</h3>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">
            Artículos ({itemCount} {itemCount === 1 ? 'producto' : 'productos'})
          </span>
          <span className="text-gray-900 font-medium">
            {formatCurrency(cart.total_clp, 'CLP')}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Envío</span>
          <span className="text-gray-900 font-medium">Gratis</span>
        </div>

        <hr className="my-2" />

        <div className="flex justify-between text-lg font-semibold">
          <span className="text-gray-900">Total</span>
          <span className="text-red-600">
            {formatCurrency(cart.total_clp, 'CLP')}
          </span>
        </div>
      </div>

      {cart.items.length === 0 && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">🛒</div>
          <p className="text-gray-500">Tu carrito está vacío</p>
        </div>
      )}
    </div>
  );
}