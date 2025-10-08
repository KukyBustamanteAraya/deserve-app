import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TeamColors = {
  primary: string;
  secondary: string;
  accent: string;
};

export type ApparelKey = 'jersey' | 'shorts' | 'socks' | 'jacket' | 'pants' | 'bag';

export type SelectedDesign = {
  slug: string;
  name: string;
  sport: string;
  images: string[];
};

export type UniformDetails = {
  sleeve: 'short' | 'long';
  neck: 'crew' | 'v' | 'polo';
  fit: 'athletic' | 'loose';
};

export type LogoPlacements = {
  front: boolean;
  back: boolean;
  sleeveLeft: boolean;
  sleeveRight: boolean;
};

export type BuilderState = {
  selectedSport?: string;
  selectedDesign?: SelectedDesign;
  teamColors: TeamColors;
  selectedApparel: Record<ApparelKey, boolean>;
  userType?: 'player' | 'manager';
  logoUrl?: string;
  teamName: string;
  uniformDetails: UniformDetails;
  logoPlacements: LogoPlacements;
  namesNumbers: boolean;

  // Actions
  setSport: (sport: string) => void;
  setDesign: (design: SelectedDesign | undefined) => void;
  setTeamColors: (colors: Partial<TeamColors>) => void;
  toggleApparel: (key: ApparelKey, value?: boolean) => void;
  setUserType: (type: 'player' | 'manager') => void;
  setLogoUrl: (url?: string) => void;
  setTeamName: (name: string) => void;
  setUniformDetails: (details: Partial<UniformDetails>) => void;
  toggleLogoPlacement: (key: keyof LogoPlacements) => void;
  setNamesNumbers: (value: boolean) => void;
  reset: () => void;
};

const defaultColors: TeamColors = {
  primary: '#e21c21',
  secondary: '#000000',
  accent: '#000000',
};

const defaultApparel: Record<ApparelKey, boolean> = {
  jersey: true, // Jersey is selected by default
  shorts: false,
  socks: false,
  jacket: false,
  pants: false,
  bag: false,
};

export const useBuilderState = create<BuilderState>()(
  persist(
    (set) => ({
      // Initial state
      selectedSport: undefined,
      selectedDesign: undefined,
      teamColors: defaultColors,
      selectedApparel: defaultApparel,
      userType: undefined,
      logoUrl: undefined,
      teamName: 'Mi Equipo',
      uniformDetails: {
        sleeve: 'short',
        neck: 'crew',
        fit: 'athletic',
      },
      logoPlacements: {
        front: false,
        back: false,
        sleeveLeft: false,
        sleeveRight: false,
      },
      namesNumbers: false,

      // Actions
      setSport: (sport: string) =>
        set({ selectedSport: sport }),

      setDesign: (design: SelectedDesign | undefined) =>
        set({ selectedDesign: design }),

      setTeamColors: (colors: Partial<TeamColors>) =>
        set((state) => ({
          teamColors: { ...state.teamColors, ...colors },
        })),

      toggleApparel: (key: ApparelKey, value?: boolean) =>
        set((state) => ({
          selectedApparel: {
            ...state.selectedApparel,
            [key]: value !== undefined ? value : !state.selectedApparel[key],
          },
        })),

      setUserType: (type: 'player' | 'manager') =>
        set({ userType: type }),

      setLogoUrl: (url?: string) =>
        set({ logoUrl: url }),

      setTeamName: (name: string) =>
        set({ teamName: name }),

      setUniformDetails: (details: Partial<UniformDetails>) =>
        set((state) => ({
          uniformDetails: { ...state.uniformDetails, ...details },
        })),

      toggleLogoPlacement: (key: keyof LogoPlacements) =>
        set((state) => ({
          logoPlacements: {
            ...state.logoPlacements,
            [key]: !state.logoPlacements[key],
          },
        })),

      setNamesNumbers: (value: boolean) =>
        set({ namesNumbers: value }),

      reset: () =>
        set({
          selectedSport: undefined,
          selectedDesign: undefined,
          teamColors: defaultColors,
          selectedApparel: defaultApparel,
          userType: undefined,
          logoUrl: undefined,
          teamName: 'Mi Equipo',
          uniformDetails: {
            sleeve: 'short',
            neck: 'crew',
            fit: 'athletic',
          },
          logoPlacements: {
            front: false,
            back: false,
            sleeveLeft: false,
            sleeveRight: false,
          },
          namesNumbers: false,
        }),
    }),
    {
      name: 'deserve-builder-state', // sessionStorage key
      storage: {
        getItem: (name) => {
          const str = sessionStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name, value) => {
          sessionStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name) => sessionStorage.removeItem(name),
      },
    }
  )
);
