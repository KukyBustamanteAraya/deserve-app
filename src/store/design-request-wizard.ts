import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GenderCategory = 'male' | 'female' | 'both';

export interface Team {
  id?: string; // Undefined if newly created (not saved yet)
  name: string;
  slug?: string;
  coach?: string;
  player_count?: number;
  isNew: boolean; // Flag to know if we need to create it
  colors?: {
    primary: string;
    secondary: string;
    tertiary?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_cents: number;
  product_type_slug: string;
}

export interface Design {
  id: string;
  name: string;
  slug: string;
  mockup_url?: string;
  style_tags?: string[];
  featured?: boolean;
}

export interface ColorCustomization {
  primary_color: string;
  secondary_color: string;
  tertiary_color: string;
  color_hierarchy: 'primary' | 'secondary' | 'tertiary';
}

export interface BothConfig {
  same_design: boolean;
  same_colors: boolean;
}

interface DesignRequestWizardState {
  // Institution context
  institutionId: string | null;
  institutionSlug: string | null;

  // Step 1A: Sport
  sport_id: number | null;
  sport_name: string | null;

  // Step 1B: Teams
  selectedTeams: Team[];

  // Step 2: Gender
  gender_category: GenderCategory | null;
  both_config: BothConfig | null;

  // Step 3: Products (gender-aware)
  selectedProducts: {
    male?: Product[];
    female?: Product[];
  };

  // Step 4: Designs (gender-aware)
  productDesigns: {
    male?: Record<string, Design[]>; // productId -> designs
    female?: Record<string, Design[]>;
  };

  // Step 5: Color Customization (gender-aware)
  colorCustomization: {
    male: ColorCustomization;
    female?: ColorCustomization;
  };

  // Step 6: Quantities (gender-aware, flat structure - no sizes)
  quantities: {
    male?: Record<string, number>; // productSlug -> quantity
    female?: Record<string, number>;
  };

  // Computed values
  totalItems: number;
  estimatedCost: number;

  // Actions
  setInstitutionContext: (id: string, slug: string) => void;

  // Step 1A: Sport actions
  setSport: (id: number, name: string) => void;

  // Step 1B: Teams actions
  setSelectedTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (index: number) => void;
  updateTeam: (index: number, updates: Partial<Team>) => void;

  // Step 2: Gender actions
  setGenderCategory: (category: GenderCategory) => void;
  setBothConfig: (config: BothConfig) => void;

  // Step 3: Products actions
  setProductsForGender: (gender: 'male' | 'female', products: Product[]) => void;

  // Step 4: Designs actions
  setDesignsForProduct: (gender: 'male' | 'female', productId: string, designs: Design[]) => void;

  // Step 5: Color customization actions
  setColorCustomization: (customization: any) => void;

  // Step 6: Quantities actions
  setQuantitiesForProduct: (gender: 'male' | 'female', productId: string, quantities: Record<string, number>) => void;
  setQuantities: (quantities: { male?: Record<string, number>; female?: Record<string, number> }) => void;

