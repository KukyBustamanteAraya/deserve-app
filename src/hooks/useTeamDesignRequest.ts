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

  // Step 1: Product Selection
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
    (set) => ({
      // Initial state
      teamId: null,
      teamSlug: null,
      teamColors: {
        primary: '#3B82F6',
        secondary: '#1E40AF',
        tertiary: '#FFFFFF',
      },
      teamLogoUrl: null,
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
      setTeamContext: (teamId, teamSlug, colors, logoUrl) =>
        set({
          teamId,
          teamSlug,
          teamColors: colors,
          teamLogoUrl: logoUrl,
          customColors: colors, // Pre-fill custom colors with team colors
        }),

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
    }
  )
);
