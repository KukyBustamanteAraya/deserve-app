'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ColorPicker } from '@/components/ColorPicker';
import { ApparelGrid } from '@/components/ApparelGrid';
import { useBuilderState } from '@/hooks/useBuilderState';
import type { ProductDetail, ProductListItem } from '@/types/catalog';
import type { ApparelKey } from '@/hooks/useBuilderState';

interface ProductDetailClientSimplifiedProps {
  product: ProductDetail;
  relatedProducts: ProductListItem[];
}

export function ProductDetailClientSimplified({ product }: ProductDetailClientSimplifiedProps) {
  const router = useRouter();
  const { teamColors, setTeamColors, selectedApparel, toggleApparel, setDesign } = useBuilderState();

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [imageErrors, setImageErrors] = useState(new Set<string>());

  // Apply CSS variables when colors change
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', teamColors.primary);
    document.documentElement.style.setProperty('--brand-secondary', teamColors.secondary);
    document.documentElement.style.setProperty('--brand-accent', teamColors.accent);
  }, [teamColors]);

  // Prevent ALL scrolling on the image area - use native event listeners with passive: false
  useEffect(() => {
    const imageContainer = document.getElementById('product-image-container');
    if (!imageContainer) return;

    const preventScroll = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
      return false;
    };

    // Add all scroll-preventing event listeners with passive: false
    imageContainer.addEventListener('wheel', preventScroll, { passive: false });
    imageContainer.addEventListener('touchstart', preventScroll, { passive: false });
    imageContainer.addEventListener('touchmove', preventScroll, { passive: false });
    imageContainer.addEventListener('scroll', preventScroll, { passive: false });

    return () => {
      imageContainer.removeEventListener('wheel', preventScroll);
      imageContainer.removeEventListener('touchstart', preventScroll);
      imageContainer.removeEventListener('touchmove', preventScroll);
      imageContainer.removeEventListener('scroll', preventScroll);
    };
  }, []);

  const handleImageError = (imageId: string) => {
    setImageErrors(prev => new Set([...prev, imageId]));
  };

  const handleContinue = () => {
    // Save design to state
    setDesign({
      slug: product.slug,
      name: product.name,
      sport: product.sport_slug || '',
      images: product.images?.map(img => img.url) || []
    });

    // Navigate to customization builder
    router.push('/personaliza');
  };

  const images = product.images && product.images.length > 0 ? product.images : [];
  const selectedImage = images[selectedImageIndex];

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Mobile: Fixed Image Gallery */}
      <div
        id="product-image-container"
        className="lg:hidden fixed top-[5.5rem] left-0 right-0 z-20 bg-gray-50 px-4 sm:px-6"
        style={{ touchAction: 'none', overscrollBehavior: 'none' }}
      >
        {/* Main Image */}
        <div
          className="aspect-square relative bg-white rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg max-h-[50vh]"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div
            className="absolute top-0 left-0 right-0 h-[3px] scale-x-100 z-10"
            style={{
              background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.accent})`
            }}
          ></div>

          {selectedImage && !imageErrors.has(String(selectedImageIndex)) ? (
            <Image
              src={selectedImage.url}
              alt={selectedImage.alt || product.name}
              fill
              className="object-cover"
              priority
              onError={() => handleImageError(String(selectedImageIndex))}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">
              <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>

        {/* Thumbnail Strip */}
        {images.length > 1 && (
          <div className="grid grid-cols-4 gap-2 mt-1">
            {images.map((img, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedImageIndex(idx)}
                className={`aspect-square relative bg-white rounded-lg overflow-hidden border-2 transition-all ${
                  idx === selectedImageIndex
                    ? 'border-[#e21c21] ring-2 ring-red-200 shadow-md'
                    : 'border-gray-200 hover:border-[#e21c21] hover:shadow-md'
                }`}
                style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
              >
                {idx === selectedImageIndex && (
                  <div
                    className="absolute top-0 left-0 right-0 h-[2px] z-10"
                    style={{
                      background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.accent})`
                    }}
                  ></div>
                )}

                {!imageErrors.has(String(idx)) ? (
                  <Image
                    src={img.url}
                    alt={img.alt || `${product.name} ${idx + 1}`}
                    fill
                    className="object-cover"
                    onError={() => handleImageError(String(idx))}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-300">
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 lg:items-start">
          {/* Desktop: Sticky Image Gallery */}
          <div className="hidden lg:block sticky top-24 space-y-4" style={{ maxHeight: 'calc(100vh - 8rem)' }}>
            <div
              className="aspect-square relative bg-white rounded-xl overflow-hidden border-2 border-gray-200 shadow-lg w-full max-w-md mx-auto"
              style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px] scale-x-100 z-10"
                style={{
                  background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.accent})`
                }}
              ></div>

              {selectedImage && !imageErrors.has(String(selectedImageIndex)) ? (
                <Image
                  src={selectedImage.url}
                  alt={selectedImage.alt || product.name}
                  fill
                  className="object-cover"
                  priority
                  onError={() => handleImageError(String(selectedImageIndex))}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <svg className="w-24 h-24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
              )}
            </div>

            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-3 w-full max-w-md mx-auto">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImageIndex(idx)}
                    className={`aspect-square relative bg-white rounded-lg overflow-hidden border-2 transition-all ${
                      idx === selectedImageIndex
                        ? 'border-[#e21c21] ring-2 ring-red-200 shadow-md'
                        : 'border-gray-200 hover:border-[#e21c21] hover:shadow-md'
                    }`}
                    style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    {idx === selectedImageIndex && (
                      <div
                        className="absolute top-0 left-0 right-0 h-[2px] z-10"
                        style={{
                          background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.accent})`
                        }}
                      ></div>
                    )}

                    {!imageErrors.has(String(idx)) ? (
                      <Image
                        src={img.url}
                        alt={img.alt || `${product.name} ${idx + 1}`}
                        fill
                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                        onError={() => handleImageError(String(idx))}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Configuration Panel - Scrollable content */}
          <div className="space-y-4 sm:space-y-6 relative z-10 pt-[46vh] lg:pt-0">
            {/* Color Pickers - Compact Modern Design */}
            <div
              className="relative bg-white p-4 rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden"
              style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.secondary})`
                }}
              ></div>
              <h2 className="text-base font-black text-gray-900 mb-3 uppercase">¿Cuáles son los colores de tu equipo?</h2>

              <div className="grid grid-cols-3 gap-3">
                <ColorPicker
                  id="color-primary"
                  label="Primario"
                  value={teamColors.primary}
                  onChange={(color) => setTeamColors({ primary: color })}
                />

                <ColorPicker
                  id="color-secondary"
                  label="Secundario"
                  value={teamColors.secondary}
                  onChange={(color) => setTeamColors({ secondary: color })}
                />

                <ColorPicker
                  id="color-accent"
                  label="Acento"
                  value={teamColors.accent}
                  onChange={(color) => setTeamColors({ accent: color })}
                />
              </div>
            </div>

            {/* Apparel Selection */}
            <div
              className="relative bg-white p-6 rounded-xl border-2 border-gray-200 shadow-lg overflow-hidden"
              style={{ transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
            >
              <div
                className="absolute top-0 left-0 right-0 h-[3px]"
                style={{
                  background: `linear-gradient(90deg, ${teamColors.primary}, ${teamColors.accent})`
                }}
              ></div>
              <h2 className="text-base font-black text-gray-900 mb-6 uppercase tracking-wide">¿Qué artículos necesitas?</h2>
              <ApparelGrid
                selectedApparel={selectedApparel}
                onToggle={(key: ApparelKey) => toggleApparel(key)}
                teamColors={teamColors}
              />
            </div>

            {/* CTA Button - Uses color variables for gradient */}
            <button
              onClick={handleContinue}
              className="group relative w-full py-4 px-6 rounded-xl font-black text-white text-lg shadow-lg hover:shadow-2xl transform hover:-translate-y-1 overflow-hidden border-2 border-transparent"
              style={{
                background: `linear-gradient(135deg, var(--brand-primary), var(--brand-accent))`,
                transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
              }}
            >
              {/* Shine effect */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
              </div>
              <span className="relative">Continuar a Personalizar →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
