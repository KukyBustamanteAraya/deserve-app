import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type GenderCategory = 'male' | 'female' | 'both';
export type MockupPreference = 'home' | 'away' | 'both';

export interface Team {
  id?: string; // Undefined if newly created (not saved yet)
  name: string;
  slug?: string;
  sport_id?: number; // ✅ NEW: Track sport for multi-sport support
  sport_name?: string; // ✅ NEW: Track sport name
  coach?: string;
  player_count?: number;
  isNew: boolean; // Flag to know if we need to create it
  gender_category?: 'male' | 'female' | 'unisex' | null; // ✅ NEW: Track team gender
  colors?: {
    primary?: string;
    secondary?: string;
    tertiary?: string; // Backwards compatibility
    accent?: string;   // Preferred name for third color
  };
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  category: string;
  price_clp: number; // ✅ FIXED: Database stores prices in full Chilean Pesos (not cents)
  product_type_slug?: string;
  icon_url?: string;
  sport_ids?: number[];
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
  // ========================================================================
  // INSTITUTION CONTEXT
  // ========================================================================
  institutionId: string | null;
  institutionSlug: string | null;

  // ========================================================================
  // BULK ORDER SUPPORT (NEW)
  // ========================================================================
  isBulkOrder: boolean; // TRUE = multi-team order, FALSE = single-team order
  bulkOrderId: string | null; // UUID linking all design requests in a bulk order

  // ========================================================================
  // STEP 1A: SPORT (BACKWARD COMPATIBLE)
  // ========================================================================
  // NOTE: For multi-sport orders, this will be set to the first team's sport
  // Individual team sports are tracked in Team.sport_id
  sport_id: number | null;
  sport_name: string | null;

  // ========================================================================
  // STEP 1B: TEAMS (ENHANCED FOR MULTI-SPORT)
  // ========================================================================
  selectedTeams: Team[]; // Can now include teams from different sports

  // ========================================================================
  // STEP 2: GENDER (BACKWARD COMPATIBLE - DEPRECATED FOR BULK ORDERS)
  // ========================================================================
  // NOTE: For bulk orders, gender is determined per-team automatically
  gender_category: GenderCategory | null;
  both_config: BothConfig | null;

  // ========================================================================
  // STEP 3: PRODUCTS
  // ========================================================================
  // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
  selectedProducts: {
    male?: Product[];
    female?: Product[];
  };

  // ✅ NEW: Team-based product selection (for multi-team orders)
  // Key: teamId, Value: Array of products for that team
  teamProducts: Record<string, Product[]>;

  // ========================================================================
  // STEP 4: DESIGNS
  // ========================================================================
  // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
  productDesigns: {
    male?: Record<string, Design[]>; // productId -> designs
    female?: Record<string, Design[]>;
  };

  // ✅ NEW: Team-based design selection (for multi-team orders)
  // Key: teamId -> productId -> designs
  teamProductDesigns: Record<string, Record<string, Design[]>>;

  // ✅ NEW: Design Suggestion Features
  favoriteDesigns: Design[]; // User's favorite designs (max 3)
  applyDesignToAll: boolean; // Flag: apply selected design to all products?

  // ========================================================================
  // STEP 5: COLOR CUSTOMIZATION
  // ========================================================================
  // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
  colorCustomization: {
    male: ColorCustomization;
    female?: ColorCustomization;
  };

  // ✅ NEW: Base colors + optional overrides (for multi-team orders)
  baseColors: ColorCustomization; // Default colors for all teams/products
  colorOverrides: Record<string, ColorCustomization>; // Key: teamId+productId -> custom colors

  // ========================================================================
  // STEP 6: QUANTITIES / ROSTER ESTIMATES
  // ========================================================================
  // OLD: Gender-based quantities (DEPRECATED)
  quantities: {
    male?: Record<string, number>; // productSlug -> quantity
    female?: Record<string, number>;
  };

  // OLD: Single roster estimate (DEPRECATED)
  estimatedRosterSize: number | { male?: number; female?: number } | null;

  // ✅ NEW: Per-team roster estimates (for multi-team orders)
  // Key: teamId, Value: roster count for that team
  teamRosterEstimates: Record<string, number>;

  // ========================================================================
  // MOCKUP PREFERENCES
  // ========================================================================
  mockupPreference: MockupPreference;

  // ========================================================================
  // COMPUTED VALUES
  // ========================================================================
  totalItems: number;
  estimatedCost: number;
  teamCount: number; // ✅ NEW: Number of teams in the order
  sportCount: number; // ✅ NEW: Number of unique sports in the order

  // ========================================================================
  // ACTIONS - INSTITUTION CONTEXT
  // ========================================================================
  setInstitutionContext: (id: string, slug: string) => void;

