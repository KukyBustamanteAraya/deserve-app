'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { getBrowserClient } from '@/lib/supabase/client';

interface Sport {
  id: string;
  name: string;
  slug: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  sport_ids: number[];  // Array of sport IDs this product is available for
  product_type_slug: string;
}

// Design Image - represents an actual design image for a specific sport+product combination
// Note: Database table is called "design_mockups" for backward compatibility
// but these are actual design images, not mockups (mockups are for customer customizations)
interface DesignImage {
  id?: string;
  sport_id: string;
  product_type_slug: string;  // Keep for backward compatibility with database
  product_id?: string;         // Link to specific product (stored as bigint in DB, string in form)
  mockup_url: string;          // Database column name (keep as is), but contains design image URL
  view_angle: string;
  is_primary: boolean;
  sort_order: number;
  sports?: Sport;
  product?: Product;
  _isNew?: boolean;
  _file?: File;
}

interface Design {
  id?: string;
  name: string;
  slug: string;
  description: string;
  designer_name: string;
  style_tags: string[];
  color_scheme: string[];
  is_customizable: boolean;
  allows_recoloring: boolean;
  featured: boolean;
  active: boolean;
  design_mockups?: DesignImage[];  // Database table name (keep as is)
}

interface DesignFormProps {
  design?: Design;
  mode: 'create' | 'edit';
}

const STYLE_TAG_OPTIONS = [
  'modern',
  'minimalist',
  'bold',
  'vintage',
  'sporty',
  'elegant',
  'geometric',
  'abstract',
  'classic',
  'dynamic',
  'retro',
  'futuristic',
];

const VIEW_ANGLE_OPTIONS = ['front', 'back', 'side', '3/4', 'detail'];

