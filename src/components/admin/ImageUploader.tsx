'use client';

import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDropzone } from 'react-dropzone';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  rectSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { createSupabaseBrowserClient } from '@/lib/supabase/browser';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '@/lib/logger';

const MAX_IMAGES = 6;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

interface UploadedImage {
  id: string;
  path: string;
  file: File;
  preview: string;
  alt: string;
  position: number;
}

interface ImageUploaderProps {
  onImagesChange: (data: {
    tempFolderId: string;
    images: Array<{ index: number; path: string; alt: string }>;
    heroIndex: number | null;
  }) => void;
  initialImages?: UploadedImage[];
  initialHeroIndex?: number | null;
}

// Sortable image item component
function SortableImageItem({
  image,
  isHero,
  onSelectHero,
  onDelete,
  onAltChange,
}: {
  image: UploadedImage;
  isHero: boolean;
  onSelectHero: () => void;
  onDelete: () => void;
  onAltChange: (alt: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: image.id,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`relative border-2 rounded-lg p-2 ${
        isHero ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
      }`}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        className="absolute top-1 left-1 bg-gray-800 text-white text-xs px-2 py-1 rounded cursor-move"
      >
        ⋮⋮
      </div>

      {/* Hero badge */}
      {isHero && (
        <div className="absolute top-1 right-1 bg-blue-600 text-white text-xs px-2 py-1 rounded">
          Hero
        </div>
      )}

      {/* Image preview */}
      <img
        src={image.preview}
        alt={image.alt || `Image ${image.position + 1}`}
        className="w-full h-32 object-cover rounded mb-2"
      />

      {/* Controls */}
      <div className="space-y-2">
        <input
          type="text"
          value={image.alt}
          onChange={(e) => onAltChange(e.target.value)}
          placeholder="Alt text (optional)"
          className="w-full text-sm px-2 py-1 border rounded"
        />

        <div className="flex gap-2">
          <label className="flex items-center gap-1 text-sm cursor-pointer">
            <input
              type="radio"
              name="hero"
              checked={isHero}
              onChange={onSelectHero}
              className="cursor-pointer"
            />
            <span>Set as hero</span>
          </label>

          <button
            type="button"
            onClick={onDelete}
            className="ml-auto text-red-600 hover:text-red-800 text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ImageUploader({
  onImagesChange,
  initialImages = [],
  initialHeroIndex = null,
}: ImageUploaderProps) {
  const [images, setImages] = useState<UploadedImage[]>(initialImages);
  const [heroIndex, setHeroIndex] = useState<number | null>(initialHeroIndex);
  const [tempFolderId] = useState<string>(() => uuidv4());
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  // Debug: Check authentication on mount
  useEffect(() => {
    (async () => {
      const res = await supabase.auth.getUser();
      logger.debug('Auth check:', res);
      logger.debug('Browser user ID:', { userId: res.data.user?.id });
      logger.debug('Expected ID: d4688023-0cd9-4875-94ed-33e98b010a15');
      logger.debug('Match:', { isMatch: res.data.user?.id === 'd4688023-0cd9-4875-94ed-33e98b010a15' });
    })();
  }, [supabase]);

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Notify parent of changes
  const notifyParent = useCallback(
    (updatedImages: UploadedImage[], updatedHeroIndex: number | null) => {
      onImagesChange({
        tempFolderId,
        images: updatedImages.map((img, idx) => ({
          index: idx,
          path: img.path,
          alt: img.alt,
        })),
        heroIndex: updatedHeroIndex,
      });
    },
    [tempFolderId, onImagesChange]
  );

  // Upload files to Supabase Storage
  const uploadFiles = async (files: File[]) => {
    setUploading(true);
    setError(null);

    try {
      // 1) Make sure the browser is authenticated
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        throw new Error('Not authenticated');
      }

      const startIndex = images.length;
      const newImages: UploadedImage[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const index = startIndex + i;
        const fileName = `${index}.jpg`;
        // 2) Upload to the *bucket* 'products' with a key that does NOT include the bucket name
        //    ✅ Correct: key 'temp-<uuid>/0.jpg'  ⛔️ Wrong: 'products/temp-<uuid>/0.jpg'
        const key = `temp-${tempFolderId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('products')           // bucket name EXACTLY 'products'
          .upload(key, file, {
            upsert: true,
            contentType: file.type,
          });

        if (uploadError) {
          throw new Error(`Failed to upload ${file.name}: ${uploadError.message}`);
        }

        newImages.push({
          id: `${tempFolderId}-${index}`,
          path: key, // store this key in DB later (path column)
          file,
          preview: URL.createObjectURL(file),
          alt: '',
          position: index,
        });
      }

      const updatedImages = [...images, ...newImages];
      setImages(updatedImages);
      notifyParent(updatedImages, heroIndex);
    } catch (err: any) {
      setError(err.message || 'Failed to upload images');
      logger.error('Upload error:', err);
    } finally {
      setUploading(false);
    }
  };

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      setError(null);

      // Validate number of files
      if (images.length + acceptedFiles.length > MAX_IMAGES) {
        setError(`Maximum ${MAX_IMAGES} images allowed`);
        return;
      }

      // Validate file types and sizes
      const invalidFiles = acceptedFiles.filter(
        (file) => !ACCEPTED_FORMATS.includes(file.type) || file.size > MAX_FILE_SIZE
      );

      if (invalidFiles.length > 0) {
        setError('Some files are invalid (check format and size)');
        return;
      }

      uploadFiles(acceptedFiles);
    },
    [images]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'image/webp': ['.webp'],
    },
    maxFiles: MAX_IMAGES,
    disabled: uploading || images.length >= MAX_IMAGES,
  });

  // Handle drag end (reorder)
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setImages((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        const reordered = arrayMove(items, oldIndex, newIndex).map((img, idx) => ({
          ...img,
          position: idx,
        }));

        // Update hero index if hero was moved
        let newHeroIndex = heroIndex;
        if (heroIndex === oldIndex) {
          newHeroIndex = newIndex;
        } else if (heroIndex !== null && oldIndex < heroIndex && newIndex >= heroIndex) {
          newHeroIndex = heroIndex - 1;
        } else if (heroIndex !== null && oldIndex > heroIndex && newIndex <= heroIndex) {
          newHeroIndex = heroIndex + 1;
        }

        setHeroIndex(newHeroIndex);
        notifyParent(reordered, newHeroIndex);

        return reordered;
      });
    }
  };

  // Delete image
  const handleDelete = (id: string) => {
    const updatedImages = images.filter((img) => img.id !== id);
    const deletedIndex = images.findIndex((img) => img.id === id);

    // Update positions
    const reindexed = updatedImages.map((img, idx) => ({ ...img, position: idx }));

    // Update hero index
    let newHeroIndex = heroIndex;
    if (heroIndex === deletedIndex) {
      newHeroIndex = null; // Hero was deleted
    } else if (heroIndex !== null && heroIndex > deletedIndex) {
      newHeroIndex = heroIndex - 1;
    }

    setImages(reindexed);
    setHeroIndex(newHeroIndex);
    notifyParent(reindexed, newHeroIndex);
  };

  // Update alt text
  const handleAltChange = (id: string, alt: string) => {
    const updatedImages = images.map((img) => (img.id === id ? { ...img, alt } : img));
    setImages(updatedImages);
    notifyParent(updatedImages, heroIndex);
  };

  // Set hero
  const handleSetHero = (index: number) => {
    setHeroIndex(index);
    notifyParent(images, index);
  };

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      {images.length < MAX_IMAGES && (
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition ${
            isDragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input {...getInputProps()} />
          {uploading ? (
            <p className="text-gray-600">Uploading...</p>
          ) : isDragActive ? (
            <p className="text-blue-600">Drop images here...</p>
          ) : (
            <div>
              <p className="text-gray-700 mb-1">
                Drag & drop images here, or click to select
              </p>
              <p className="text-sm text-gray-500">
                Max {MAX_IMAGES} images • JPEG, PNG, WebP • Max 5MB each
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {images.length}/{MAX_IMAGES} uploaded
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div>
          <p className="text-sm text-gray-600 mb-2">
            Drag to reorder • Select one as hero image
          </p>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {images.map((image, index) => (
                  <SortableImageItem
                    key={image.id}
                    image={image}
                    isHero={heroIndex === index}
                    onSelectHero={() => handleSetHero(index)}
                    onDelete={() => handleDelete(image.id)}
                    onAltChange={(alt) => handleAltChange(image.id, alt)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}
    </div>
  );
}