  // ========================================================================
  // ACTIONS - BULK ORDER
  // ========================================================================
  setIsBulkOrder: (isBulk: boolean) => void;
  setBulkOrderId: (id: string | null) => void;
  generateBulkOrderId: () => void;

  // ========================================================================
  // ACTIONS - STEP 1A: SPORT
  // ========================================================================
  setSport: (id: number, name: string) => void;

  // ========================================================================
  // ACTIONS - STEP 1B: TEAMS
  // ========================================================================
  setSelectedTeams: (teams: Team[]) => void;
  addTeam: (team: Team) => void;
  removeTeam: (index: number) => void;
  updateTeam: (index: number, updates: Partial<Team>) => void;

  // ========================================================================
  // ACTIONS - STEP 2: GENDER (DEPRECATED - kept for backward compatibility)
  // ========================================================================
  setGenderCategory: (category: GenderCategory) => void;
  setBothConfig: (config: BothConfig) => void;

  // ========================================================================
  // ACTIONS - STEP 3: PRODUCTS
  // ========================================================================
  // OLD: Gender-based (DEPRECATED)
  setProductsForGender: (gender: 'male' | 'female', products: Product[]) => void;

  // ✅ NEW: Team-based
  setProductsForTeam: (teamId: string, products: Product[]) => void;
  getProductsForTeam: (teamId: string) => Product[];

  // ========================================================================
  // ACTIONS - STEP 4: DESIGNS
  // ========================================================================
  // OLD: Gender-based (DEPRECATED)
  setDesignsForProduct: (gender: 'male' | 'female', productId: string, designs: Design[]) => void;

  // ✅ NEW: Team-based
  setDesignsForTeamProduct: (teamId: string, productId: string, designs: Design[]) => void;
  getDesignsForTeamProduct: (teamId: string, productId: string) => Design[];

  // ✅ NEW: Design suggestion actions
  setFavoriteDesigns: (designs: Design[]) => void;
  addFavoriteDesign: (design: Design) => void;
  removeFavoriteDesign: (designId: string) => void;
  setApplyDesignToAll: (apply: boolean) => void;
  applyDesignToAllProducts: (design: Design) => void; // Apply selected design to all team products

  // ========================================================================
  // ACTIONS - STEP 5: COLOR CUSTOMIZATION
  // ========================================================================
  // OLD: Gender-based (DEPRECATED)
  setColorCustomization: (customization: any) => void;

  // ✅ NEW: Base colors + overrides
  setBaseColors: (colors: ColorCustomization) => void;
  setColorOverride: (teamId: string, productId: string, colors: ColorCustomization) => void;
  removeColorOverride: (teamId: string, productId: string) => void;
  getColorsForTeamProduct: (teamId: string, productId: string) => ColorCustomization;

  // ========================================================================
  // ACTIONS - STEP 6: QUANTITIES / ROSTER ESTIMATES
  // ========================================================================
  // OLD: Gender-based (DEPRECATED)
  setQuantitiesForProduct: (gender: 'male' | 'female', productId: string, quantities: Record<string, number>) => void;
  setQuantities: (quantities: { male?: Record<string, number>; female?: Record<string, number> }) => void;
  setEstimatedRosterSize: (size: number | { male?: number; female?: number } | null) => void;

  // ✅ NEW: Per-team roster estimates
  setRosterEstimateForTeam: (teamId: string, estimate: number) => void;
  getRosterEstimateForTeam: (teamId: string) => number;

  // ========================================================================
  // ACTIONS - MOCKUP PREFERENCE
  // ========================================================================
  setMockupPreference: (preference: MockupPreference) => void;

  // ========================================================================
  // ACTIONS - UTILITY
  // ========================================================================
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
      // ========================================================================
      // INITIAL STATE
      // ========================================================================
      institutionId: null,
      institutionSlug: null,
      isBulkOrder: false,
      bulkOrderId: null,
      sport_id: null,
      sport_name: null,
      selectedTeams: [],
      gender_category: null,
      both_config: null,

      // OLD: Gender-based (DEPRECATED)
      selectedProducts: {},
      productDesigns: {},
      colorCustomization: {
        male: defaultColorCustomization,
      },
      quantities: {},
      estimatedRosterSize: null,

      // NEW: Team-based
      teamProducts: {},
      teamProductDesigns: {},
      favoriteDesigns: [],
      applyDesignToAll: false,
      baseColors: defaultColorCustomization,
      colorOverrides: {},
      teamRosterEstimates: {},

      // Other
      mockupPreference: 'both',
      totalItems: 0,
      estimatedCost: 0,
      teamCount: 0,
      sportCount: 0,

