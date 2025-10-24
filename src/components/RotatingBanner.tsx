'use client';

import React, { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';

interface BannerImage {
  src: string;
  alt: string;
}

interface BannerSettings {
  banner1Url: string | null;
  banner2Url: string | null;
  banner3Url: string | null;
}

export default function RotatingBanner() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [bannerImages, setBannerImages] = useState<BannerImage[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch banner settings from admin API
  useEffect(() => {
    async function loadBanners() {
      try {
        const res = await fetch('/api/admin/theme/banners');
        if (res.ok) {
          const data: BannerSettings = await res.json();

          // Build array of banners that have URLs
          const banners: BannerImage[] = [];
          if (data.banner1Url) {
            banners.push({ src: data.banner1Url, alt: 'Banner 1' });
          }
          if (data.banner2Url) {
            banners.push({ src: data.banner2Url, alt: 'Banner 2' });
          }
          if (data.banner3Url) {
            banners.push({ src: data.banner3Url, alt: 'Banner 3' });
          }

          setBannerImages(banners);
        }
      } catch (error) {
        logger.error('Error loading banner settings:', toError(error));
      } finally {
        setLoading(false);
      }
    }

    loadBanners();
  }, []);

  useEffect(() => {
    if (bannerImages.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % bannerImages.length);
    }, 8000); // Change image every 8 seconds

    return () => clearInterval(interval);
  }, [bannerImages.length]);

  // Show loading state
  if (loading) {
    return (
      <div className="relative w-full bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-2">
        <div className="relative w-full h-52 md:h-56 lg:h-52 flex items-center justify-center bg-gray-900/30 rounded-lg">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-[#e21c21] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-gray-300">Cargando banners...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show placeholder if no banners are configured
  if (bannerImages.length === 0) {
    return (
      <div className="relative w-full group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-2">
        {/* Glass shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

        <div className="relative w-full h-52 md:h-56 lg:h-52 flex items-center justify-center bg-gray-900/30 rounded-lg">
          <div className="text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-2xl font-bold text-white">Uniformes de Calidad</h3>
            <p className="text-gray-300 mt-2">Diseños profesionales para tu equipo</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full group bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl p-2">
      {/* Glass shine effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none rounded-xl"></div>

      {/* Banner Images Container */}
      <div className="relative w-full h-52 md:h-56 lg:h-52 overflow-hidden rounded-lg">
        {/* Images */}
        {bannerImages.map((image, index) => (
          <div
            key={index}
            className={`absolute inset-0 transition-opacity duration-1000 ${
              index === currentIndex ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <img
              src={image.src}
              alt={image.alt}
              className="w-full h-full object-cover rounded-lg"
            />
          </div>
        ))}
      </div>
    </div>
  );
}
