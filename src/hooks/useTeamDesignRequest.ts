'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UniformDetails {
  sleeve: 'short' | 'long';
  neck: 'crew' | 'v' | 'polo';
  fit: 'athletic' | 'loose';
}

interface LogoPlacements {
  front: boolean;
  back: boolean;
  sleeveLeft: boolean;
  sleeveRight: boolean;
}

interface SelectedDesign {
  id: string;
  name: string;
}

interface ColorConfiguration {
  primary: string;
  secondary: string;
  tertiary: string;
}

interface ProductColorOptions {
  includeHome: boolean;
  includeAway: boolean;
  homeColors: ColorConfiguration;
  awayColors: ColorConfiguration;
}

interface SelectedProduct {
  id: string;
  name: string;
  slug: string;
  designs: SelectedDesign[]; // Max 2 designs per product
  colorOptions?: ProductColorOptions;
}

interface TeamDesignRequestState {
  // Team context
  teamId: string | null;
  teamSlug: string | null;
  teamColors: {
    primary: string;
    secondary: string;
    tertiary: string;
  };
  teamLogoUrl: string | null;

  // Step 1: Product Selection (now supports multiple products)
  selectedProducts: SelectedProduct[];

  // Legacy fields (kept for backwards compatibility, deprecated)
  selectedProductId: string | null;
  selectedProductName: string | null;
  selectedProductSlug: string | null;
  selectedDesignId: string | null;
  selectedDesignName: string | null;
  customDesignDescription: string | null;
  customDesignImageUrl: string | null;

  // Step 2: Color Customization
  customColors: {
    primary: string;
    secondary: string;
    tertiary: string;
  };

  // Step 3: Uniform Details
  uniformDetails: UniformDetails;

  // Step 4: Logo Placement
  logoPlacements: LogoPlacements;

  // Step 5: Names & Numbers
  namesNumbers: boolean;

  // Actions
  setTeamContext: (teamId: string, teamSlug: string, colors: { primary: string; secondary: string; tertiary: string }, logoUrl: string | null) => void;
  toggleProduct: (productId: string, productName: string, productSlug: string) => void;
  setProductDesigns: (productId: string, designs: SelectedDesign[]) => void;
  setProductColorOptions: (productId: string, colorOptions: ProductColorOptions) => void;

  // Legacy actions (deprecated)
  setProduct: (productId: string, productName: string, productSlug: string) => void;
  setDesign: (designId: string | null, designName: string | null) => void;
  setCustomDesign: (description: string, imageUrl: string | null) => void;

  setCustomColors: (colors: { primary: string; secondary: string; tertiary: string }) => void;
  setUniformDetails: (details: Partial<UniformDetails>) => void;
  toggleLogoPlacement: (position: keyof LogoPlacements) => void;
  setNamesNumbers: (value: boolean) => void;
  reset: () => void;
}

const defaultUniformDetails: UniformDetails = {
  sleeve: 'short',
  neck: 'crew',
  fit: 'athletic',
};

const defaultLogoPlacements: LogoPlacements = {
  front: false,
  back: false,
  sleeveLeft: false,
  sleeveRight: false,
};

