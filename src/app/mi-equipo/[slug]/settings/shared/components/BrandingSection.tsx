'use client';

import { HexColorPicker } from 'react-colorful';
import type { TeamSettings } from '@/types/team-settings';

interface BrandingSectionProps {
  settings: TeamSettings;
  language?: 'en' | 'es';
  showBanner?: boolean;
  showTips?: boolean;
  uploadingLogo: boolean;
  uploadingBanner?: boolean;
  showPrimaryPicker: boolean;
  showSecondaryPicker: boolean;
  showTertiaryPicker: boolean;
  setShowPrimaryPicker: (show: boolean) => void;
  setShowSecondaryPicker: (show: boolean) => void;
  setShowTertiaryPicker: (show: boolean) => void;
  onSettingsChange: (updates: Partial<TeamSettings>) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onBannerUpload?: (event: React.ChangeEvent<HTMLInputElement>) => void;
}

export function BrandingSection({
  settings,
  language = 'en',
  showBanner = false,
  showTips = false,
  uploadingLogo,
  uploadingBanner = false,
  showPrimaryPicker,
  showSecondaryPicker,
  showTertiaryPicker,
  setShowPrimaryPicker,
  setShowSecondaryPicker,
  setShowTertiaryPicker,
  onSettingsChange,
  onLogoUpload,
  onBannerUpload,
}: BrandingSectionProps) {
  const text = {
    en: {
      title: '🎨 Team Branding',
      description: 'Customize your team\'s colors, logo, and banner to match your brand',
      colorsHeading: 'Team Colors',
      primaryColor: 'Primary Color',
      secondaryColor: 'Secondary Color',
      tertiaryColor: 'Tertiary Color',
      done: 'Done',
      colorInfo: 'These colors will be used throughout your team dashboard, buttons, and UI elements',
      logoHeading: 'Team Logo',
      uploading: 'Uploading...',
      changeLogo: 'Change Logo',
      uploadLogo: 'Upload Logo',
      logoInfo: 'Recommended: Square image, at least 200x200px, max 2MB. PNG or JPG format.',
      removeLogo: 'Remove Logo',
      bannerHeading: 'Team Banner',
      changeBanner: 'Change Banner',
      uploadBanner: 'Upload Banner',
      bannerInfo: 'Recommended: Wide image (16:9 ratio), at least 1200x675px, max 5MB. PNG or JPG format.',
      removeBanner: 'Remove Banner',
      noBanner: 'No banner uploaded',
      bannerFallback: 'A default banner will be generated using your team colors',
      tipsHeading: '💡 Branding Tips:',
      tip1: '• Your team colors will automatically apply to buttons, dividers, and accents across your dashboard',
      tip2: '• If you don\'t upload a banner, a beautiful gradient banner will be generated using your team colors',
      tip3: '• The logo appears in your team header and can be used in design requests',
      tip4: '• Click "Save Settings" below to apply your branding changes',
    },
    es: {
      title: '🎨 Marca Institucional',
      description: 'Colores y logo de la institución',
      colorsHeading: 'Colores Institucionales',
      primaryColor: 'Color Primario',
      secondaryColor: 'Color Secundario',
      tertiaryColor: 'Color Terciario',
      done: 'Listo',
      colorInfo: '',
      logoHeading: 'Logo Institucional',
      uploading: 'Subiendo...',
      changeLogo: 'Cambiar Logo',
      uploadLogo: 'Subir Logo',
      logoInfo: 'Recomendado: Imagen cuadrada, mínimo 200x200px, máx 2MB. Formato PNG o JPG.',
      removeLogo: 'Eliminar Logo',
      bannerHeading: 'Banner Institucional',
      changeBanner: 'Cambiar Banner',
      uploadBanner: 'Subir Banner',
      bannerInfo: 'Recomendado: Imagen amplia (proporción 16:9), mínimo 1200x675px, máx 5MB. Formato PNG o JPG.',
      removeBanner: 'Eliminar Banner',
      noBanner: 'Sin banner subido',
      bannerFallback: 'Se generará un banner predeterminado usando los colores del equipo',
      tipsHeading: '💡 Consejos de Marca:',
      tip1: '• Los colores del equipo se aplicarán automáticamente a botones, divisores y acentos en tu panel',
      tip2: '• Si no subes un banner, se generará un hermoso banner degradado usando los colores del equipo',
      tip3: '• El logo aparece en el encabezado del equipo y se puede usar en solicitudes de diseño',
      tip4: '• Haz clic en "Guardar Configuración" a continuación para aplicar los cambios de marca',
    },
  };

  const t = text[language];

  return (
    <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md rounded-lg shadow-2xl p-6 border border-gray-700 overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
      <h2 className="text-xl font-semibold text-white mb-4 relative">{t.title}</h2>
      <p className="text-gray-300 text-sm mb-6 relative">{t.description}</p>

      <div className="space-y-6 relative">
        {/* Colors */}
        <div>
          <h3 className="font-medium text-white mb-4">{t.colorsHeading}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Primary Color */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">{t.primaryColor}</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowPrimaryPicker(!showPrimaryPicker)}
                  className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                  style={{ backgroundColor: settings.primary_color || '#e21c21' }}
                >
                  <span className="text-white font-medium drop-shadow-md">{settings.primary_color || '#e21c21'}</span>
                </button>
                {showPrimaryPicker && (
                  <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                    <HexColorPicker
                      color={settings.primary_color || '#e21c21'}
                      onChange={(color) => onSettingsChange({ primary_color: color })}
                    />
                    <button
                      onClick={() => setShowPrimaryPicker(false)}
                      className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                    >
                      {t.done}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Secondary Color */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">{t.secondaryColor}</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowSecondaryPicker(!showSecondaryPicker)}
                  className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                  style={{ backgroundColor: settings.secondary_color || '#ffffff' }}
                >
                  <span className={`font-medium drop-shadow-md ${settings.secondary_color === '#ffffff' || !settings.secondary_color ? 'text-gray-800' : 'text-white'}`}>
                    {settings.secondary_color || '#ffffff'}
                  </span>
                </button>
                {showSecondaryPicker && (
                  <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                    <HexColorPicker
                      color={settings.secondary_color || '#ffffff'}
                      onChange={(color) => onSettingsChange({ secondary_color: color })}
                    />
                    <button
                      onClick={() => setShowSecondaryPicker(false)}
                      className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                    >
                      {t.done}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Tertiary Color */}
            <div>
              <label className="block text-sm font-medium text-white mb-2">{t.tertiaryColor}</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTertiaryPicker(!showTertiaryPicker)}
                  className="w-full h-12 rounded-lg border-2 border-gray-700 hover:border-red-500/50 transition-colors flex items-center justify-between px-3 shadow-lg"
                  style={{ backgroundColor: settings.tertiary_color || '#0b0b0c' }}
                >
                  <span className="text-white font-medium drop-shadow-md">{settings.tertiary_color || '#0b0b0c'}</span>
                </button>
                {showTertiaryPicker && (
                  <div className="absolute z-10 mt-2 p-3 bg-gradient-to-br from-gray-800/95 via-black/90 to-gray-900/95 backdrop-blur-md rounded-lg shadow-xl border border-gray-700">
                    <HexColorPicker
                      color={settings.tertiary_color || '#0b0b0c'}
                      onChange={(color) => onSettingsChange({ tertiary_color: color })}
                    />
                    <button
                      onClick={() => setShowTertiaryPicker(false)}
                      className="mt-2 w-full px-3 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg hover:shadow-red-600/50 text-sm font-medium shadow-lg"
                    >
                      {t.done}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {t.colorInfo && (
            <p className="text-xs text-gray-400 mt-2">
              {t.colorInfo}
            </p>
          )}
        </div>

        {/* Logo */}
        <div>
          <h3 className="font-medium text-white mb-4">{t.logoHeading}</h3>
          <div className="flex items-start gap-4">
            <div className="flex-shrink-0">
              {settings.logo_url ? (
                <img src={settings.logo_url} alt="Logo" className="w-32 h-32 object-contain rounded-lg border-2 border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 p-2 shadow-lg" />
              ) : (
                <div className="w-32 h-32 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50">
                  <span className="text-4xl">🏆</span>
                </div>
              )}
            </div>
            <div className="flex-1">
              <label className="block">
                <input type="file" accept="image/*" onChange={onLogoUpload} disabled={uploadingLogo} className="hidden" />
                <div className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-center cursor-pointer inline-block border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/upload">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                  <span className="relative">{uploadingLogo ? t.uploading : settings.logo_url ? t.changeLogo : t.uploadLogo}</span>
                </div>
              </label>
              <p className="text-xs text-gray-400 mt-2">{t.logoInfo}</p>
              {settings.logo_url && (
                <button
                  onClick={() => onSettingsChange({ logo_url: undefined })}
                  className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                >
                  {t.removeLogo}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Banner (optional) */}
        {showBanner && onBannerUpload && (
          <div>
            <h3 className="font-medium text-white mb-4">{t.bannerHeading}</h3>
            <div className="space-y-4">
              {/* Banner Preview */}
              {settings.banner_url ? (
                <div className="relative rounded-lg overflow-hidden border-2 border-gray-700 shadow-2xl group/banner">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/banner:opacity-100 transition-opacity pointer-events-none z-10"></div>
                  <img
                    src={settings.banner_url}
                    alt="Team banner"
                    className="w-full h-48 object-cover"
                  />
                </div>
              ) : (
                <div className="relative w-full h-48 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-700 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 overflow-hidden group/empty">
                  <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/empty:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="text-center relative">
                    <span className="text-4xl block mb-2">🎯</span>
                    <p className="text-sm text-gray-300">{t.noBanner}</p>
                    <p className="text-xs text-gray-400 mt-1">{t.bannerFallback}</p>
                  </div>
                </div>
              )}
              {/* Upload Button */}
              <div>
                <label className="block">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onBannerUpload}
                    disabled={uploadingBanner}
                    className="hidden"
                  />
                  <div className="relative px-4 py-2 bg-gradient-to-br from-red-600/90 via-red-700/80 to-red-800/90 text-white rounded-lg font-medium text-center cursor-pointer inline-block border border-red-600/50 shadow-lg shadow-red-600/30 hover:shadow-red-600/50 overflow-hidden group/upload disabled:opacity-50"
                    style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/upload:opacity-100 transition-opacity pointer-events-none"></div>
                    <span className="relative">{uploadingBanner ? t.uploading : settings.banner_url ? t.changeBanner : t.uploadBanner}</span>
                  </div>
                </label>
                <p className="text-xs text-gray-400 mt-2">
                  {t.bannerInfo}
                </p>
                {settings.banner_url && (
                  <button
                    onClick={() => onSettingsChange({ banner_url: undefined })}
                    className="mt-2 text-sm text-red-400 hover:text-red-300 font-medium transition-colors"
                  >
                    {t.removeBanner}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Branding Tips (optional) */}
        {showTips && (
          <div className="relative bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-sm rounded-lg p-4 border border-gray-600 overflow-hidden group/info">
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent opacity-0 group-hover/info:opacity-100 transition-opacity pointer-events-none"></div>
            <h3 className="text-sm font-semibold text-white mb-2 relative">{t.tipsHeading}</h3>
            <div className="space-y-1 text-sm text-gray-300 relative">
              <div>{t.tip1}</div>
              <div>{t.tip2}</div>
              <div>{t.tip3}</div>
              <div>{t.tip4}</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
