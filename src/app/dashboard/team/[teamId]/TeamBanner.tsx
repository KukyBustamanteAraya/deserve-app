'use client';

import { useState, useRef } from 'react';

interface TeamBannerProps {
  teamName: string;
  isOwner: boolean;
}

export function TeamBanner({ teamName, isOwner }: TeamBannerProps) {
  const [color1, setColor1] = useState('#2563eb'); // blue-600
  const [color2, setColor2] = useState('#3b82f6'); // blue-500
  const [color3, setColor3] = useState('#1e40af'); // blue-800
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [tempLogo, setTempLogo] = useState<string | null>(null);
  const [showCropModal, setShowCropModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState(teamName);
  const [isHoveringName, setIsHoveringName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const gradientStyle = {
    background: `linear-gradient(to bottom right, ${color1}, ${color2}, ${color3})`,
  };

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
    setLogoUrl(tempLogo);
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
    // TODO: Save to database
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

  return (
    <>
      <div
        className="rounded-lg shadow-lg py-16 px-8 relative"
        style={gradientStyle}
      >
        {/* Logo Upload Circle */}
        <div className="flex flex-col items-center mb-6">
          <div
            onClick={handleCircleClick}
            className="w-32 h-32 rounded-full bg-white/20 backdrop-blur-sm border-2 border-white/40 flex flex-col items-center justify-center cursor-pointer hover:bg-white/30 transition-all duration-200 overflow-hidden"
          >
            {logoUrl ? (
              <img
                src={logoUrl}
                alt="Team logo"
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <>
                <div className="text-5xl text-white font-light mb-1">+</div>
                <div className="text-xs text-white font-medium">Sube tu Logo</div>
              </>
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
        <div
          className="flex justify-center relative"
          onMouseEnter={() => setIsHoveringName(true)}
          onMouseLeave={() => setIsHoveringName(false)}
        >
          {isEditingName ? (
            <input
              type="text"
              value={editedName}
              onChange={(e) => setEditedName(e.target.value)}
              onBlur={handleNameSave}
              onKeyDown={handleNameKeyDown}
              autoFocus
              className="text-4xl font-bold text-white text-center bg-white/20 border-2 border-white/50 rounded-lg px-4 py-2 outline-none"
            />
          ) : (
            <div className="relative inline-block">
              <h1
                className="text-4xl font-bold text-white text-center cursor-pointer"
                onClick={handleNameClick}
              >
                {editedName}
              </h1>
              {isHoveringName && (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-3 h-3 text-white opacity-70 absolute -top-1 -right-4"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
              )}
            </div>
          )}
        </div>

        {/* Owner Badge and Color picker dots at top right */}
        <div className="absolute top-3 right-3 flex items-center gap-3">
          {isOwner && (
            <span className="px-3 py-1 bg-white/90 text-blue-600 text-sm font-medium rounded-full shadow-md">
              Owner
            </span>
          )}
          <div className="flex gap-2">
          <label
            className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-md hover:scale-110 transition-transform"
            style={{ backgroundColor: color1 }}
          >
            <input
              type="color"
              value={color1}
              onChange={(e) => setColor1(e.target.value)}
              className="opacity-0 w-0 h-0"
            />
          </label>
          <label
            className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-md hover:scale-110 transition-transform"
            style={{ backgroundColor: color2 }}
          >
            <input
              type="color"
              value={color2}
              onChange={(e) => setColor2(e.target.value)}
              className="opacity-0 w-0 h-0"
            />
          </label>
          <label
            className="w-6 h-6 rounded-full cursor-pointer border-2 border-white shadow-md hover:scale-110 transition-transform"
            style={{ backgroundColor: color3 }}
          >
            <input
              type="color"
              value={color3}
              onChange={(e) => setColor3(e.target.value)}
              className="opacity-0 w-0 h-0"
            />
          </label>
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
