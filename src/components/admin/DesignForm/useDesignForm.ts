'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';
import type { Design, DesignImage, Sport, Product } from './types';

export function useDesignForm(design?: Design, mode: 'create' | 'edit' = 'create') {
  const router = useRouter();
  const supabase = getBrowserClient();

  // Form state
  const [formData, setFormData] = useState<Design>({
    name: design?.name || '',
    slug: design?.slug || '',
    description: design?.description || '',
    designer_name: design?.designer_name || '',
    style_tags: design?.style_tags || [],
    color_scheme: design?.color_scheme || [],
    is_customizable: design?.is_customizable ?? true,
    allows_recoloring: design?.allows_recoloring ?? true,
    featured: design?.featured ?? false,
    active: design?.active ?? false,
  });

  const [designImages, setDesignImages] = useState<DesignImage[]>(design?.design_mockups || []);
  const [sports, setSports] = useState<Sport[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Fetch sports and products
  useEffect(() => {
    const fetchData = async () => {
      const [sportsRes, productsRes] = await Promise.all([
        supabase.from('sports').select('id, name, slug').order('name'),
        supabase.from('products').select('id, name, slug, category, price_clp, sport_ids, product_type_slug').order('name'),
      ]);

      if (sportsRes.data) setSports(sportsRes.data);
      if (productsRes.data) {
        setProducts(productsRes.data as Product[]);
      }
    };

    fetchData();
  }, [supabase]);

  // Auto-generate slug from name
  const generateSlug = useCallback((name: string) => {
    return name
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_-]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }, []);

  // Update form data
  const updateFormData = useCallback(
    (field: keyof Design, value: any) => {
      setFormData((prev) => {
        const updated = { ...prev, [field]: value };

        // Auto-generate slug when name changes (only in create mode)
        if (field === 'name' && mode === 'create') {
          updated.slug = generateSlug(value);
        }

        return updated;
      });

      // Clear error for this field
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    },
    [generateSlug, mode]
  );

  // Style tags management
  const toggleStyleTag = useCallback(
    (tag: string) => {
      const current = formData.style_tags;
      if (current.includes(tag)) {
        updateFormData(
          'style_tags',
          current.filter((t) => t !== tag)
        );
      } else {
        updateFormData('style_tags', [...current, tag]);
      }
    },
    [formData.style_tags, updateFormData]
  );

  // Color scheme management
  const addColor = useCallback(
    (color: string) => {
      if (!formData.color_scheme.includes(color)) {
        updateFormData('color_scheme', [...formData.color_scheme, color]);
      }
    },
    [formData.color_scheme, updateFormData]
  );

  const removeColor = useCallback(
    (color: string) => {
      updateFormData(
        'color_scheme',
        formData.color_scheme.filter((c) => c !== color)
      );
    },
    [formData.color_scheme, updateFormData]
  );

  // Get products available for a specific sport
  const getProductsForSport = useCallback(
    (sportId: string): Product[] => {
      if (!sportId) return [];
      const sportIdNum = parseInt(sportId);
      return products.filter((p) => p.sport_ids.includes(sportIdNum));
    },
    [products]
  );

  // Design Image management
  const addDesignImage = useCallback(() => {
    const defaultSportId = sports[0]?.id || '';
    const availableProducts = getProductsForSport(defaultSportId);
    const defaultProduct = availableProducts[0];

    setDesignImages([
      ...designImages,
      {
        sport_id: defaultSportId,
        product_id: defaultProduct?.id || '',
        product_type_slug: defaultProduct?.product_type_slug || '',
        mockup_url: '',
        view_angle: 'front',
        is_primary: designImages.length === 0,
        sort_order: designImages.length,
        _isNew: true,
      },
    ]);
  }, [sports, designImages, getProductsForSport]);

  const updateDesignImage = useCallback(
    (index: number, field: keyof DesignImage, value: any) => {
      const updated = [...designImages];
      updated[index] = { ...updated[index], [field]: value };

      // If changing sport, reset product selection to first available product for new sport
      if (field === 'sport_id') {
        const availableProducts = getProductsForSport(value);
        const firstProduct = availableProducts[0];
        updated[index].product_id = firstProduct?.id || '';
        updated[index].product_type_slug = firstProduct?.product_type_slug || '';
      }

      // If changing product, update product_type_slug for backward compatibility
      if (field === 'product_id') {
        const selectedProduct = products.find((p) => p.id === value);
        if (selectedProduct) {
          updated[index].product_type_slug = selectedProduct.product_type_slug;
        }
      }

      // If setting as primary, unset others with same sport+product
      if (field === 'is_primary' && value === true) {
        const current = updated[index];
        updated.forEach((img, i) => {
          if (
            i !== index &&
            img.sport_id === current.sport_id &&
            img.product_id === current.product_id
          ) {
            img.is_primary = false;
          }
        });
      }

      setDesignImages(updated);
    },
    [designImages, products, getProductsForSport]
  );

  const removeDesignImage = useCallback(
    async (index: number) => {
      const image = designImages[index];

      // If image has an ID, delete it from the database
      if (image.id) {
        try {
          const response = await fetch(`/api/admin/mockups/${image.id}`, {
            method: 'DELETE',
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to delete mockup');
          }
        } catch (error: any) {
          console.error('Error deleting mockup:', error);
          alert(error.message || 'Failed to delete mockup');
          return;
        }
      }

      // Remove from local state
      setDesignImages(designImages.filter((_, i) => i !== index));
    },
    [designImages]
  );

  const handleFileChange = useCallback(
    async (index: number, file: File) => {
      if (!file) return;

      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please upload an image file');
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('File size must be less than 5MB');
        return;
      }

      // Store file temporarily - will upload on form submit
      const updated = [...designImages];
      updated[index] = {
        ...updated[index],
        _file: file,
        mockup_url: URL.createObjectURL(file),
      };
      setDesignImages(updated);
    },
    [designImages]
  );

  // Upload design image file to Supabase Storage
  const uploadDesignImageFile = useCallback(
    async (file: File, designId: string): Promise<string> => {
      const fileExt = file.name.split('.').pop();
      const fileName = `${designId}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `design-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('designs')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        throw new Error(`Failed to upload file: ${uploadError.message}`);
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('designs').getPublicUrl(filePath);

      return publicUrl;
    },
    [supabase]
  );

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }

    if (!formData.slug.trim()) {
      newErrors.slug = 'Slug is required';
    } else if (!/^[a-z0-9-]+$/.test(formData.slug)) {
      newErrors.slug = 'Slug must contain only lowercase letters, numbers, and hyphens';
    }

    // Validate design images
    designImages.forEach((image, index) => {
      if (!image.sport_id) {
        newErrors[`image_${index}_sport`] = 'Sport is required';
      }
      if (!image.product_id) {
        newErrors[`image_${index}_product`] = 'Product is required';
      }
      if (!image.mockup_url && !image._file) {
        newErrors[`image_${index}_url`] = 'Design image is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, designImages]);

  // Submit form
  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!validate()) {
        // Scroll to first error
        const firstError = document.querySelector('[data-error="true"]');
        firstError?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }

      setLoading(true);

      try {
        let designId = design?.id;

        // Step 1: Create or update design
        if (mode === 'create') {
          const response = await fetch('/api/admin/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              ...formData,
              mockups: [],
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to create design');
          }

          const result = await response.json();
          designId = result.data.id;
        } else {
          const response = await fetch(`/api/admin/designs/${design?.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to update design');
          }
        }

        // Step 2: Upload and create/update design images
        for (const image of designImages) {
          // If image already exists (has ID), update it
          if (image.id) {
            const response = await fetch(`/api/admin/mockups/${image.id}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sport_id: image.sport_id,
                product_type_slug: image.product_type_slug,
                product_id: image.product_id,
                view_angle: image.view_angle,
                is_primary: image.is_primary,
                sort_order: image.sort_order,
              }),
            });

            if (!response.ok) {
              const error = await response.json();
              console.error('Failed to update design image:', error);
            }
            continue;
          }

          // For new images, upload file and create record
          if (!image._file) continue;

          // Upload file
          const imageUrl = await uploadDesignImageFile(image._file, designId!);

          // Create design image record
          const response = await fetch(`/api/admin/designs/${designId}/mockups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              sport_id: image.sport_id,
              product_type_slug: image.product_type_slug,
              product_id: image.product_id,
              mockup_url: imageUrl,
              view_angle: image.view_angle,
              is_primary: image.is_primary,
              sort_order: image.sort_order,
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            console.error('Failed to create design image:', error);
          }
        }

        // Success - redirect to designs list
        router.push('/admin/designs');
        router.refresh();
      } catch (error: any) {
        console.error('Error submitting form:', error);
        alert(error.message || 'Failed to save design');
      } finally {
        setLoading(false);
      }
    },
    [design, mode, formData, designImages, validate, uploadDesignImageFile, router]
  );

  return {
    formData,
    designImages,
    sports,
    products,
    loading,
    errors,
    updateFormData,
    toggleStyleTag,
    addColor,
    removeColor,
    getProductsForSport,
    addDesignImage,
    updateDesignImage,
    removeDesignImage,
    handleFileChange,
    handleSubmit,
  };
}