export default function DesignForm({ design, mode }: DesignFormProps) {
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
  const [products, setProducts] = useState<Product[]>([]);  // All products from admin
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [colorInput, setColorInput] = useState('');

  // Fetch sports and products
  useEffect(() => {
    const fetchData = async () => {
      const [sportsRes, productsRes] = await Promise.all([
        supabase.from('sports').select('id, name, slug').order('name'),
        supabase.from('products').select('id, name, slug, category, price_cents, sport_ids, product_type_slug').order('name'),
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
  const updateFormData = (field: keyof Design, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };

      // Auto-generate slug when name changes (only in create mode)
      if (field === 'name' && mode === 'create') {
        updated.slug = generateSlug(value);
      }

      return updated;
    });

    // Clear error for this field
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  // Style tags management
  const toggleStyleTag = (tag: string) => {
    const current = formData.style_tags;
    if (current.includes(tag)) {
      updateFormData(
        'style_tags',
        current.filter((t) => t !== tag)
      );
    } else {
      updateFormData('style_tags', [...current, tag]);
    }
  };

  // Color scheme management
  const addColor = () => {
    if (!colorInput.trim()) return;

    const color = colorInput.trim();
    if (!formData.color_scheme.includes(color)) {
      updateFormData('color_scheme', [...formData.color_scheme, color]);
    }
    setColorInput('');
  };

  const removeColor = (color: string) => {
    updateFormData(
      'color_scheme',
      formData.color_scheme.filter((c) => c !== color)
    );
  };

  // Get products available for a specific sport
  const getProductsForSport = (sportId: string): Product[] => {
    if (!sportId) return [];
    const sportIdNum = parseInt(sportId);
    return products.filter(p => p.sport_ids.includes(sportIdNum));
  };

  // Design Image management
  const addDesignImage = () => {
    const defaultSportId = sports[0]?.id || '';
    const availableProducts = getProductsForSport(defaultSportId);
    const defaultProduct = availableProducts[0];

    setDesignImages([
      ...designImages,
      {
        sport_id: defaultSportId,
        product_id: defaultProduct?.id || '',
        product_type_slug: defaultProduct?.product_type_slug || '',
        mockup_url: '',  // Database column name (keep as is)
        view_angle: 'front',
        is_primary: designImages.length === 0,
        sort_order: designImages.length,
        _isNew: true,
      },
    ]);
  };

  const updateDesignImage = (index: number, field: keyof DesignImage, value: any) => {
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
      const selectedProduct = products.find(p => p.id === value);
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
  };

  const removeDesignImage = (index: number) => {
    setDesignImages(designImages.filter((_, i) => i !== index));
  };

  const handleFileChange = async (index: number, file: File) => {
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
  };

  // Upload design image file to Supabase Storage
  const uploadDesignImageFile = async (file: File, designId: string): Promise<string> => {
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
  };

  // Validation
  const validate = (): boolean => {
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
  };

  // Submit form
  const handleSubmit = async (e: React.FormEvent) => {
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

      // Step 2: Upload and create design images
      for (const image of designImages) {
        if (image.id) {
          continue;
        }

        if (!image._file) continue;

        // Upload file
        const imageUrl = await uploadDesignImageFile(image._file, designId!);

        // Create design image record (database table still called "design_mockups")
        const response = await fetch(`/api/admin/designs/${designId}/mockups`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sport_id: image.sport_id,
            product_type_slug: image.product_type_slug, // Keep for backward compatibility
            product_id: image.product_id,                // Link to specific product
            mockup_url: imageUrl,                        // Database column name (keep as is)
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
  };

  // Get sport name by ID
  const getSportName = (sportId: string) => {
    return sports.find((s) => s.id === sportId)?.name || sportId;
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">
            {mode === 'create' ? 'Create New Design' : 'Edit Design'}
          </h1>
          <p className="text-gray-400 mt-1">
            {mode === 'create'
              ? 'Add a new design template to your library'
              : 'Update design details and images'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => router.back()}
          className="relative px-4 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Cancel</span>
        </button>
      </div>

      {/* Basic Information */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-xl font-semibold text-white mb-4">Basic Information</h2>
        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
              Name <span className="text-[#e21c21]">*</span>
            </label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={(e) => updateFormData('name', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-900 border ${
                errors.name ? 'border-[#e21c21]' : 'border-gray-700'
              } rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
              placeholder="Thunder Strike"
              data-error={!!errors.name}
            />
            {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name}</p>}
          </div>

          {/* Slug */}
          <div>
            <label htmlFor="slug" className="block text-sm font-medium text-gray-300 mb-1">
              Slug <span className="text-[#e21c21]">*</span>
            </label>
            <input
              type="text"
              id="slug"
              value={formData.slug}
              onChange={(e) => updateFormData('slug', e.target.value)}
              className={`w-full px-3 py-2 bg-gray-900 border ${
                errors.slug ? 'border-[#e21c21]' : 'border-gray-700'
              } rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
              placeholder="thunder-strike"
              data-error={!!errors.slug}
            />
            {errors.slug && <p className="text-red-400 text-sm mt-1">{errors.slug}</p>}
            <p className="text-gray-500 text-xs mt-1">
              URL-friendly identifier (lowercase, hyphens only)
            </p>
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
              Description
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateFormData('description', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
              placeholder="A bold, modern design featuring striking geometric patterns..."
            />
          </div>

          {/* Designer Name */}
          <div>
            <label htmlFor="designer_name" className="block text-sm font-medium text-gray-300 mb-1">
              Designer Name
            </label>
            <input
              type="text"
              id="designer_name"
              value={formData.designer_name}
              onChange={(e) => updateFormData('designer_name', e.target.value)}
              className="w-full px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
              placeholder="Studio Deserve"
            />
          </div>
        </div>
      </div>

      {/* Classification */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-xl font-semibold text-white mb-4 relative">Classification</h2>
        <div className="space-y-6">
          {/* Style Tags */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Style Tags</label>
            <div className="flex flex-wrap gap-2">
              {STYLE_TAG_OPTIONS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleStyleTag(tag)}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    formData.style_tags.includes(tag)
                      ? 'bg-[#e21c21] text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
            {formData.style_tags.length > 0 && (
              <p className="text-gray-500 text-xs mt-2">
                Selected: {formData.style_tags.join(', ')}
              </p>
            )}
          </div>

          {/* Color Scheme */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Color Scheme</label>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={colorInput}
                onChange={(e) => setColorInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addColor();
                  }
                }}
                className="flex-1 px-3 py-2 bg-gray-900 border border-gray-700 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
                placeholder="Enter color name or hex code (e.g., #FF0000 or red)"
              />
              <button
                type="button"
                onClick={addColor}
                className="px-4 py-2 bg-[#e21c21] text-white rounded-md hover:bg-[#c11a1e] transition-colors"
              >
                Add
              </button>
            </div>
            {formData.color_scheme.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.color_scheme.map((color, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-700 rounded-md group"
                  >
                    <div
                      className="w-4 h-4 rounded border border-gray-600"
                      style={{ backgroundColor: color }}
                    />
                    <span className="text-sm text-gray-300">{color}</span>
                    <button
                      type="button"
                      onClick={() => removeColor(color)}
                      className="text-gray-500 hover:text-red-400 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Settings */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <h2 className="text-xl font-semibold text-white mb-4 relative">Settings</h2>
        <div className="space-y-3">
          {/* Is Customizable */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_customizable}
              onChange={(e) => updateFormData('is_customizable', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Is Customizable</div>
              <div className="text-gray-400 text-sm">
                Allow customers to customize this design with names, numbers, etc.
              </div>
            </div>
          </label>

          {/* Allows Recoloring */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.allows_recoloring}
              onChange={(e) => updateFormData('allows_recoloring', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Allows Recoloring</div>
              <div className="text-gray-400 text-sm">
                Allow customers to change the colors of this design
              </div>
            </div>
          </label>

          {/* Featured */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.featured}
              onChange={(e) => updateFormData('featured', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Featured</div>
              <div className="text-gray-400 text-sm">Show this design in featured sections</div>
            </div>
          </label>

          {/* Active */}
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.active}
              onChange={(e) => updateFormData('active', e.target.checked)}
              className="w-5 h-5 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
            />
            <div>
              <div className="text-white font-medium">Active</div>
              <div className="text-gray-400 text-sm">
                Make this design visible to customers in the catalog
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Design Images */}
      <div className="relative bg-gradient-to-br from-gray-800/90 via-black/80 to-gray-900/90 backdrop-blur-md border border-gray-700 rounded-lg p-6 shadow-2xl group">
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
        <div className="flex items-center justify-between mb-4 relative">
          <div>
            <h2 className="text-xl font-semibold text-white">Design Images</h2>
            <p className="text-gray-400 text-sm mt-1">
              Upload design images for different sports and products
            </p>
          </div>
          <button
            type="button"
            onClick={addDesignImage}
            className="relative px-4 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group/btn flex items-center gap-2"
            style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover/btn:opacity-100 transition-opacity pointer-events-none"></div>
            <svg className="w-5 h-5 relative" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="relative">Add Design Image</span>
          </button>
        </div>

        {designImages.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
            <svg
              className="w-12 h-12 mx-auto text-gray-600 mb-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <p className="text-gray-400 mb-4">No design images added yet</p>
            <button
              type="button"
              onClick={addDesignImage}
              className="px-6 py-2 bg-[#e21c21] text-white rounded-md hover:bg-[#c11a1e] transition-colors"
            >
              Add Your First Design Image
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {designImages.map((image, index) => (
              <div
                key={image.id || index}
                className="bg-gray-900 border border-gray-700 rounded-lg p-4"
              >
                <div className="flex items-start gap-4">
                  {/* Preview */}
                  <div className="flex-shrink-0">
                    {image.mockup_url ? (
                      <img
                        src={image.mockup_url}
                        alt="Design image preview"
                        className="w-24 h-24 object-cover rounded border border-gray-700"
                      />
                    ) : (
                      <div className="w-24 h-24 bg-gray-800 border border-gray-700 rounded flex items-center justify-center">
                        <svg
                          className="w-8 h-8 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Sport */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Sport <span className="text-[#e21c21]">*</span>
                      </label>
                      <select
                        value={image.sport_id}
                        onChange={(e) => updateDesignImage(index, 'sport_id', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border ${
                          errors[`image_${index}_sport`] ? 'border-[#e21c21]' : 'border-gray-700'
                        } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
                        data-error={!!errors[`image_${index}_sport`]}
                      >
                        <option value="">Select sport</option>
                        {sports.map((sport) => (
                          <option key={sport.id} value={sport.id}>
                            {sport.name}
                          </option>
                        ))}
                      </select>
                      {errors[`image_${index}_sport`] && (
                        <p className="text-red-400 text-sm mt-1">
                          {errors[`image_${index}_sport`]}
                        </p>
                      )}
                    </div>

                    {/* Product */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Product <span className="text-[#e21c21]">*</span>
                      </label>
                      <select
                        value={image.product_id || ''}
                        onChange={(e) => updateDesignImage(index, 'product_id', e.target.value)}
                        className={`w-full px-3 py-2 bg-gray-800 border ${
                          errors[`image_${index}_product`] ? 'border-[#e21c21]' : 'border-gray-700'
                        } rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent`}
                        data-error={!!errors[`image_${index}_product`]}
                      >
                        <option value="">Select product</option>
                        {getProductsForSport(image.sport_id).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (${product.price_cents.toLocaleString()} CLP)
                          </option>
                        ))}
                      </select>
                      {errors[`image_${index}_product`] && (
                        <p className="text-red-400 text-sm mt-1">
                          {errors[`image_${index}_product`]}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {getProductsForSport(image.sport_id).length === 0
                          ? 'No products available for this sport. Please create products first.'
                          : 'Select the specific product this design image applies to'}
                      </p>
                    </div>

                    {/* View Angle */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        View Angle
                      </label>
                      <select
                        value={image.view_angle}
                        onChange={(e) => updateDesignImage(index, 'view_angle', e.target.value)}
                        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-[#e21c21]/50 focus:border-transparent"
                      >
                        {VIEW_ANGLE_OPTIONS.map((angle) => (
                          <option key={angle} value={angle}>
                            {angle}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Image <span className="text-[#e21c21]">*</span>
                      </label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) handleFileChange(index, file);
                        }}
                        className={`w-full px-3 py-2 bg-gray-800 border ${
                          errors[`image_${index}_url`] ? 'border-[#e21c21]' : 'border-gray-700'
                        } rounded-md text-white file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-[#e21c21] file:text-white hover:file:bg-pink-700 cursor-pointer`}
                        data-error={!!errors[`image_${index}_url`]}
                      />
                      {errors[`image_${index}_url`] && (
                        <p className="text-red-400 text-sm mt-1">{errors[`image_${index}_url`]}</p>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={image.is_primary}
                        onChange={(e) => updateDesignImage(index, 'is_primary', e.target.checked)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-900 text-[#e21c21] focus:ring-2 focus:ring-[#e21c21]/50 focus:ring-offset-0"
                      />
                      <span className="text-sm text-gray-400">Primary</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => removeDesignImage(index)}
                      className="text-red-400 hover:text-pink-300 transition-colors text-sm"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit Buttons */}
      <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-700">
        <button
          type="button"
          onClick={() => router.back()}
          className="relative px-6 py-2 bg-gradient-to-br from-gray-800/50 via-black/40 to-gray-900/50 backdrop-blur-md text-gray-300 hover:text-white rounded-lg border border-gray-700/50 hover:border-[#e21c21]/50 transition-all overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
          disabled={loading}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <span className="relative">Cancel</span>
        </button>
        <button
          type="submit"
          disabled={loading}
          className="relative px-6 py-2 bg-gradient-to-br from-[#e21c21]/90 via-[#c11a1e]/80 to-[#a01519]/90 backdrop-blur-md text-white rounded-lg font-semibold transition-all shadow-lg shadow-[#e21c21]/30 hover:shadow-[#e21c21]/50 border border-[#e21c21]/50 overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          style={{ transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)' }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          {loading ? (
            <>
              <svg
                className="animate-spin h-5 w-5 relative"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span className="relative">{mode === 'create' ? 'Creating...' : 'Saving...'}</span>
            </>
          ) : (
            <span className="relative">{mode === 'create' ? 'Create Design' : 'Save Changes'}</span>
          )}
        </button>
      </div>
    </form>
  );
}
