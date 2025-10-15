'use client';

import React, { useState } from 'react';
import { logger } from '@/lib/logger';

interface ThemeSettings {
  logoMode: 'text' | 'logo';
  primaryLogoUrl: string | null;
  secondaryLogoUrl: string | null;
  banner1Url: string | null;
  banner2Url: string | null;
  banner3Url: string | null;
  // Sport icons
  futbolIconUrl: string | null;
  basquetbolIconUrl: string | null;
  voleibolIconUrl: string | null;
  rugbyIconUrl: string | null;
  hockeyIconUrl: string | null;
  tenisIconUrl: string | null;
  handballIconUrl: string | null;
  beisbolIconUrl: string | null;
}

export default function ThemeManagerClient() {
  const [settings, setSettings] = useState<ThemeSettings>({
    logoMode: 'text',
    primaryLogoUrl: null,
    secondaryLogoUrl: null,
    banner1Url: null,
    banner2Url: null,
    banner3Url: null,
    futbolIconUrl: null,
    basquetbolIconUrl: null,
    voleibolIconUrl: null,
    rugbyIconUrl: null,
    hockeyIconUrl: null,
    tenisIconUrl: null,
    handballIconUrl: null,
    beisbolIconUrl: null,
  });

  const [primaryLogoPreview, setPrimaryLogoPreview] = useState<string | null>(null);
  const [secondaryLogoPreview, setSecondaryLogoPreview] = useState<string | null>(null);
  const [banner1Preview, setBanner1Preview] = useState<string | null>(null);
  const [banner2Preview, setBanner2Preview] = useState<string | null>(null);
  const [banner3Preview, setBanner3Preview] = useState<string | null>(null);

  // Sport icon previews
  const [sportIconPreviews, setSportIconPreviews] = useState<Record<string, string | null>>({
    futbol: null,
    basquetbol: null,
    voleibol: null,
    rugby: null,
    hockey: null,
    tenis: null,
    handball: null,
    beisbol: null,
  });

  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>('');

  // Track sport icons state
  const [sportIconsModified, setSportIconsModified] = useState(false);
  const [sportIconsSaved, setSportIconsSaved] = useState(false);

  // Load existing settings on mount
  React.useEffect(() => {
    async function loadSettings() {
      try {
        // Load logo settings
        const logoRes = await fetch('/api/admin/theme/logo');
        if (logoRes.ok) {
          const logoData = await logoRes.json();
          logger.info('Loaded logo settings:', logoData);
          if (logoData.mode || logoData.primaryLogoUrl || logoData.secondaryLogoUrl) {
            setSettings(prev => ({
              ...prev,
              logoMode: logoData.mode || 'text',
              primaryLogoUrl: logoData.primaryLogoUrl || null,
              secondaryLogoUrl: logoData.secondaryLogoUrl || null,
            }));
            if (logoData.primaryLogoUrl) setPrimaryLogoPreview(logoData.primaryLogoUrl);
            if (logoData.secondaryLogoUrl) setSecondaryLogoPreview(logoData.secondaryLogoUrl);
          }
        }

        // Load banner settings
        const bannerRes = await fetch('/api/admin/theme/banners');
        if (bannerRes.ok) {
          const bannerData = await bannerRes.json();
          logger.info('Loaded banner settings:', bannerData);
          if (bannerData.banner1Url || bannerData.banner2Url || bannerData.banner3Url) {
            setSettings(prev => ({
              ...prev,
              banner1Url: bannerData.banner1Url || null,
              banner2Url: bannerData.banner2Url || null,
              banner3Url: bannerData.banner3Url || null,
            }));
            if (bannerData.banner1Url) setBanner1Preview(bannerData.banner1Url);
            if (bannerData.banner2Url) setBanner2Preview(bannerData.banner2Url);
            if (bannerData.banner3Url) setBanner3Preview(bannerData.banner3Url);
          }
        }

        // Load sport icon settings
        const sportIconsRes = await fetch('/api/admin/theme/sport-icons');
        if (sportIconsRes.ok) {
          const sportIconsData = await sportIconsRes.json();
          logger.info('Loaded sport icon settings:', sportIconsData);
          setSettings(prev => ({
            ...prev,
            futbolIconUrl: sportIconsData.futbolIconUrl || null,
            basquetbolIconUrl: sportIconsData.basquetbolIconUrl || null,
            voleibolIconUrl: sportIconsData.voleibolIconUrl || null,
            rugbyIconUrl: sportIconsData.rugbyIconUrl || null,
            hockeyIconUrl: sportIconsData.hockeyIconUrl || null,
            tenisIconUrl: sportIconsData.tenisIconUrl || null,
            handballIconUrl: sportIconsData.handballIconUrl || null,
            beisbolIconUrl: sportIconsData.beisbolIconUrl || null,
          }));
          // Set previews
          if (sportIconsData.futbolIconUrl) setSportIconPreviews(prev => ({ ...prev, futbol: sportIconsData.futbolIconUrl }));
          if (sportIconsData.basquetbolIconUrl) setSportIconPreviews(prev => ({ ...prev, basquetbol: sportIconsData.basquetbolIconUrl }));
          if (sportIconsData.voleibolIconUrl) setSportIconPreviews(prev => ({ ...prev, voleibol: sportIconsData.voleibolIconUrl }));
          if (sportIconsData.rugbyIconUrl) setSportIconPreviews(prev => ({ ...prev, rugby: sportIconsData.rugbyIconUrl }));
          if (sportIconsData.hockeyIconUrl) setSportIconPreviews(prev => ({ ...prev, hockey: sportIconsData.hockeyIconUrl }));
          if (sportIconsData.tenisIconUrl) setSportIconPreviews(prev => ({ ...prev, tenis: sportIconsData.tenisIconUrl }));
          if (sportIconsData.handballIconUrl) setSportIconPreviews(prev => ({ ...prev, handball: sportIconsData.handballIconUrl }));
          if (sportIconsData.beisbolIconUrl) setSportIconPreviews(prev => ({ ...prev, beisbol: sportIconsData.beisbolIconUrl }));
        }
      } catch (error) {
        logger.error('Error loading settings:', error);
      }
    }

    loadSettings();
  }, []);

  // Handle file selection and preview
  const handleFileSelect = async (
    file: File,
    type: 'primaryLogo' | 'secondaryLogo' | 'banner1' | 'banner2' | 'banner3' | string
  ) => {
    if (!file) return;

    console.log(`Starting upload for ${type}, file:`, file.name, file.size, file.type);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      const preview = reader.result as string;
      console.log(`Preview created for ${type}`);

      // Check if it's a sport icon
      if (type.endsWith('Icon')) {
        const sportKey = type.replace('Icon', '');
        setSportIconPreviews(prev => ({ ...prev, [sportKey]: preview }));
        setSportIconsModified(true);
        setSportIconsSaved(false);
      } else {
        switch (type) {
          case 'primaryLogo':
            setPrimaryLogoPreview(preview);
            break;
          case 'secondaryLogo':
            setSecondaryLogoPreview(preview);
            break;
          case 'banner1':
            setBanner1Preview(preview);
            break;
          case 'banner2':
            setBanner2Preview(preview);
            break;
          case 'banner3':
            setBanner3Preview(preview);
            break;
        }
      }
    };
    reader.readAsDataURL(file);

    // Upload file
    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      console.log(`Uploading ${type} to /api/admin/theme/upload...`);

      const response = await fetch('/api/admin/theme/upload', {
        method: 'POST',
        body: formData,
      });

      console.log(`Upload response status: ${response.status}`);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Upload failed: ${errorText}`);
        throw new Error(`Upload failed: ${errorText}`);
      }

      const data = await response.json();
      console.log(`Upload successful, URL: ${data.url}`);

      // Update settings with new URL
      const urlKey = `${type}Url` as keyof ThemeSettings;
      setSettings(prev => ({
        ...prev,
        [urlKey]: data.url,
      }));

      logger.info(`${type} uploaded successfully to ${data.url}`);
      setStatusMessage(`${type} uploaded successfully! Click "Save" to persist changes.`);
      setTimeout(() => setStatusMessage(''), 5000); // Clear after 5 seconds
    } catch (error: any) {
      console.error(`Error uploading ${type}:`, error);
      logger.error(`Error uploading ${type}:`, error);
      setStatusMessage(`Error uploading file: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setUploading(false);
    }
  };

  const handleSaveLogo = async () => {
    try {
      setSaving(true);
      console.log('Saving logo settings:', {
        logoMode: settings.logoMode,
        primaryLogoUrl: settings.primaryLogoUrl,
        secondaryLogoUrl: settings.secondaryLogoUrl,
      });

      const response = await fetch('/api/admin/theme/logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logoMode: settings.logoMode,
          primaryLogoUrl: settings.primaryLogoUrl,
          secondaryLogoUrl: settings.secondaryLogoUrl,
        }),
      });

      console.log('Save logo response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save logo failed:', errorText);
        throw new Error(`Save failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Logo settings saved successfully:', result);
      setStatusMessage('Logo settings saved successfully!');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error: any) {
      console.error('Error saving logo settings:', error);
      logger.error('Error saving logo settings:', error);
      setStatusMessage(`Error saving settings: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveBanners = async () => {
    try {
      setSaving(true);
      console.log('Saving banner settings:', {
        banner1Url: settings.banner1Url,
        banner2Url: settings.banner2Url,
        banner3Url: settings.banner3Url,
      });

      const response = await fetch('/api/admin/theme/banners', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          banner1Url: settings.banner1Url,
          banner2Url: settings.banner2Url,
          banner3Url: settings.banner3Url,
        }),
      });

      console.log('Save banners response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save banners failed:', errorText);
        throw new Error(`Save failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Banner settings saved successfully:', result);
      setStatusMessage('Banner images saved successfully!');
      setTimeout(() => setStatusMessage(''), 5000);
    } catch (error: any) {
      console.error('Error saving banner settings:', error);
      logger.error('Error saving banner settings:', error);
      setStatusMessage(`Error saving banners: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSportIcons = async () => {
    try {
      setSaving(true);
      console.log('Saving sport icon settings:', {
        futbolIconUrl: settings.futbolIconUrl,
        basquetbolIconUrl: settings.basquetbolIconUrl,
        voleibolIconUrl: settings.voleibolIconUrl,
        rugbyIconUrl: settings.rugbyIconUrl,
        hockeyIconUrl: settings.hockeyIconUrl,
        tenisIconUrl: settings.tenisIconUrl,
        handballIconUrl: settings.handballIconUrl,
        beisbolIconUrl: settings.beisbolIconUrl,
      });

      const response = await fetch('/api/admin/theme/sport-icons', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          futbolIconUrl: settings.futbolIconUrl,
          basquetbolIconUrl: settings.basquetbolIconUrl,
          voleibolIconUrl: settings.voleibolIconUrl,
          rugbyIconUrl: settings.rugbyIconUrl,
          hockeyIconUrl: settings.hockeyIconUrl,
          tenisIconUrl: settings.tenisIconUrl,
          handballIconUrl: settings.handballIconUrl,
          beisbolIconUrl: settings.beisbolIconUrl,
        }),
      });

      console.log('Save sport icons response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Save sport icons failed:', errorText);
        throw new Error(`Save failed: ${errorText}`);
      }

      const result = await response.json();
      console.log('Sport icon settings saved successfully:', result);
      setSportIconsSaved(true);
      setSportIconsModified(false);
      setStatusMessage('Sport icons saved successfully!');
      setTimeout(() => setStatusMessage(''), 3000);
    } catch (error: any) {
      console.error('Error saving sport icons:', error);
      logger.error('Error saving sport icons:', error);
      setStatusMessage(`Error saving sport icons: ${error.message}`);
      setTimeout(() => setStatusMessage(''), 5000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      {/* Status Message */}
      {statusMessage && (
        <div className={`mb-4 p-4 rounded-lg text-white text-sm font-medium shadow-lg flex items-center gap-2 ${
          statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('failed')
            ? 'bg-red-500/20 border border-red-500/50'
            : statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('saved')
            ? 'bg-green-500/20 border border-green-500/50'
            : 'bg-blue-500/20 border border-blue-500/50'
        }`}>
          {statusMessage.toLowerCase().includes('error') || statusMessage.toLowerCase().includes('failed') ? (
            <svg className="w-5 h-5 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : statusMessage.toLowerCase().includes('success') || statusMessage.toLowerCase().includes('saved') ? (
            <svg className="w-5 h-5 text-green-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Uploading Indicator */}
      {uploading && (
        <div className="mb-4 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg text-white text-sm flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin"></div>
          Uploading file...
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 md:gap-6">
        {/* Header Logo Section */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white">Header Logo</h2>
          </div>

          {/* Current Display */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 mb-2">Current</label>
            <div className="relative bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 border border-gray-700 rounded-lg p-3 flex items-center justify-center h-16">
              {settings.logoMode === 'text' ? (
                <div className="text-lg font-black text-white tracking-wider">DESERVE</div>
              ) : primaryLogoPreview ? (
                <img src={primaryLogoPreview} alt="Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="text-lg font-black text-white tracking-wider">DESERVE</div>
              )}
            </div>
          </div>

          {/* Primary Logo Upload */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 mb-2">Primary Logo (PNG/SVG)</label>
            <label className="relative border-2 border-dashed border-gray-700 rounded-lg p-3 text-center hover:border-[#e21c21]/50 transition-all cursor-pointer h-16 flex items-center justify-center">
              {primaryLogoPreview ? (
                <img src={primaryLogoPreview} alt="Primary Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs text-gray-500">Upload</span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".png,.svg,image/png,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'primaryLogo');
                }}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Secondary Logo Upload */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-400 mb-2">Secondary Logo (PNG/SVG)</label>
            <label className="relative border-2 border-dashed border-gray-700 rounded-lg p-3 text-center hover:border-[#e21c21]/50 transition-all cursor-pointer h-16 flex items-center justify-center">
              {secondaryLogoPreview ? (
                <img src={secondaryLogoPreview} alt="Secondary Logo" className="max-h-full max-w-full object-contain" />
              ) : (
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="text-xs text-gray-500">Upload</span>
                </div>
              )}
              <input
                type="file"
                className="hidden"
                accept=".png,.svg,image/png,image/svg+xml"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileSelect(file, 'secondaryLogo');
                }}
                disabled={uploading}
              />
            </label>
          </div>

          {/* Logo Mode Toggle */}
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => setSettings(prev => ({ ...prev, logoMode: 'text' }))}
              className={`relative backdrop-blur-md py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                settings.logoMode === 'text'
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                  : 'bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-400 border border-gray-700 hover:border-[#e21c21]/50'
              }`}
            >
              Text
            </button>
            <button
              onClick={() => setSettings(prev => ({ ...prev, logoMode: 'logo' }))}
              className={`relative backdrop-blur-md py-1.5 sm:py-2 px-3 sm:px-4 rounded-lg text-xs sm:text-sm font-semibold transition-all ${
                settings.logoMode === 'logo'
                  ? 'bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 text-white shadow-lg shadow-[#e21c21]/30 border border-[#e21c21]/50'
                  : 'bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 text-gray-400 border border-gray-700 hover:border-[#e21c21]/50'
              }`}
            >
              Logo
            </button>
          </div>

          {/* Save Button - Moved to Bottom */}
          <button
            onClick={handleSaveLogo}
            disabled={saving || uploading}
            className="relative bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 backdrop-blur-md text-white py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 border border-green-600/50 disabled:opacity-50 disabled:cursor-not-allowed w-full"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Homepage Banner Section */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="p-6 relative">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white">Banner Images</h2>
          </div>

          {/* Banner Image Slots */}
          <div className="space-y-3">
            {/* Banner 1 */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Banner 1</label>
              <label className="relative border-2 border-dashed border-gray-700 rounded-lg overflow-hidden h-16 hover:border-[#e21c21]/50 transition-all cursor-pointer block">
                {banner1Preview ? (
                  <img src={banner1Preview} alt="Banner 1" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-gray-500">Upload</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'banner1');
                  }}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Banner 2 */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Banner 2</label>
              <label className="relative border-2 border-dashed border-gray-700 rounded-lg overflow-hidden h-16 hover:border-[#e21c21]/50 transition-all cursor-pointer block">
                {banner2Preview ? (
                  <img src={banner2Preview} alt="Banner 2" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-gray-500">Upload</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'banner2');
                  }}
                  disabled={uploading}
                />
              </label>
            </div>

            {/* Banner 3 */}
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-2">Banner 3</label>
              <label className="relative border-2 border-dashed border-gray-700 rounded-lg overflow-hidden h-16 hover:border-[#e21c21]/50 transition-all cursor-pointer block">
                {banner3Preview ? (
                  <img src={banner3Preview} alt="Banner 3" className="w-full h-full object-cover" />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900/90 via-black/80 to-gray-800/90 flex items-center justify-center gap-2">
                    <svg className="w-4 h-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-xs text-gray-500">Upload</p>
                  </div>
                )}
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file, 'banner3');
                  }}
                  disabled={uploading}
                />
              </label>
            </div>
          </div>

          {/* Save Button - Moved to Bottom */}
          <button
            onClick={handleSaveBanners}
            disabled={saving || uploading}
            className="relative bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 backdrop-blur-md text-white py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg shadow-green-600/30 hover:shadow-green-600/50 border border-green-600/50 disabled:opacity-50 disabled:cursor-not-allowed w-full mt-3"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>

      {/* Sport Icons Section - Full Width */}
      <div className="col-span-2 relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg shadow-2xl overflow-hidden group mt-6">
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>

        <div className="p-6 relative">
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[#e21c21]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10l-2 1m0 0l-2-1m2 1v2.5M20 7l-2 1m2-1l-2-1m2 1v2.5M14 4l-2-1-2 1M4 7l2-1M4 7l2 1M4 7v2.5M12 21l-2-1m2 1l2-1m-2 1v-2.5M6 18l-2-1v-2.5M18 18l2-1v-2.5" />
            </svg>
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-white">Sport Icons</h2>
            <p className="text-[10px] sm:text-xs text-gray-500">Homepage sport selection grid</p>
          </div>

          {/* Sport Icons Grid */}
          <div className="grid grid-cols-4 gap-4">
            {[
              { key: 'futbol', label: 'Fútbol' },
              { key: 'basquetbol', label: 'Basquetbol' },
              { key: 'voleibol', label: 'Voleibol' },
              { key: 'rugby', label: 'Rugby' },
              { key: 'hockey', label: 'Hockey' },
              { key: 'tenis', label: 'Tenis' },
              { key: 'handball', label: 'Handball' },
              { key: 'beisbol', label: 'Béisbol' },
            ].map(({ key, label }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-gray-400 mb-2">{label}</label>
                <label className="relative border-2 border-dashed border-gray-700 rounded-lg p-3 text-center hover:border-[#e21c21]/50 transition-all cursor-pointer h-24 flex items-center justify-center bg-gradient-to-br from-gray-900/50 to-gray-800/50">
                  {sportIconPreviews[key] ? (
                    <img src={sportIconPreviews[key]!} alt={label} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <svg className="w-6 h-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      <span className="text-xs text-gray-500">Upload</span>
                    </div>
                  )}
                  <input
                    type="file"
                    className="hidden"
                    accept=".png,.svg,.jpg,.jpeg,image/png,image/svg+xml,image/jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileSelect(file, `${key}Icon`);
                    }}
                    disabled={uploading}
                  />
                </label>
              </div>
            ))}
          </div>

          <p className="text-[10px] sm:text-xs text-gray-500 mt-4">
            💡 Tip: Upload square images (PNG/SVG/JPG) for best results. Icons will be displayed in the homepage sport selection grid.
          </p>

          {/* Save Button - Moved to Bottom */}
          <button
            onClick={handleSaveSportIcons}
            disabled={saving || uploading || !sportIconsModified}
            className={`relative backdrop-blur-md text-white py-1.5 sm:py-2 px-4 sm:px-6 rounded-lg text-xs sm:text-sm font-semibold transition-all shadow-lg border disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 w-full mt-4 ${
              sportIconsSaved && !sportIconsModified
                ? 'bg-gradient-to-br from-gray-600/90 via-gray-700/80 to-gray-800/90 shadow-gray-600/30 border-gray-600/50'
                : 'bg-gradient-to-br from-green-600/90 via-green-700/80 to-green-800/90 shadow-green-600/30 hover:shadow-green-600/50 border-green-600/50'
            }`}
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">Saving</span>
              </>
            ) : sportIconsSaved && !sportIconsModified ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Saved
              </>
            ) : (
              <>
                <span className="hidden sm:inline">Save All Icons</span>
                <span className="sm:hidden">Save Icons</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
