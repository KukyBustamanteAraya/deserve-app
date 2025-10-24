'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBuilderState } from '@/hooks/useBuilderState';
import { getBrowserClient } from '@/lib/supabase/client';
import Image from 'next/image';
import { CustomizeBanner } from '@/components/customize/CustomizeBanner';
import { CustomizeStepNav } from '@/components/customize/CustomizeStepNav';

export default function PersonalizaPage() {
  const router = useRouter();
  const {
    teamColors,
    setTeamColors,
    selectedDesign,
    userType,
    setUserType,
    logoUrl,
    setLogoUrl
  } = useBuilderState();

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [teamName, setTeamName] = useState('Mi Equipo');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Apply CSS variables for gradient
  useEffect(() => {
    document.documentElement.style.setProperty('--brand-primary', teamColors.primary);
    document.documentElement.style.setProperty('--brand-secondary', teamColors.secondary);
    document.documentElement.style.setProperty('--brand-accent', teamColors.accent);
  }, [teamColors]);

  // Redirect if no design selected
  useEffect(() => {
    if (!selectedDesign) {
      router.push('/catalog');
    }
  }, [selectedDesign, router]);

  const handleCircleClick = () => {
    if (logoUrl) {
      // If logo exists, open crop modal with existing logo
      setTempLogo(logoUrl);
      setShowCropModal(true);
    } else {
      // If no logo, trigger file upload
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTempLogo(event.target?.result as string);
        setShowCropModal(true);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
    // Reset input value so the same file can be selected again
    e.target.value = '';
  };

  const handleReplaceLogo = () => {
    fileInputRef.current?.click();
  };

  const handleSaveLogo = () => {
    setLogoUrl(tempLogo || undefined);
    setShowCropModal(false);
  };

  const handleCancelCrop = () => {
    setTempLogo(null);
    setShowCropModal(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNameClick = () => {
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    setTeamName(editedName);
    setIsEditingName(false);
  };

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(teamName);
      setIsEditingName(false);
    }
  };

  const handleContinue = () => {
    if (!userType) {
      alert('Por favor selecciona tu rol');
      return;
    }
    // Navigate to next step (will be created later)
    router.push('/personaliza/uniformes');
  };

  if (!selectedDesign) {
    return null; // Will redirect
  }

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${teamColors.primary}, ${teamColors.secondary}, ${teamColors.accent})`,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <CustomizeBanner />

      {/* Main Content */}
      <div className="max-w-3xl mx-auto px-4 py-4 pb-32 pt-64">
        {/* Step 1: User Type Selection */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-4">
          <h2 className="text-xl font-bold text-gray-900 mb-2">¿Quién eres?</h2>
          <p className="text-sm text-gray-600 mb-4">Selecciona tu rol para personalizar tu experiencia</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {/* Player/Captain Option */}
            <button
              onClick={() => setUserType('player')}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                userType === 'player'
                  ? 'border-2'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={userType === 'player' ? {
                borderColor: teamColors.primary,
                backgroundColor: `${teamColors.primary}10`
              } : {}}
              aria-pressed={userType === 'player'}
            >
              {userType === 'player' && (
                <div
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: teamColors.primary }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-2">⚽</div>
              <h3
                className="text-lg font-semibold mb-1"
                style={userType === 'player' ? { color: teamColors.primary } : { color: '#111827' }}
              >
                Jugador / Capitán
              </h3>
              <p className="text-sm text-gray-600">
                Estoy comprando para mí o coordinando para mi equipo
              </p>
            </button>

            {/* Manager/Coach Option */}
            <button
              onClick={() => setUserType('manager')}
              className={`relative p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                userType === 'manager'
                  ? 'border-2'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
              style={userType === 'manager' ? {
                borderColor: teamColors.primary,
                backgroundColor: `${teamColors.primary}10`
              } : {}}
              aria-pressed={userType === 'manager'}
            >
              {userType === 'manager' && (
                <div
                  className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: teamColors.primary }}
                >
                  <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}

              <div className="text-3xl mb-2">📋</div>
              <h3
                className="text-lg font-semibold mb-1"
                style={userType === 'manager' ? { color: teamColors.primary } : { color: '#111827' }}
              >
                Entrenador / Administrador
              </h3>
              <p className="text-sm text-gray-600">
                Gestiono un equipo o club deportivo
              </p>
            </button>
          </div>
        </div>

      </div>

      <CustomizeStepNav onContinue={handleContinue} canContinue={!!userType} />

      {/* Crop Modal */}
      {showCropModal && tempLogo && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Ajustar Logo</h3>

            {/* Image Preview Circle */}
            <div className="flex justify-center mb-6">
              <div
                className="w-64 h-64 rounded-full overflow-hidden border-4 border-gray-200 relative"
                style={{
                  background: 'white'
                }}
              >
                <img
                  src={tempLogo}
                  alt="Logo preview"
                  className="absolute"
                  style={{
                    transform: `scale(${zoom}) translate(${position.x}px, ${position.y}px)`,
                    transformOrigin: 'center center',
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                  }}
                />
              </div>
            </div>

            {/* Zoom Control */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoom
              </label>
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.1"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Position Controls */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Posición
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-gray-600">Horizontal</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={position.x}
                    onChange={(e) => setPosition({ ...position, x: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-600">Vertical</label>
                  <input
                    type="range"
                    min="-100"
                    max="100"
                    step="5"
                    value={position.y}
                    onChange={(e) => setPosition({ ...position, y: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col gap-3">
              {logoUrl && (
                <button
                  onClick={handleReplaceLogo}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors font-medium"
                >
                  Reemplazar Logo
                </button>
              )}
              <div className="flex gap-3">
                <button
                  onClick={handleCancelCrop}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveLogo}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
