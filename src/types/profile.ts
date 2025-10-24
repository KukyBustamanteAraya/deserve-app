// Enhanced Profile System Types
// These types match the database JSONB schemas

// ============================================================================
// USER TYPE CLASSIFICATION
// ============================================================================

export type UserType = 'player' | 'manager' | 'athletic_director' | 'hybrid';

// ============================================================================
// ATHLETIC PROFILE (For Players)
// ============================================================================

// Import size type from constants (single source of truth)
import type { SizeOption } from '@/constants/sizing';
export type { SizeOption };

export type BreathabilityOption = 'standard' | 'high';
export type FitOption = 'regular' | 'slim' | 'relaxed';

export interface FabricPreferences {
  breathability?: BreathabilityOption;
  fit?: FitOption;
}

export interface Measurements {
  height_cm?: number;  // 100-250
  weight_kg?: number;  // 30-200
  chest_cm?: number;   // 50-150
}

export interface AthleticProfile {
  sports?: string[];  // Array of sports they play (e.g., ['Fútbol', 'Básquetbol'])
  primary_sport?: string;  // Their main sport
  default_size?: SizeOption;
  default_positions?: string[];  // Sport-agnostic position names
  preferred_jersey_number?: string;  // Max 3 characters
  fabric_preferences?: FabricPreferences;
  measurements?: Measurements;
  gender?: 'male' | 'female' | 'other';  // Player gender
}

// ============================================================================
// MANAGER PROFILE (For Managers/Athletic Directors)
// ============================================================================

export type OrganizationType = 'school' | 'club' | 'university' | 'pro' | 'other';

export interface ShippingAddress {
  label: string;
  street: string;
  city: string;
  region: string;
  postal_code?: string;
  country: string;  // Default: 'Chile'
  is_primary: boolean;
}

export interface BillingInfo {
  tax_id?: string;
  billing_email?: string;
}

export interface PrimaryContact {
  name?: string;
  phone?: string;
  email?: string;
}

export interface ManagerProfile {
  organization_name?: string;
  organization_type?: OrganizationType;
  shipping_addresses?: ShippingAddress[];
  billing_info?: BillingInfo;
  primary_contact?: PrimaryContact;
}

// ============================================================================
// USER PREFERENCES
// ============================================================================

export type Language = 'es' | 'en';
export type Theme = 'light' | 'dark' | 'auto';
export type EmailFrequency = 'instant' | 'daily' | 'weekly' | 'never';

export interface NotificationPreferences {
  email?: boolean;
  push?: boolean;
  sms?: boolean;
  order_updates?: boolean;
  design_updates?: boolean;
  team_updates?: boolean;
}

export interface UserPreferences {
  notifications?: NotificationPreferences;
  language?: Language;
  theme?: Theme;
  email_frequency?: EmailFrequency;
}

// ============================================================================
// COMPLETE PROFILE
// ============================================================================

export interface EnhancedProfile {
  id: string;
  full_name?: string;
  avatar_url?: string;
  is_admin: boolean;

  // New enhanced profile fields
  user_type?: UserType | null;
  athletic_profile?: AthleticProfile;
  manager_profile?: ManagerProfile;
  preferences?: UserPreferences;

  created_at: string;
  updated_at: string;
}

// ============================================================================
// PROFILE COMPLETION STATUS
// ============================================================================

export interface ProfileCompletionStatus {
  overall: number;  // 0-100 percentage
  sections: {
    basic: boolean;  // name, avatar
    role: boolean;   // user_type set
    athletic: boolean;  // athletic_profile filled (if player/hybrid)
    manager: boolean;   // manager_profile filled (if manager/AD/hybrid)
    preferences: boolean;  // preferences set
  };
}

// Helper function to calculate completion
export function calculateProfileCompletion(profile: EnhancedProfile): ProfileCompletionStatus {
  const sections = {
    basic: !!(profile.full_name && profile.avatar_url),
    role: !!profile.user_type,
    athletic: false,
    manager: false,
    preferences: !!profile.preferences?.language,
  };

  // Check athletic profile completion (if player or hybrid)
  if (profile.user_type === 'player' || profile.user_type === 'hybrid') {
    const athletic = profile.athletic_profile || {};
    sections.athletic = !!(athletic.default_size && athletic.default_positions?.length);
  } else {
    sections.athletic = true; // Not applicable, mark as complete
  }

  // Check manager profile completion (if manager, AD, or hybrid)
  if (profile.user_type === 'manager' || profile.user_type === 'athletic_director' || profile.user_type === 'hybrid') {
    const manager = profile.manager_profile || {};
    sections.manager = !!(manager.organization_name && manager.shipping_addresses?.length);
  } else {
    sections.manager = true; // Not applicable, mark as complete
  }

  // Calculate overall percentage
  const totalSections = Object.values(sections).length;
  const completedSections = Object.values(sections).filter(Boolean).length;
  const overall = Math.round((completedSections / totalSections) * 100);

  return { overall, sections };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface UpdateUserTypeRequest {
  user_type: UserType;
}

export interface UpdateUserTypeResponse {
  user_type: UserType;
}

export interface UpdateAthleticProfileRequest extends Partial<AthleticProfile> {}

export interface UpdateAthleticProfileResponse {
  athletic_profile: AthleticProfile;
}

export interface UpdateManagerProfileRequest extends Partial<ManagerProfile> {}

export interface UpdateManagerProfileResponse {
  manager_profile: ManagerProfile;
}

export interface UpdatePreferencesRequest extends Partial<UserPreferences> {}

export interface UpdatePreferencesResponse {
  preferences: UserPreferences;
}