      // ========================================================================
      // ACTIONS - INSTITUTION CONTEXT
      // ========================================================================
      setInstitutionContext: (id, slug) =>
        set({ institutionId: id, institutionSlug: slug }),

      // ========================================================================
      // ACTIONS - BULK ORDER
      // ========================================================================
      setIsBulkOrder: (isBulk) =>
        set({ isBulkOrder: isBulk }),

      setBulkOrderId: (id) =>
        set({ bulkOrderId: id }),

      generateBulkOrderId: () => {
        const bulkOrderId = crypto.randomUUID();
        set({ bulkOrderId, isBulkOrder: true });
      },

      // ========================================================================
      // ACTIONS - SPORT
      // ========================================================================
      setSport: (id, name) =>
        set({ sport_id: id, sport_name: name }),

      // ========================================================================
      // ACTIONS - TEAMS
      // ========================================================================
      setSelectedTeams: (teams) => {
        const sportIds = new Set(teams.map(t => t.sport_id).filter(Boolean));
        set({
          selectedTeams: teams,
          teamCount: teams.length,
          sportCount: sportIds.size,
        });
      },

      addTeam: (team) =>
        set((state) => {
          const newTeams = [...state.selectedTeams, team];
          const sportIds = new Set(newTeams.map(t => t.sport_id).filter(Boolean));
          return {
            selectedTeams: newTeams,
            teamCount: newTeams.length,
            sportCount: sportIds.size,
          };
        }),

      removeTeam: (index) =>
        set((state) => {
          const newTeams = state.selectedTeams.filter((_, i) => i !== index);
          const sportIds = new Set(newTeams.map(t => t.sport_id).filter(Boolean));
          return {
            selectedTeams: newTeams,
            teamCount: newTeams.length,
            sportCount: sportIds.size,
          };
        }),

      updateTeam: (index, updates) =>
        set((state) => ({
          selectedTeams: state.selectedTeams.map((team, i) =>
            i === index ? { ...team, ...updates } : team
          )
        })),

      // ========================================================================
      // ACTIONS - GENDER (DEPRECATED)
      // ========================================================================
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

      // ========================================================================
      // ACTIONS - PRODUCTS
      // ========================================================================
      // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
      setProductsForGender: (gender, products) =>
        set((state) => ({
          selectedProducts: {
            ...state.selectedProducts,
            [gender]: products,
          },
        })),

      // ✅ NEW: Team-based
      setProductsForTeam: (teamId, products) =>
        set((state) => ({
          teamProducts: {
            ...state.teamProducts,
            [teamId]: products,
          },
        })),

      getProductsForTeam: (teamId) => {
        const state = get();
        return state.teamProducts[teamId] || [];
      },

      // ========================================================================
      // ACTIONS - DESIGNS
      // ========================================================================
      // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
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

      // ✅ NEW: Team-based
      setDesignsForTeamProduct: (teamId, productId, designs) =>
        set((state) => ({
          teamProductDesigns: {
            ...state.teamProductDesigns,
            [teamId]: {
              ...(state.teamProductDesigns[teamId] || {}),
              [productId]: designs,
            },
          },
        })),

      getDesignsForTeamProduct: (teamId, productId) => {
        const state = get();
        return state.teamProductDesigns[teamId]?.[productId] || [];
      },

      // ✅ NEW: Design suggestion actions
      setFavoriteDesigns: (designs) =>
        set({ favoriteDesigns: designs.slice(0, 3) }), // Max 3 favorites

      addFavoriteDesign: (design) =>
        set((state) => {
          const favorites = [...state.favoriteDesigns];
          if (favorites.length < 3 && !favorites.find(d => d.id === design.id)) {
            favorites.push(design);
          }
          return { favoriteDesigns: favorites };
        }),

      removeFavoriteDesign: (designId) =>
        set((state) => ({
          favoriteDesigns: state.favoriteDesigns.filter(d => d.id !== designId)
        })),

      setApplyDesignToAll: (apply) =>
        set({ applyDesignToAll: apply }),

      applyDesignToAllProducts: (design) => {
        const state = get();
        const newTeamProductDesigns = { ...state.teamProductDesigns };

        // Apply the design to all products for all teams
        state.selectedTeams.forEach(team => {
          if (!team.id) return;

          const teamProducts = state.teamProducts[team.id] || [];
          const teamDesigns: Record<string, Design[]> = {};

          teamProducts.forEach(product => {
            teamDesigns[product.id] = [design];
          });

          newTeamProductDesigns[team.id] = teamDesigns;
        });

        set({
          teamProductDesigns: newTeamProductDesigns,
          applyDesignToAll: true,
        });
      },

      // ========================================================================
      // ACTIONS - COLOR CUSTOMIZATION
      // ========================================================================
      // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
      setColorCustomization: (customization) =>
        set({ colorCustomization: customization }),