  // Utility actions
  reset: () => void;
  calculateTotals: () => void;
  resetWizard: () => void;
}

const defaultColorCustomization: ColorCustomization = {
  primary_color: '#e21c21',
  secondary_color: '#ffffff',
  tertiary_color: '#000000',
  color_hierarchy: 'primary',
};

export const useDesignRequestWizard = create<DesignRequestWizardState>()(
  persist(
    (set, get) => ({
      // Initial state
      institutionId: null,
      institutionSlug: null,
      sport_id: null,
      sport_name: null,
      selectedTeams: [],
      gender_category: null,
      both_config: null,
      selectedProducts: {},
      productDesigns: {},
      colorCustomization: {
        male: defaultColorCustomization,
      },
      quantities: {},
      totalItems: 0,
      estimatedCost: 0,

      // Actions
      setInstitutionContext: (id, slug) =>
        set({ institutionId: id, institutionSlug: slug }),

      setSport: (id, name) =>
        set({ sport_id: id, sport_name: name }),

      setSelectedTeams: (teams) =>
        set({ selectedTeams: teams }),

      addTeam: (team) =>
        set((state) => ({
          selectedTeams: [...state.selectedTeams, team]
        })),

      removeTeam: (index) =>
        set((state) => ({
          selectedTeams: state.selectedTeams.filter((_, i) => i !== index)
        })),

      updateTeam: (index, updates) =>
        set((state) => ({
          selectedTeams: state.selectedTeams.map((team, i) =>
            i === index ? { ...team, ...updates } : team
          )
        })),

      setGenderCategory: (category) => {
        set({ gender_category: category });
        // Initialize color customization for female if "both"
        if (category === 'both') {
          set((state) => ({
            colorCustomization: {
              male: state.colorCustomization.male,
              female: defaultColorCustomization,
            },
          }));
        }
      },

      setBothConfig: (config) =>
        set({ both_config: config }),

      setProductsForGender: (gender, products) =>
        set((state) => ({
          selectedProducts: {
            ...state.selectedProducts,
            [gender]: products,
          },
        })),

      setDesignsForProduct: (gender, productId, designs) =>
        set((state) => ({
          productDesigns: {
            ...state.productDesigns,
            [gender]: {
              ...(state.productDesigns[gender] || {}),
              [productId]: designs,
            },
          },
        })),

      setColorCustomization: (customization) =>
        set({ colorCustomization: customization }),

      setQuantitiesForProduct: (gender, productId, quantities) =>
        set((state) => ({
          quantities: {
            ...state.quantities,
            [gender]: {
              ...(state.quantities[gender] || {}),
              [productId]: quantities,
            },
          },
        })),

      setQuantities: (quantities) =>
        set({ quantities }),

      calculateTotals: () => {
        const state = get();
        let totalItems = 0;
        let estimatedCost = 0;

        // Calculate from male quantities (flat structure now)
        if (state.quantities.male) {
          Object.values(state.quantities.male).forEach(qty => {
            totalItems += qty || 0;
          });
        }

        // Calculate from female quantities (flat structure now)
        if (state.quantities.female) {
          Object.values(state.quantities.female).forEach(qty => {
            totalItems += qty || 0;
          });
        }

        // Estimate cost (will be more accurate once we have actual products)
        // Rough estimate: $15,000 CLP per item
        estimatedCost = totalItems * 15000;

        set({ totalItems, estimatedCost });
      },

      reset: () =>
        set({
          institutionId: null,
          institutionSlug: null,
          sport_id: null,
          sport_name: null,
          selectedTeams: [],
          gender_category: null,
          both_config: null,
          selectedProducts: {},
          productDesigns: {},
          colorCustomization: {
            male: defaultColorCustomization,
          },
          quantities: {},
          totalItems: 0,
          estimatedCost: 0,
        }),

      resetWizard: () =>
        set({
          institutionId: null,
          institutionSlug: null,
          sport_id: null,
          sport_name: null,
          selectedTeams: [],
          gender_category: null,
          both_config: null,
          selectedProducts: {},
          productDesigns: {},
          colorCustomization: {
            male: defaultColorCustomization,
          },
          quantities: {},
          totalItems: 0,
          estimatedCost: 0,
        }),
    }),
    {
      name: 'design-request-wizard',
      partialize: (state) => ({
        // Persist everything except computed values
        institutionId: state.institutionId,
        institutionSlug: state.institutionSlug,
        sport_id: state.sport_id,
        sport_name: state.sport_name,
        selectedTeams: state.selectedTeams,
        gender_category: state.gender_category,
        both_config: state.both_config,
        selectedProducts: state.selectedProducts,
        productDesigns: state.productDesigns,
        colorCustomization: state.colorCustomization,
        quantities: state.quantities,
      }),
    }
  )
);
