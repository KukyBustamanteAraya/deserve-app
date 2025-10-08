'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useBuilderState } from '@/hooks/useBuilderState';

interface CustomizeBannerProps {
  teamName?: string;
  onTeamNameChange?: (name: string) => void;
  customColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
  customLogoUrl?: string;
  readonly?: boolean;
}

interface LogoTransform {
  zoom: number;
  position: { x: number; y: number };
}

export function CustomizeBanner({
  teamName: externalTeamName,
  onTeamNameChange,
  customColors,
  customLogoUrl,
  readonly = false
}: CustomizeBannerProps) {
  const builderState = useBuilderState();
  const teamColors = customColors || builderState.teamColors;
  const logoUrl = customLogoUrl || builderState.logoUrl;
  const setLogoUrl = builderState.setLogoUrl;
  const teamName = externalTeamName || builderState.teamName;
  const setTeamName = builderState.setTeamName;
  const [originalLogo, setOriginalLogo] = useState<string | null>(null);
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [savedTransform, setSavedTransform] = useState<LogoTransform>({ zoom: 1, position: { x: 0, y: 0 } });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${teamColors.primary}, ${teamColors.secondary}, ${teamColors.accent})`,
  };

  // Sync editedName with teamName when it changes
  useEffect(() => {
    setEditedName(teamName);
  }, [teamName]);

  const handleCircleClick = () => {
    if (readonly) return;
    if (originalLogo) {
      setTempLogo(originalLogo);
      setZoom(savedTransform.zoom);
      setPosition(savedTransform.position);
      setShowCropModal(true);
    } else {
      fileInputRef.current?.click();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result as string;
        setOriginalLogo(imageData);
        setTempLogo(imageData);
        setShowCropModal(true);
        setZoom(1);
        setPosition({ x: 0, y: 0 });
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleReplaceLogo = () => {
    fileInputRef.current?.click();
  };

  const createCroppedImage = useCallback(() => {
    return new Promise<string>((resolve) => {
      if (!tempLogo) {
        resolve('');
        return;
      }

      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const size = 400;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
          ctx.closePath();
          ctx.clip();

          const scale = zoom;
          const offsetX = position.x;
          const offsetY = position.y;

          const imgWidth = img.width;
          const imgHeight = img.height;
          const minDim = Math.min(imgWidth, imgHeight);
          const scaleFactor = (size / minDim) * scale;

          const drawWidth = imgWidth * scaleFactor;
          const drawHeight = imgHeight * scaleFactor;

          ctx.drawImage(
            img,
            (size - drawWidth) / 2 + offsetX,
            (size - drawHeight) / 2 + offsetY,
            drawWidth,
            drawHeight
          );

          ctx.restore();
          resolve(canvas.toDataURL('image/png', 1.0));
        }
      };
      img.src = tempLogo;
    });
  }, [tempLogo, zoom, position]);

  const handleSaveLogo = async () => {
    const croppedImage = await createCroppedImage();
    setLogoUrl(croppedImage || undefined);
    setSavedTransform({ zoom, position });
    setShowCropModal(false);
  };

  const handleCancelCrop = () => {
    setTempLogo(null);
    setShowCropModal(false);
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  const handleNameClick = () => {
    if (readonly) return;
    setIsEditingName(true);
  };

  const handleNameSave = () => {
    setTeamName(editedName);
    setIsEditingName(false);
    if (onTeamNameChange) {
      onTeamNameChange(editedName);
    }
  };

  const hasBeenCustomized = logoUrl || teamName !== 'Mi Equipo';
  const shouldShowAnimation = !readonly && !showCropModal && !isEditingName && !hasBeenCustomized;

  const handleNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleNameSave();
    } else if (e.key === 'Escape') {
      setEditedName(teamName);
      setIsEditingName(false);
    }
  };

  return (
    <>
      <div className="fixed top-20 left-0 right-0 z-30 bg-gray-50 pt-4 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className="rounded-lg shadow-lg py-8 px-8 relative"
            style={gradientStyle}
          >
          {/* Logo Upload Circle */}
          <div className="flex flex-col items-center mb-4">
            <div
              onClick={handleCircleClick}
              className={`w-24 h-24 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex flex-col items-center justify-center transition-all duration-200 overflow-hidden ${
                readonly ? 'cursor-default' : 'cursor-pointer hover:bg-white/30'
              } ${shouldShowAnimation ? 'shimmer-wrapper' : ''}`}
            >
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Team logo"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="flex flex-col items-center -mt-2">
                  <div className="text-4xl text-white font-light">+</div>
                  <div className="text-[10px] text-white font-medium -mt-2">Sube tu Logo</div>
                </div>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          {/* Editable Team Name */}
          <div className="flex justify-center relative w-full px-2">
            {isEditingName ? (
              <input
                type="text"
                value={editedName}
                onChange={(e) => setEditedName(e.target.value)}
                onBlur={handleNameSave}
                onKeyDown={handleNameKeyDown}
                autoFocus
                className="text-3xl font-bold text-white text-center bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 outline-none w-full max-w-lg"
              />
            ) : (
              <div className={`${shouldShowAnimation ? 'shimmer-wrapper' : ''} inline-block`}>
                <h1
                  className={`text-3xl font-bold text-white text-center ${readonly ? '' : 'cursor-pointer'}`}
                  onClick={handleNameClick}
                >
                  {editedName}
                </h1>
              </div>
            )}
          </div>
        </div>
        </div>
      </div>

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
    </>
  );
}