      // ✅ NEW: Base colors + overrides
      setBaseColors: (colors) =>
        set({ baseColors: colors }),

      setColorOverride: (teamId, productId, colors) =>
        set((state) => ({
          colorOverrides: {
            ...state.colorOverrides,
            [`${teamId}:${productId}`]: colors,
          },
        })),

      removeColorOverride: (teamId, productId) =>
        set((state) => {
          const newOverrides = { ...state.colorOverrides };
          delete newOverrides[`${teamId}:${productId}`];
          return { colorOverrides: newOverrides };
        }),

      getColorsForTeamProduct: (teamId, productId) => {
        const state = get();
        const overrideKey = `${teamId}:${productId}`;
        return state.colorOverrides[overrideKey] || state.baseColors;
      },

      // ========================================================================
      // ACTIONS - QUANTITIES / ROSTER ESTIMATES
      // ========================================================================
      // OLD: Gender-based (DEPRECATED - kept for backward compatibility)
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

      setEstimatedRosterSize: (size) =>
        set({ estimatedRosterSize: size }),

      // ✅ NEW: Per-team roster estimates
      setRosterEstimateForTeam: (teamId, estimate) =>
        set((state) => ({
          teamRosterEstimates: {
            ...state.teamRosterEstimates,
            [teamId]: estimate,
          },
        })),

      getRosterEstimateForTeam: (teamId) => {
        const state = get();
        return state.teamRosterEstimates[teamId] || 0;
      },

      // ========================================================================
      // ACTIONS - MOCKUP PREFERENCE
      // ========================================================================
      setMockupPreference: (preference) =>
        set({ mockupPreference: preference }),

      // ========================================================================
      // ACTIONS - UTILITY
      // ========================================================================
      calculateTotals: () => {
        const state = get();
        let totalItems = 0;
        let estimatedCost = 0;

        // Calculate from team roster estimates
        if (state.isBulkOrder) {
          // NEW: Multi-team calculation
          Object.entries(state.teamRosterEstimates).forEach(([teamId, rosterSize]) => {
            const teamProducts = state.teamProducts[teamId] || [];
            const teamItemCount = rosterSize * teamProducts.length;
            totalItems += teamItemCount;
          });
        } else {
          // OLD: Gender-based calculation (backward compatibility)
          if (state.quantities.male) {
            Object.values(state.quantities.male).forEach(qty => {
              totalItems += qty || 0;
            });
          }

          if (state.quantities.female) {
            Object.values(state.quantities.female).forEach(qty => {
              totalItems += qty || 0;
            });
          }
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
          isBulkOrder: false,
          bulkOrderId: null,
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
          estimatedRosterSize: null,
          teamProducts: {},
          teamProductDesigns: {},
          favoriteDesigns: [],
          applyDesignToAll: false,
          baseColors: defaultColorCustomization,
          colorOverrides: {},
          teamRosterEstimates: {},
          mockupPreference: 'both',
          totalItems: 0,
          estimatedCost: 0,
          teamCount: 0,
          sportCount: 0,
        }),

      resetWizard: () =>
        set({
          institutionId: null,
          institutionSlug: null,
          isBulkOrder: false,
          bulkOrderId: null,
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
          estimatedRosterSize: null,
          teamProducts: {},
          teamProductDesigns: {},
          favoriteDesigns: [],
          applyDesignToAll: false,
          baseColors: defaultColorCustomization,
          colorOverrides: {},
          teamRosterEstimates: {},
          mockupPreference: 'both',
          totalItems: 0,
          estimatedCost: 0,
          teamCount: 0,
          sportCount: 0,
        }),
    }),
    {
      name: 'design-request-wizard',
      partialize: (state) => ({
        // Persist everything except computed values
        institutionId: state.institutionId,
        institutionSlug: state.institutionSlug,
        isBulkOrder: state.isBulkOrder,
        bulkOrderId: state.bulkOrderId,
        sport_id: state.sport_id,
        sport_name: state.sport_name,
        selectedTeams: state.selectedTeams,
        gender_category: state.gender_category,
        both_config: state.both_config,
        selectedProducts: state.selectedProducts,
        productDesigns: state.productDesigns,
        colorCustomization: state.colorCustomization,
        quantities: state.quantities,
        estimatedRosterSize: state.estimatedRosterSize,
        teamProducts: state.teamProducts,
        teamProductDesigns: state.teamProductDesigns,
        favoriteDesigns: state.favoriteDesigns,
        applyDesignToAll: state.applyDesignToAll,
        baseColors: state.baseColors,
        colorOverrides: state.colorOverrides,
        teamRosterEstimates: state.teamRosterEstimates,
        mockupPreference: state.mockupPreference,
      }),
    }
  )
);