export const useTeamDesignRequest = create<TeamDesignRequestState>()(
  persist(
    (set, get) => ({
      // Initial state
      teamId: null,
      teamSlug: null,
      teamColors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        tertiary: '#FFFFFF',
      },
      teamLogoUrl: null,
      selectedProducts: [],
      selectedProductId: null,
      selectedProductName: null,
      selectedProductSlug: null,
      selectedDesignId: null,
      selectedDesignName: null,
      customDesignDescription: null,
      customDesignImageUrl: null,
      customColors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        tertiary: '#FFFFFF',
      },
      uniformDetails: defaultUniformDetails,
      logoPlacements: defaultLogoPlacements,
      namesNumbers: false,

      // Actions
      setTeamContext: (teamId, teamSlug, colors, logoUrl) => {
        console.log('[Zustand] setTeamContext called with:', { teamId, teamSlug, colors, logoUrl });
        set({
          teamId,
          teamSlug,
          teamColors: colors,
          teamLogoUrl: logoUrl,
          customColors: colors, // Pre-fill custom colors with team colors
        });
        console.log('[Zustand] State updated');
      },

      toggleProduct: (productId, productName, productSlug) =>
        set((state) => {
          const existingIndex = state.selectedProducts.findIndex(p => p.id === productId);
          if (existingIndex >= 0) {
            // Remove product if already selected
            return {
              selectedProducts: state.selectedProducts.filter(p => p.id !== productId),
            };
          } else {
            // Add product with empty designs array
            return {
              selectedProducts: [
                ...state.selectedProducts,
                { id: productId, name: productName, slug: productSlug, designs: [] },
              ],
            };
          }
        }),

      setProductDesigns: (productId, designs) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.map(product =>
            product.id === productId
              ? { ...product, designs: designs.slice(0, 2) } // Max 2 designs
              : product
          ),
        })),

      setProductColorOptions: (productId, colorOptions) =>
        set((state) => ({
          selectedProducts: state.selectedProducts.map(product =>
            product.id === productId
              ? { ...product, colorOptions }
              : product
          ),
        })),

      // Legacy actions (for backwards compatibility)
      setProduct: (productId, productName, productSlug) =>
        set({
          selectedProductId: productId,
          selectedProductName: productName,
          selectedProductSlug: productSlug,
        }),

      setDesign: (designId, designName) =>
        set({
          selectedDesignId: designId,
          selectedDesignName: designName,
          customDesignDescription: null,
          customDesignImageUrl: null,
        }),

      setCustomDesign: (description, imageUrl) =>
        set({
          customDesignDescription: description,
          customDesignImageUrl: imageUrl,
          selectedDesignId: null,
          selectedDesignName: null,
        }),

      setCustomColors: (colors) =>
        set({ customColors: colors }),

      setUniformDetails: (details) =>
        set((state) => ({
          uniformDetails: { ...state.uniformDetails, ...details },
        })),

      toggleLogoPlacement: (position) =>
        set((state) => ({
          logoPlacements: {
            ...state.logoPlacements,
            [position]: !state.logoPlacements[position],
          },
        })),

      setNamesNumbers: (value) =>
        set({ namesNumbers: value }),

      reset: () =>
        set({
          teamId: null,
          teamSlug: null,
          teamColors: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            tertiary: '#FFFFFF',
          },
          teamLogoUrl: null,
          selectedProducts: [],
          selectedProductId: null,
          selectedProductName: null,
          selectedProductSlug: null,
          selectedDesignId: null,
          selectedDesignName: null,
          customDesignDescription: null,
          customDesignImageUrl: null,
          customColors: {
            primary: '#3B82F6',
            secondary: '#1E40AF',
            tertiary: '#FFFFFF',
          },
          uniformDetails: defaultUniformDetails,
          logoPlacements: defaultLogoPlacements,
          namesNumbers: false,
        }),
    }),
    {
      name: 'team-design-request-storage',
      version: 2, // Increment version to clear old cache
      migrate: (persistedState: any, version: number) => {
        console.log('[Zustand] Migrating from version', version);

        // If migrating from version 0 or 1, or if teamColors has undefined values, reset
        if (version < 2 || !persistedState.teamColors ||
            persistedState.teamColors.primary === undefined) {
          console.log('[Zustand] Clearing invalid cached state');
          return {
            ...persistedState,
            teamColors: {
              primary: '#3B82F6',
              secondary: '#1E40AF',
              tertiary: '#FFFFFF',
            },
            customColors: {
              primary: '#3B82F6',
              secondary: '#1E40AF',
              tertiary: '#FFFFFF',
            },
          };
        }

        return persistedState;
      },
    }
  )
);
