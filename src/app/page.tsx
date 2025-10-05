'use client';
import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/app/components/AuthProvider';
import type { ProductListItem } from '@/types/catalog';

interface Sport {
  id: string;
  slug: string;
  name: string;
}

export default function Home() {
  const [selectedSport, setSelectedSport] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState(new Set<string>());
  const [sports, setSports] = useState<Sport[]>([]);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { user } = useAuth();

  // Fetch sports on mount
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchSports() {
      try {
        const res = await fetch('/api/catalog/sports');
        if (!res.ok) throw new Error('Failed to fetch sports');
        const data = await res.json();
        setSports(data.sports || []);
      } catch (err: any) {
        console.error('Error fetching sports:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchSports();
  }, [user]);

  // Fetch products when sport changes
  useEffect(() => {
    if (!user || !selectedSport) {
      setProducts([]);
      return;
    }

    async function fetchProducts() {
      try {
        const qs = new URLSearchParams();
        if (selectedSport) qs.set('sport', selectedSport);
        qs.set('limit', '8');

        const res = await fetch(`/api/catalog/products?${qs.toString()}`);
        if (!res.ok) throw new Error('Failed to fetch products');

        const data = await res.json();
        setProducts(data.items || []);
      } catch (err: any) {
        console.error('Error fetching products:', err);
        setError(err.message);
      }
    }

    fetchProducts();
  }, [user, selectedSport]);

  const handleImageError = (productId: string | number) => {
    setImageErrors(prev => new Set([...prev, String(productId)]));
  };

  // Map sports to display with icons
  const getSportIcon = (slug: string) => {
    const iconMap: Record<string, string> = {
      'soccer': '⚽',
      'basketball': '🏀',
      'volleyball': '🏐',
      'rugby': '🏉',
      'golf': '⛳'
    };
    return iconMap[slug] || '🏆';
  };

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-4">Cargando productos...</div>
          <div className="w-16 h-16 border-4 border-red-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-white">
      <div className="flex items-start justify-center pt-16">
        <div className="text-center max-w-6xl mx-auto px-4 w-full">
          <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-black mb-6 sm:mb-8 leading-tight font-montserrat">
            <span className="text-[#e21c21]">
              UNIFORMES
            </span>
            <br />
            <span className="text-black">PROFESIONALES</span>
          </h1>

          <p className="text-base sm:text-lg md:text-xl text-gray-700 leading-relaxed mb-12 font-montserrat">
            Diseños únicos, telas premium y entregas puntuales.
          </p>

          {/* Sports Selection Grid */}
          {user && sports.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-16">
              {sports.map((sport) => (
                <button
                  key={sport.id}
                  onClick={() => setSelectedSport(selectedSport === sport.slug ? null : sport.slug)}
                  className={`group relative bg-white border-2 rounded-xl p-6 hover:border-red-500 hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 ${
                    selectedSport === sport.slug ? 'border-red-500 shadow-lg' : 'border-gray-200'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-4xl mb-3 group-hover:scale-110 transition-transform duration-300">
                      {getSportIcon(sport.slug)}
                    </div>
                    <h3 className={`text-lg font-semibold transition-colors duration-300 ${
                      selectedSport === sport.slug ? 'text-red-600' : 'text-gray-800 group-hover:text-red-600'
                    }`}>
                      {sport.name.toUpperCase()}
                    </h3>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Login prompt for unauthenticated users */}
          {!user && (
            <div className="text-center py-8">
              <p className="text-gray-600 mb-4">
                Inicia sesión para ver nuestro catálogo de productos deportivos
              </p>
              <a
                href="/login"
                className="inline-block bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors duration-300"
              >
                Iniciar Sesión
              </a>
            </div>
          )}

          {/* Products Grid - Shows when sport is selected */}
          {selectedSport && user && (
            <div className="w-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-xl md:text-2xl font-black text-black font-montserrat">
                  <span className="text-[#e21c21]">PRODUCTOS DE</span>{' '}
                  <span className="text-black">
                    {sports.find(s => s.slug === selectedSport)?.name.toUpperCase() || selectedSport.toUpperCase()}
                  </span>
                </h2>
                <button
                  onClick={() => setSelectedSport(null)}
                  className="text-gray-600 hover:text-[#e21c21] transition-colors duration-300 font-montserrat text-sm"
                >
                  ✕ Cerrar
                </button>
              </div>

              {products.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {products.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 overflow-hidden">
                      {/* Product Image */}
                      <div className="aspect-square relative bg-gray-100">
                        {product.thumbnail_url && !imageErrors.has(String(product.id)) ? (
                          <Image
                            src={product.thumbnail_url}
                            alt={product.thumbnail_alt || product.name}
                            fill
                            className="object-cover"
                            onError={() => handleImageError(product.id)}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <span className="text-6xl">📦</span>
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{product.name}</h3>
                        <div className="flex items-center justify-between">
                          <span className="text-2xl font-bold text-red-600">
                            ${((product.price_cents || 0) / 100).toFixed(2)}
                          </span>
                          <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors duration-300 text-sm">
                            Ver Detalles
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">
                    No hay productos disponibles para este deporte en este momento.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}