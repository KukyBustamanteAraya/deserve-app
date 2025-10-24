// Types for the sizing calculator system - V2

// Import size type from constants (single source of truth)
import type { SizeValue } from '@/constants/sizing';
export type { SizeValue };

export type Gender = 'boys' | 'girls' | 'men' | 'women' | 'unisex';

export type FitPreference = 'slim' | 'regular' | 'relaxed';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'ESCALATE';

export type JerseyFitFeeling = 'tight' | 'perfect' | 'loose';

/**
 * Size chart row from database
 */
export interface SizeChartRow {
  size: SizeValue;
  height_min_cm: number;
  height_max_cm: number;
  chest_width_cm: number;
  jersey_length_cm: number;
  shorts_length_cm?: number | null;
  sleeve_length_cm?: number | null;
  waist_width_cm?: number | null;
  hip_width_cm?: number | null;
  weight_min_kg?: number | null;
  weight_max_kg?: number | null;
}

/**
 * Complete size chart for a product
 */
export interface SizeChart {
  sport_id: number;
  sport_name: string;
  product_type_slug: string;
  gender: Gender;
  sizes: SizeChartRow[];
}

/**
 * Favorite jersey measurements (optional but recommended)
 */
export interface FavoriteJerseyMeasurements {
  lengthCm: number;
  widthCm: number;
  fitFeeling: JerseyFitFeeling; // How does it fit?
}

/**
 * User input for sizing calculation - V2
 */
export interface SizingInput {
  // Required
  heightCm: number;
  weightKg: number; // Now required for BMI calculation

  // Optional but highly recommended
  favoriteJersey?: FavoriteJerseyMeasurements;

  // Preferences
  fitPreference: FitPreference;

  // Product context
  sportId: number;
  productTypeSlug: string;
  gender: Gender;
}

/**
 * BMI Analysis
 */
export interface BMIAnalysis {
  bmi: number;
  category: 'underweight' | 'normal' | 'athletic' | 'overweight' | 'obese';
  isExtreme: boolean; // BMI < 16 or > 30
  message: string;
}

/**
 * Edge case detected in sizing
 */
export interface EdgeCase {
  type:
    | 'HEIGHT_ABOVE_RANGE'
    | 'HEIGHT_BELOW_RANGE'
    | 'HEIGHT_BETWEEN_RANGES'
    | 'EXTREME_BMI'
    | 'CONFLICTING_MEASUREMENTS'
    | 'EDGE_OF_RANGE'
    | 'UNUSUAL_PROPORTIONS';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  message: string;
  recommendation: 'ORDER' | 'REVIEW_CAREFULLY' | 'CONSIDER_CONTACTING' | 'CONTACT_US' | 'MUST_CONTACT';
}

/**
 * Internal scoring breakdown for debugging - V2
 */
export interface SizeScore {
  size: SizeValue;
  totalScore: number;
  subscores: {
    height: number;           // 0-40 points
    bmi: number;              // 0-20 points
    jerseyLength?: number;    // 0-15 points
    jerseyWidth?: number;     // 0-15 points
    fitPreference?: number;   // -2 to +2 points
  };
  penalties: {
    edgePenalty: number;      // -20 to 0
    conflictPenalty: number;  // -15 to 0
  };
  deltas: {
    heightFromMidpoint: number;
    heightFromRange: number; // 0 if in range, positive if outside
    jerseyLengthDiff?: number;
    jerseyWidthDiff?: number;
  };
  measurements: SizeChartRow;
}

/**
 * Confidence breakdown - V2
 */
export interface ConfidenceBreakdown {
  baseScore: number;        // Height match
  bmiScore: number;         // Body proportion appropriateness
  jerseyScore: number;      // Favorite jersey comparison
  edgePenalty: number;      // Edge case penalties
  conflictPenalty: number;  // Contradicting data
  total: number;            // Final confidence
}

/**
 * Size recommendation result - V2
 */
export interface SizeRecommendation {
  // Primary recommendation
  primary: SizeValue;

  // Alternative size
  alternate: SizeValue;

  // Risk level (determines tone and actions)
  riskLevel: RiskLevel;

  // Confidence score (0-100)
  confidence: number;
  confidenceBreakdown?: ConfidenceBreakdown;

  // Human-readable explanations
  title: string;            // Main heading
  subtitle?: string;        // Subheading
  rationale: string[];      // Why this size?
  warnings?: string[];      // Any concerns

  // Edge cases detected
  edgeCases: EdgeCase[];

  // Actions user should take
  recommendedAction: 'ORDER_NOW' | 'ORDER_WITH_INFO' | 'CONTACT_RECOMMENDED' | 'MUST_CONTACT';

  // Contact info (shown for high risk)
  shouldShowContact: boolean;

  // Full size chart for display
  chart: SizeChartRow[];

  // BMI analysis
  bmiAnalysis?: BMIAnalysis;

  // Debug info (optional, only in development)
  debug?: {
    scores: SizeScore[];
    input: SizingInput;
    allEdgeCases: EdgeCase[];
  };
}

/**
 * Validation result for sizing input
 */
export interface SizingValidation {
  valid: boolean;
  errors: string[];
  warnings?: string[];
}

/**
 * Size chart database model
 */
export interface SizeChartModel {
  id: string;
  sport_id: number;
  product_type_slug: string;
  gender: Gender;
  size: SizeValue;
  height_min_cm: number;
  height_max_cm: number;
  chest_width_cm: number;
  jersey_length_cm: number;
  shorts_length_cm?: number | null;
  sleeve_length_cm?: number | null;
  waist_width_cm?: number | null;
  hip_width_cm?: number | null;
  weight_min_kg?: number | null;
  weight_max_kg?: number | null;
  notes?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Admin size chart management types
 */
export interface CreateSizeChartInput {
  sport_id: number;
  product_type_slug: string;
  gender: Gender;
  size: SizeValue;
  height_min_cm: number;
  height_max_cm: number;
  chest_width_cm: number;
  jersey_length_cm: number;
  shorts_length_cm?: number;
  sleeve_length_cm?: number;
  waist_width_cm?: number;
  hip_width_cm?: number;
  weight_min_kg?: number;
  weight_max_kg?: number;
  notes?: string;
}

export interface UpdateSizeChartInput extends Partial<CreateSizeChartInput> {
  id: string;
}

/**
 * Size chart query parameters
 */
export interface SizeChartQuery {
  sportId?: number;
  productType?: string;
  gender?: Gender;
  isActive?: boolean;
}

/**
 * Jersey analysis result
 */
export interface JerseyAnalysis {
  lengthMatch: boolean;
  widthMatch: boolean;
  lengthDiff: number;
  widthDiff: number;
  score: number;
  message: string;
}
