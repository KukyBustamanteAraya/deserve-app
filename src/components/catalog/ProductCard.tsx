'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { centsToCLP } from '@/lib/currency';
import type { ProductListItem } from '@/types/catalog';

interface ProductCardProps {
  product: ProductListItem;
  className?: string;
  priority?: boolean; // For image loading priority
}

export function ProductCard({ product, className = '', priority = false }: ProductCardProps) {
  const [imageError, setImageError] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const router = useRouter();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault(); // Prevent navigation
    e.stopPropagation();

    setAddingToCart(true);

    try {
      const response = await fetch('/api/cart/items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          productId: product.id,
          quantity: 1
        })
      });

      if (response.ok) {
        // Show success feedback (you could use a toast library here)
        const successMessage = document.createElement('div');
        successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
        successMessage.textContent = '¡Agregado al carrito!';
        document.body.appendChild(successMessage);

        setTimeout(() => {
          document.body.removeChild(successMessage);
        }, 3000);
      } else {
        const errorData = await response.json();
        if (response.status === 401) {
          router.push('/login');
        } else {
          throw new Error(errorData.error || 'Failed to add to cart');
        }
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
      // Show error feedback
      const errorMessage = document.createElement('div');
      errorMessage.className = 'fixed top-4 right-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      errorMessage.textContent = 'Error al agregar al carrito';
      document.body.appendChild(errorMessage);

      setTimeout(() => {
        document.body.removeChild(errorMessage);
      }, 3000);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <div
      className={`group relative bg-white border-2 border-gray-200 rounded-xl shadow-lg overflow-hidden ${className}`}
      style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
    >
      {/* Top border gradient that expands on hover */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-[#e21c21] to-black scale-x-0 group-hover:scale-x-100 origin-center z-10"
        style={{ transition: 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
      ></div>

      {/* Product Image - Click to view details */}
      <Link
        href={`/catalog/${product.slug}`}
        className="block aspect-square relative bg-gray-100 overflow-hidden"
      >
        {product.thumbnail_url && !imageError ? (
          <Image
            src={product.thumbnail_url}
            alt={product.thumbnail_alt || product.name}
            fill
            className="object-cover group-hover:scale-110 transition-transform duration-300"
            onError={() => setImageError(true)}
            priority={priority}
            sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-6xl" role="img" aria-label="Product placeholder">
              📦
            </span>
          </div>
        )}

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all duration-300" />
      </Link>

      {/* Product Info */}
      <div className="p-6">
        <div>
          <Link href={`/catalog/${product.slug}`}>
            <h3
              className="text-lg font-semibold text-gray-900 group-hover:text-[#e21c21] line-clamp-2 relative inline-block"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              {product.name}
              {/* Underline that expands on hover */}
              <span
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-[2px] w-0 group-hover:w-full bg-gradient-to-r from-[#e21c21] to-black rounded-full"
                style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
              ></span>
            </h3>
          </Link>
          <p className="text-sm text-gray-500 mt-1">
            {product.sport_name}
          </p>
        </div>

        {/* Price */}
        <p className="text-xl font-bold text-red-600 mt-4">
          {centsToCLP(product.display_price_cents ?? product.price_cents ?? product.retail_price_cents ?? product.base_price_cents ?? 0)}
        </p>
      </div>
    </div>
  );
}

// Compact version for smaller spaces
interface CompactProductCardProps {
  product: ProductListItem;
  className?: string;
}

export function CompactProductCard({ product, className = '' }: CompactProductCardProps) {
  const [imageError, setImageError] = useState(false);

  return (
    <Link
      href={`/catalog/${product.slug}`}
      className={`group flex bg-white rounded-lg shadow hover:shadow-md transition-all duration-200 overflow-hidden hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${className}`}
    >
      {/* Product Image */}
      <div className="w-20 h-20 relative bg-gray-100 flex-shrink-0">
        {product.thumbnail_url && !imageError ? (
          <Image
            src={product.thumbnail_url}
            alt={product.thumbnail_alt || product.name}
            fill
            className="object-cover"
            onError={() => setImageError(true)}
            sizes="80px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400">
            <span className="text-2xl" role="img" aria-label="Product placeholder">
              📦
            </span>
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="flex-1 p-4 min-w-0">
        <h4 className="text-sm font-medium text-gray-900 group-hover:text-red-600 transition-colors truncate">
          {product.name}
        </h4>
        <p className="text-xs text-gray-500 mt-1">{product.sport_name}</p>
        <p className="text-lg font-semibold text-red-600 mt-2">
          {centsToCLP(product.display_price_cents ?? product.price_cents ?? product.retail_price_cents ?? product.base_price_cents ?? 0)}
        </p>
      </div>
    </Link>
  );
}

// Product card skeleton for loading states
export function ProductCardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-xl shadow-lg overflow-hidden ${className}`}>
      {/* Image skeleton */}
      <div className="aspect-square bg-gray-200 animate-pulse" />

      {/* Content skeleton */}
      <div className="p-6 space-y-4">
        <div className="space-y-2">
          <div className="h-5 bg-gray-200 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-gray-200 rounded animate-pulse w-1/2" />
        </div>
        <div className="flex items-center justify-between">
          <div className="h-8 bg-gray-200 rounded animate-pulse w-20" />
          <div className="h-6 bg-gray-200 rounded-full animate-pulse w-24" />
        </div>
      </div>
    </div>
  );
}