import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OrganizationType = 'single_team' | 'institution';
export type UserRole = 'coach' | 'manager' | 'player' | 'parent' | 'other';

interface Mockup {
  id: string;
  mockup_url: string;
  view_angle: string;
  is_primary: boolean;
  sort_order: number;
}

interface QuickDesignRequestState {
  // Design context (set when user starts from design detail page)
  designId: string | null;
  designSlug: string | null;
  designName: string | null;
  sportId: number | null;
  sportSlug: string | null;
  sportName: string | null;
  mockups: Mockup[];
  selectedTeamId: string | null; // Track if using existing team

  // Step 1: Team basic info (collected on design page)
  teamName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;

  // Step 2: Organization details
  organizationType: OrganizationType | null;
  logoFile: File | null;
  logoUrl: string | null; // Preview URL for uploaded logo
  additionalSpecifications: string;

  // Step 3: User info (if not authenticated)
  email: string;
  role: UserRole | null;
  customRole: string; // For "other" role option

  // Tracking
  currentStep: number;
  isAuthenticated: boolean;

  // Actions
  setDesignContext: (params: {
    designId: string;
    designSlug: string;
    designName: string;
    sportId: number;
    sportSlug: string;
    sportName: string;
    mockups: Mockup[];
  }) => void;
  setSelectedTeamId: (id: string | null) => void;

  // Step 1 actions
  setTeamName: (name: string) => void;
  setPrimaryColor: (color: string) => void;
  setSecondaryColor: (color: string) => void;
  setAccentColor: (color: string) => void;

  // Step 2 actions
  setOrganizationType: (type: OrganizationType | null) => void;
  setLogoFile: (file: File | null) => void;
  setLogoUrl: (url: string | null) => void;
  setAdditionalSpecifications: (specs: string) => void;

  // Step 3 actions
  setEmail: (email: string) => void;
  setRole: (role: UserRole | null) => void;
  setCustomRole: (customRole: string) => void;

  // Navigation
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setIsAuthenticated: (auth: boolean) => void;

  // Utility
  reset: () => void;
  canProceedToStep2: () => boolean;
  canProceedToStep3: () => boolean;
  canProceedToStep4: () => boolean;
}

const initialState = {
  designId: null,
  designSlug: null,
  designName: null,
  sportId: null,
  sportSlug: null,
  sportName: null,
  mockups: [],
  selectedTeamId: null,
  teamName: '',
  primaryColor: '#e21c21',
  secondaryColor: '#ffffff',
  accentColor: '#000000',
  organizationType: null, // Explicitly null - no default selection
  logoFile: null,
  logoUrl: null,
  additionalSpecifications: '',
  email: '',
  role: null,
  customRole: '',
  currentStep: 1,
  isAuthenticated: false,
};

export const useQuickDesignRequest = create<QuickDesignRequestState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // Actions
      setDesignContext: (params) =>
        set({
          designId: params.designId,
          designSlug: params.designSlug,
          designName: params.designName,
          sportId: params.sportId,
          sportSlug: params.sportSlug,
          sportName: params.sportName,
          mockups: params.mockups,
        }),

      setSelectedTeamId: (id) => set({ selectedTeamId: id }),
      setTeamName: (name) => set({ teamName: name }),
      setPrimaryColor: (color) => set({ primaryColor: color }),
      setSecondaryColor: (color) => set({ secondaryColor: color }),
      setAccentColor: (color) => set({ accentColor: color }),

      setOrganizationType: (type) => set({ organizationType: type }),
      setLogoFile: (file) => set({ logoFile: file }),
      setLogoUrl: (url) => set({ logoUrl: url }),
      setAdditionalSpecifications: (specs) => set({ additionalSpecifications: specs }),

      setEmail: (email) => set({ email: email }),
      setRole: (role) => set({ role: role }),
      setCustomRole: (customRole) => set({ customRole: customRole }),

      setCurrentStep: (step) => set({ currentStep: step }),
      nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
      prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
      setIsAuthenticated: (auth) => set({ isAuthenticated: auth }),

      canProceedToStep2: () => {
        const state = get();
        return !!(state.teamName.trim() && state.primaryColor && state.secondaryColor && state.accentColor);
      },

      canProceedToStep3: () => {
        const state = get();
        // Need organization type and role selected
        if (!state.organizationType) return false;
        if (!state.role) return false;
        // If role is "other", also need customRole filled
        if (state.role === 'other' && !state.customRole.trim()) return false;
        return true;
      },

      canProceedToStep4: () => {
        const state = get();
        // If already authenticated, can proceed
        if (state.isAuthenticated) return true;
        // If not authenticated, need email
        if (!state.email.trim()) return false;
        return true;
      },

      reset: () => set(initialState),
    }),
    {
      name: 'quick-design-request',
      partialize: (state) => ({
        // Don't persist files or URLs (they can't be serialized properly)
        designId: state.designId,
        designSlug: state.designSlug,
        designName: state.designName,
        sportId: state.sportId,
        sportSlug: state.sportSlug,
        sportName: state.sportName,
        teamName: state.teamName,
        primaryColor: state.primaryColor,
        secondaryColor: state.secondaryColor,
        accentColor: state.accentColor,
        organizationType: state.organizationType,
        additionalSpecifications: state.additionalSpecifications,
        email: state.email,
        role: state.role,
        customRole: state.customRole,
        currentStep: state.currentStep,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
