'use client';
import React, { useState, useCallback, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
// import { useProducts } from '../../../hooks/useProducts';
import { Skeleton } from '../../../components/ui/Skeleton';
import { ErrorBoundary } from '../../../components/ErrorBoundary';

export default function ProductsPage() {
  const params = useParams();
  const sport = decodeURIComponent(params.sport as string);
  const [displayCount, setDisplayCount] = useState(12);
  const [imageErrors, setImageErrors] = useState(new Set<number>());

  // const { products: allProducts, loading, error } = useProducts(sport);
  const allProducts: any[] = [];
  const loading = false;
  const error = null;
  const products = useMemo(() => allProducts.slice(0, displayCount), [allProducts, displayCount]);
  const hasMore = displayCount < allProducts.length;
  const sportName = sport?.charAt(0).toUpperCase() + sport?.slice(1) || '';

  const loadMore = useCallback(() => {
    setDisplayCount(prev => Math.min(prev + 12, allProducts.length));
  }, [allProducts.length]);

  const handleImageError = useCallback((productId: number) => {
    setImageErrors(prev => new Set([...prev, productId]));
  }, []);

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white">
        <div className="flex items-start justify-center pt-16">
          <div className="max-w-7xl mx-auto px-4 w-full">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-black mb-4 leading-tight font-montserrat">
                <span className="text-[#e21c21]">PRODUCTOS DE</span>{' '}
                <span className="text-black">{sportName.toUpperCase()}</span>
              </h1>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed font-montserrat">
                Explora nuestra colección completa de uniformes profesionales
              </p>
            </div>

            {/* Products Grid - Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="bg-white border-2 border-gray-200 rounded-xl p-4">
                  {/* Image skeleton */}
                  <Skeleton className="aspect-square mb-3" />
                  {/* Title skeleton */}
                  <Skeleton className="h-4 mb-2" />
                  {/* Price skeleton */}
                  <Skeleton className="h-6 w-20 mx-auto mb-2" />
                  {/* Button skeleton */}
                  <Skeleton className="h-8 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-red-600 mb-4">Error al cargar productos</div>
          <p className="text-gray-600">{error}</p>
          <button
            onClick={() => window.location.href = '/'}
            className="mt-4 text-blue-600 hover:text-blue-800"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (allProducts.length === 0) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-4">No hay productos disponibles para {sportName}</div>
          <button
            onClick={() => window.location.href = '/'}
            className="text-blue-600 hover:text-blue-800"
          >
            ← Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="w-full min-h-screen bg-white">
        <div className="flex items-start justify-center pt-16">
          <div className="max-w-7xl mx-auto px-4 w-full">
            {/* Header */}
            <div className="text-center mb-12">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-black text-black mb-4 leading-tight font-montserrat">
                <span className="text-[#e21c21]">PRODUCTOS DE</span>{' '}
                <span className="text-black">{sportName.toUpperCase()}</span>
              </h1>
              <p className="text-base md:text-lg text-gray-700 leading-relaxed font-montserrat">
                Explora nuestra colección completa de uniformes profesionales
              </p>

              {/* Back to Home Button */}
              <div className="mt-6">
                <button
                  onClick={() => window.location.href = '/'}
                  className="text-gray-600 hover:text-[#e21c21] transition-colors duration-300 font-montserrat"
                >
                  ← Volver al inicio
                </button>
              </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {products.map((product: any) => (
                <div
                  key={product.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-red-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-gray-100 rounded-lg mb-3 overflow-hidden relative">
                    {imageErrors.has(product.id) ? (
                      <div className="w-full h-full flex items-center justify-center">
                        <div className="text-3xl text-gray-400">📸</div>
                      </div>
                    ) : (
                      <Image
                        src={product.image_url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                        loading="lazy"
                        onError={() => handleImageError(product.id)}
                        placeholder="blur"
                        blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkrHB0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyzsssssss/9k="
                      />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="text-center space-y-2">
                    <h3 className="text-sm font-semibold text-gray-800 font-montserrat h-10 flex items-center justify-center text-center">
                      {product.name}
                    </h3>
                    <p className="text-lg font-black text-[#e21c21] font-montserrat">
                      {product.price}
                    </p>
                    <button className="w-full bg-[#e21c21] text-white py-2 px-4 rounded-xl font-semibold hover:bg-black transition-colors duration-300 text-sm font-montserrat">
                      Ver Producto
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && (
              <div className="text-center mt-12 mb-8">
                <button
                  onClick={loadMore}
                  className="bg-[#e21c21] text-white px-8 py-3 rounded-xl font-semibold hover:bg-black transition-colors duration-300 font-montserrat shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Cargar Más Productos
                </button>
              </div>
            )}

            {/* Show count */}
            <div className="text-center mt-8 mb-8">
              <p className="text-gray-600 font-montserrat">
                Mostrando {products.length} de {allProducts.length} productos de {sportName}
              </p>
            </div>
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}