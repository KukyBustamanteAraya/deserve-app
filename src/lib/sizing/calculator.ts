/**
 * Sizing Calculator V2 - Risk-Based Confidence System
 *
 * Philosophy: Help customers make confident purchasing decisions for custom uniforms
 * that take 3 weeks to make. Prevent costly mistakes by identifying edge cases and
 * providing clear guidance.
 *
 * Scoring System (100 points total):
 * - Height: 40 points (primary factor)
 * - BMI: 20 points (body proportion appropriateness)
 * - Favorite Jersey Length: 15 points (if provided)
 * - Favorite Jersey Width: 15 points (if provided)
 * - Fit Preference: ±2 points adjustment
 * - Edge Penalties: -20 points (for borderline cases)
 * - Conflict Penalties: -15 points (contradicting data)
 */

import type {
  SizingInput,
  SizeChartRow,
  SizeRecommendation,
  SizeScore,
  SizeValue,
  SizingValidation,
  BMIAnalysis,
  EdgeCase,
  RiskLevel,
  ConfidenceBreakdown,
  JerseyAnalysis,
  FavoriteJerseyMeasurements,
  Gender,
} from '@/types/sizing';
import { ALL_SIZES } from '@/constants/sizing';

// Size order for alternate size calculations (imported from constants)
const SIZE_ORDER = ALL_SIZES;

// ============================================================================
// VALIDATION
// ============================================================================

export function validateSizingInput(input: Partial<SizingInput>): SizingValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Required fields
  if (!input.heightCm) {
    errors.push('Height is required');
  } else if (input.heightCm < 120 || input.heightCm > 250) {
    errors.push('Height must be between 120cm and 250cm');
  }

  if (!input.weightKg) {
    errors.push('Weight is required');
  } else if (input.weightKg < 20 || input.weightKg > 200) {
    errors.push('Weight must be between 20kg and 200kg');
  }

  if (!input.sportId) {
    errors.push('Sport ID is required');
  }

  if (!input.productTypeSlug) {
    errors.push('Product type is required');
  }

  if (!input.gender) {
    errors.push('Gender is required');
  }

  if (!input.fitPreference) {
    errors.push('Fit preference is required');
  }

  // Optional favorite jersey validation
  if (input.favoriteJersey) {
    const { lengthCm, widthCm } = input.favoriteJersey;

    if (lengthCm && (lengthCm < 40 || lengthCm > 120)) {
      errors.push('Favorite jersey length must be between 40cm and 120cm');
    }

    if (widthCm && (widthCm < 30 || widthCm > 80)) {
      errors.push('Favorite jersey width must be between 30cm and 80cm');
    }

    // Sanity check: width shouldn't be > height * 0.4
    if (input.heightCm && widthCm && widthCm > input.heightCm * 0.4) {
      warnings.push('Jersey width seems unusually large. Please verify measurement.');
    }
  } else {
    warnings.push('Providing favorite jersey measurements will significantly improve accuracy');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

// ============================================================================
// BMI ANALYSIS
// ============================================================================

function calculateBMI(heightCm: number, weightKg: number): number {
  const heightM = heightCm / 100;
  return weightKg / (heightM * heightM);
}

function analyzeBMI(heightCm: number, weightKg: number, gender: Gender): BMIAnalysis {
  const bmi = calculateBMI(heightCm, weightKg);

  // Youth BMI ranges (12-18 years) - boys/girls
  let category: BMIAnalysis['category'];
  let message: string;

  if (gender === 'boys' || gender === 'girls') {
    if (bmi < 16) {
      category = 'underweight';
      message = 'Significantly below average weight for height';
    } else if (bmi < 17) {
      category = 'underweight';
      message = 'Below average weight for height';
    } else if (bmi < 24) {
      category = 'normal';
      message = 'Healthy weight for height';
    } else if (bmi < 27) {
      category = 'athletic';
      message = 'Above average (could be muscular/athletic)';
    } else if (bmi < 30) {
      category = 'overweight';
      message = 'Above healthy weight range';
    } else {
      category = 'obese';
      message = 'Significantly above healthy weight range';
    }
  } else {
    // Adult ranges (men/women) - if ever needed
    if (bmi < 18.5) category = 'underweight', message = 'Below healthy weight';
    else if (bmi < 25) category = 'normal', message = 'Healthy weight';
    else if (bmi < 28) category = 'athletic', message = 'Above average (may be muscular)';
    else if (bmi < 30) category = 'overweight', message = 'Above healthy weight';
    else category = 'obese', message = 'Significantly above healthy weight';
  }

  const isExtreme = bmi < 16 || bmi > 30;

  return {
    bmi: parseFloat(bmi.toFixed(1)),
    category,
    isExtreme,
    message,
  };
}

// ============================================================================
// PRODUCT-SPECIFIC MEASUREMENTS
// ============================================================================

function getRelevantLength(row: SizeChartRow, productType: string): number {
  if (productType === 'shorts') {
    return row.shorts_length_cm || row.jersey_length_cm;
  }
  if (productType === 'tracksuit-pants') {
    return row.jersey_length_cm; // Pants length stored in jersey_length_cm field
  }
  if (productType === 'tracksuit-jacket') {
    return row.jersey_length_cm;
  }
  // jersey, polo, etc.
  return row.jersey_length_cm;
}

function getRelevantWidth(row: SizeChartRow, productType: string): number {
  if (productType === 'tracksuit-pants' || productType === 'shorts') {
    return row.waist_width_cm || row.chest_width_cm;
  }
  // jersey, jacket, polo
  return row.chest_width_cm;
}

// ============================================================================
// SCORING FUNCTIONS
// ============================================================================

/**
 * Score height match (0-40 points)
 */
function scoreHeight(heightCm: number, sizeRow: SizeChartRow): number {
  const { height_min_cm, height_max_cm } = sizeRow;
  const midpoint = (height_min_cm + height_max_cm) / 2;
  const rangeWidth = height_max_cm - height_min_cm;

  // Within range: 30-40 points based on centeredness
  if (heightCm >= height_min_cm && heightCm <= height_max_cm) {
    const distanceFromCenter = Math.abs(heightCm - midpoint);
    const centeredness = 1 - distanceFromCenter / (rangeWidth / 2);
    return 30 + centeredness * 10; // 30-40 points
  }

  // Outside range: Gentler penalty
  const distanceOut = Math.min(
    Math.abs(heightCm - height_min_cm),
    Math.abs(heightCm - height_max_cm)
  );

  // Gentle penalty for first 5cm, then harsher
  if (distanceOut <= 2) return 25;
  if (distanceOut <= 5) return 15;
  if (distanceOut <= 10) return 5;
  return 0; // Way outside
}

/**
 * Score BMI appropriateness (0-20 points)
 */
function scoreBMI(bmiAnalysis: BMIAnalysis, gender: Gender): number {
  const { bmi, category } = bmiAnalysis;

  // Expected BMI for youth sizing
  const expectedBMI = gender === 'boys' || gender === 'girls'
    ? { min: 17, midpoint: 20, max: 24 }
    : { min: 18.5, midpoint: 22, max: 25 };

  const bmiDiff = Math.abs(bmi - expectedBMI.midpoint);

  if (bmiDiff <= 2) return 20;  // Perfect
  if (bmiDiff <= 4) return 15;  // Normal variance (athletic or slim)
  if (bmiDiff <= 6) return 8;   // Unusual proportions
  return 0;                      // Very unusual - needs consultation
}

/**
 * Analyze favorite jersey fit
 */
function analyzeJerseyFit(
  favoriteJersey: FavoriteJerseyMeasurements,
  sizeRow: SizeChartRow,
  productType: string
): JerseyAnalysis {
  const sizeLength = getRelevantLength(sizeRow, productType);
  const sizeWidth = getRelevantWidth(sizeRow, productType);

  let lengthDiff = sizeLength - favoriteJersey.lengthCm;
  let widthDiff = sizeWidth - favoriteJersey.widthCm;

  // Adjust based on how current jersey fits
  if (favoriteJersey.fitFeeling === 'tight') {
    // User wants bigger, so we want positive diff (our size bigger than their current)
    lengthDiff += 2;
    widthDiff += 2;
  } else if (favoriteJersey.fitFeeling === 'loose') {
    // User wants smaller
    lengthDiff -= 2;
    widthDiff -= 2;
  }

  const lengthMatch = Math.abs(lengthDiff) <= 2;
  const widthMatch = Math.abs(widthDiff) <= 2;

  // Calculate score (0-30 points: 15 for length, 15 for width)
  const lengthScore = Math.max(0, 15 - Math.abs(lengthDiff) * 2);
  const widthScore = Math.max(0, 15 - Math.abs(widthDiff) * 2);
  const score = lengthScore + widthScore;

  let message = '';
  if (lengthMatch && widthMatch) {
    message = 'Excellent match with your favorite jersey';
  } else if (lengthMatch || widthMatch) {
    message = 'Good match with your favorite jersey';
  } else {
    message = 'Different from your favorite jersey';
  }

  return {
    lengthMatch,
    widthMatch,
    lengthDiff,
    widthDiff,
    score,
    message,
  };
}

/**
 * Score all sizes
 */
function scoreSizes(
  input: SizingInput,
  sizeChart: SizeChartRow[],
  bmiAnalysis: BMIAnalysis
): SizeScore[] {
  const scores: SizeScore[] = sizeChart.map((row) => {
    // Height score (0-40)
    const heightScore = scoreHeight(input.heightCm, row);

    // BMI score (0-20)
    const bmiScore = scoreBMI(bmiAnalysis, input.gender);

    // Jersey scores (0-15 each if provided)
    let jerseyLengthScore = 0;
    let jerseyWidthScore = 0;
    let jerseyAnalysis: JerseyAnalysis | undefined;

    if (input.favoriteJersey) {
      jerseyAnalysis = analyzeJerseyFit(input.favoriteJersey, row, input.productTypeSlug);
      // Split the 30-point score into length and width
      const lengthDiff = Math.abs(jerseyAnalysis.lengthDiff);
      const widthDiff = Math.abs(jerseyAnalysis.widthDiff);

      jerseyLengthScore = Math.max(0, 15 - lengthDiff * 2);
      jerseyWidthScore = Math.max(0, 15 - widthDiff * 2);
    }

    // Fit preference adjustment (±2 points)
    let fitAdjustment = 0;
    if (input.favoriteJersey && input.fitPreference !== 'regular') {
      const sizeWidth = getRelevantWidth(row, input.productTypeSlug);
      const sizeFitsDelta = sizeWidth - input.favoriteJersey.widthCm;

      if (input.fitPreference === 'slim') {
        // Prefer sizes equal or smaller
        fitAdjustment = sizeFitsDelta <= 0 ? 2 : -2;
      } else if (input.fitPreference === 'relaxed') {
        // Prefer sizes equal or larger
        fitAdjustment = sizeFitsDelta >= 0 ? 2 : -2;
      }
    }

    const totalScore = heightScore + bmiScore + jerseyLengthScore + jerseyWidthScore + fitAdjustment;

    // Calculate deltas for debugging and tie-breaking
    const heightMidpoint = (row.height_min_cm + row.height_max_cm) / 2;
    const heightDelta = input.heightCm - heightMidpoint;
    const heightFromRange =
      input.heightCm < row.height_min_cm
        ? row.height_min_cm - input.heightCm
        : input.heightCm > row.height_max_cm
          ? input.heightCm - row.height_max_cm
          : 0;

    return {
      size: row.size,
      totalScore,
      subscores: {
        height: heightScore,
        bmi: bmiScore,
        jerseyLength: jerseyLengthScore > 0 ? jerseyLengthScore : undefined,
        jerseyWidth: jerseyWidthScore > 0 ? jerseyWidthScore : undefined,
        fitPreference: fitAdjustment !== 0 ? fitAdjustment : undefined,
      },
      penalties: {
        edgePenalty: 0, // Calculated later
        conflictPenalty: 0,
      },
      deltas: {
        heightFromMidpoint: heightDelta,
        heightFromRange,
        jerseyLengthDiff: jerseyAnalysis?.lengthDiff,
        jerseyWidthDiff: jerseyAnalysis?.widthDiff,
      },
      measurements: row,
    };
  });

  // Sort by score with tie-breakers
  scores.sort((a, b) => {
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }

    // Tie-breaker 1: Prefer size with user closer to center
    const aCenteredness = Math.abs(a.deltas.heightFromMidpoint);
    const bCenteredness = Math.abs(b.deltas.heightFromMidpoint);
    if (aCenteredness !== bCenteredness) {
      return aCenteredness - bCenteredness;
    }

    // Tie-breaker 2: Prefer narrower range (more specific)
    const aRange = a.measurements.height_max_cm - a.measurements.height_min_cm;
    const bRange = b.measurements.height_max_cm - b.measurements.height_min_cm;
    return aRange - bRange;
  });

  return scores;
}

// ============================================================================
// EDGE CASE DETECTION
// ============================================================================

function detectEdgeCases(
  input: SizingInput,
  bestScore: SizeScore,
  runnerUpScore: SizeScore,
  allScores: SizeScore[],
  bmiAnalysis: BMIAnalysis
): EdgeCase[] {
  const cases: EdgeCase[] = [];

  // Find actual largest and smallest sizes by height range (not by score!)
  const largestSize = allScores.reduce((max, score) =>
    score.measurements.height_max_cm > max.measurements.height_max_cm ? score : max
  ).measurements;
  const smallestSize = allScores.reduce((min, score) =>
    score.measurements.height_min_cm < min.measurements.height_min_cm ? score : min
  ).measurements;

  // HEIGHT ABOVE ALL RANGES
  if (input.heightCm > largestSize.height_max_cm) {
    const distanceAbove = input.heightCm - largestSize.height_max_cm;
    cases.push({
      type: 'HEIGHT_ABOVE_RANGE',
      severity: distanceAbove > 10 ? 'HIGH' : 'MEDIUM',
      message: `Your height (${input.heightCm}cm) exceeds our largest size (${largestSize.height_max_cm}cm max)`,
      recommendation: distanceAbove > 10 ? 'MUST_CONTACT' : 'CONTACT_US',
    });
  }

  // HEIGHT BELOW ALL RANGES
  if (input.heightCm < smallestSize.height_min_cm) {
    const distanceBelow = smallestSize.height_min_cm - input.heightCm;
    cases.push({
      type: 'HEIGHT_BELOW_RANGE',
      severity: distanceBelow > 10 ? 'HIGH' : 'MEDIUM',
      message: `Your height (${input.heightCm}cm) is below our smallest size (${smallestSize.height_min_cm}cm min)`,
      recommendation: distanceBelow > 10 ? 'MUST_CONTACT' : 'CONTACT_US',
    });
  }

  // HEIGHT BETWEEN RANGES (in a gap)
  const isInGap = bestScore.deltas.heightFromRange > 0 && bestScore.deltas.heightFromRange <= 5;
  if (isInGap) {
    cases.push({
      type: 'HEIGHT_BETWEEN_RANGES',
      severity: 'LOW',
      message: `Your height falls between standard size ranges`,
      recommendation: 'REVIEW_CAREFULLY',
    });
  }

  // EXTREME BMI
  if (bmiAnalysis.isExtreme) {
    cases.push({
      type: 'EXTREME_BMI',
      severity: 'HIGH',
      message: `Your BMI (${bmiAnalysis.bmi}) indicates unusual body proportions`,
      recommendation: 'CONTACT_US',
    });
  }

  // AT EDGE OF RANGE
  const distanceToEdge = Math.min(
    input.heightCm - bestScore.measurements.height_min_cm,
    bestScore.measurements.height_max_cm - input.heightCm
  );

  if (distanceToEdge <= 2 && !isInGap) {
    cases.push({
      type: 'EDGE_OF_RANGE',
      severity: 'LOW',
      message: `Your height is at the edge of size ${bestScore.size}'s range`,
      recommendation: 'REVIEW_CAREFULLY',
    });
  }

  // CONFLICTING MEASUREMENTS
  if (input.favoriteJersey) {
    const scoreDiff = bestScore.totalScore - runnerUpScore.totalScore;
    if (scoreDiff < 5) {
      // Very close scores suggest conflicting data
      cases.push({
        type: 'CONFLICTING_MEASUREMENTS',
        severity: 'MEDIUM',
        message: 'Your measurements suggest you\'re between sizes',
        recommendation: 'CONSIDER_CONTACTING',
      });
    }
  }

  return cases;
}

// ============================================================================
// CONFIDENCE & RISK CALCULATION
// ============================================================================

function calculateConfidenceAndRisk(
  bestScore: SizeScore,
  runnerUpScore: SizeScore,
  input: SizingInput,
  edgeCases: EdgeCase[]
): { confidence: number; riskLevel: RiskLevel; breakdown: ConfidenceBreakdown } {
  // Base scores
  const baseScore = bestScore.subscores.height;
  const bmiScore = bestScore.subscores.bmi;
  const jerseyScore =
    (bestScore.subscores.jerseyLength || 0) + (bestScore.subscores.jerseyWidth || 0);

  // Penalties
  let edgePenalty = 0;
  let conflictPenalty = 0;

  // Calculate edge penalty
  const highSeverityCases = edgeCases.filter((c) => c.severity === 'HIGH').length;
  const mediumSeverityCases = edgeCases.filter((c) => c.severity === 'MEDIUM').length;

  edgePenalty = -(highSeverityCases * 15 + mediumSeverityCases * 7);
  edgePenalty = Math.max(edgePenalty, -20);

  // Calculate conflict penalty
  const scoreDifference = bestScore.totalScore - runnerUpScore.totalScore;
  if (scoreDifference < 3) {
    conflictPenalty = -10; // Very close scores
  } else if (scoreDifference < 7) {
    conflictPenalty = -5;
  }

  // Boost for having measurements
  let measurementBoost = 0;
  if (input.favoriteJersey) {
    measurementBoost = 5;
  }

  // Total confidence
  let confidence = baseScore + bmiScore + jerseyScore + edgePenalty + conflictPenalty + measurementBoost;
  confidence = Math.max(0, Math.min(100, Math.round(confidence)));

  // Determine risk level
  let riskLevel: RiskLevel;
  const hasCriticalEdgeCase = edgeCases.some(
    (c) => c.recommendation === 'MUST_CONTACT'
  );

  if (hasCriticalEdgeCase) {
    riskLevel = 'ESCALATE';
  } else if (confidence >= 90) {
    riskLevel = 'LOW';
  } else if (confidence >= 70) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'HIGH';
  }

  const breakdown: ConfidenceBreakdown = {
    baseScore,
    bmiScore,
    jerseyScore,
    edgePenalty,
    conflictPenalty,
    total: confidence,
  };

  return { confidence, riskLevel, breakdown };
}

// ============================================================================
// ALTERNATE SIZE CALCULATION
// ============================================================================

function calculateAlternateSize(
  bestScore: SizeScore,
  runnerUpScore: SizeScore,
  allSizes: SizeValue[]
): SizeValue {
  const bestIndex = SIZE_ORDER.indexOf(bestScore.size);

  // If user is taller than range, suggest larger
  if (bestScore.deltas.heightFromRange > 0) {
    const nextSize = SIZE_ORDER[Math.min(bestIndex + 1, SIZE_ORDER.length - 1)];
    if (allSizes.includes(nextSize)) {
      return nextSize;
    }
  }

  // If favorite jersey suggests different size
  if (bestScore.deltas.jerseyWidthDiff !== undefined) {
    if (bestScore.deltas.jerseyWidthDiff <= -3) {
      // User's jersey is wider - suggest larger
      const nextSize = SIZE_ORDER[Math.min(bestIndex + 1, SIZE_ORDER.length - 1)];
      if (allSizes.includes(nextSize)) {
        return nextSize;
      }
    }
  }

  // Otherwise, use runner-up
  return runnerUpScore.size;
}

// ============================================================================
// HUMAN-FRIENDLY RATIONALE
// ============================================================================

function generateRationale(
  input: SizingInput,
  bestScore: SizeScore,
  bmiAnalysis: BMIAnalysis,
  riskLevel: RiskLevel
): string[] {
  const rationale: string[] = [];
  const { height_min_cm, height_max_cm } = bestScore.measurements;

  // Height explanation
  if (input.heightCm >= height_min_cm && input.heightCm <= height_max_cm) {
    const midpoint = (height_min_cm + height_max_cm) / 2;
    const distanceFromMid = Math.abs(input.heightCm - midpoint);

    if (distanceFromMid <= 2) {
      rationale.push(
        `Your height (${input.heightCm}cm) is perfectly centered in size ${bestScore.size}'s range (${height_min_cm}-${height_max_cm}cm)`
      );
    } else if (input.heightCm <= midpoint) {
      rationale.push(
        `Your height (${input.heightCm}cm) fits size ${bestScore.size} (${height_min_cm}-${height_max_cm}cm), toward the lower end`
      );
    } else {
      rationale.push(
        `Your height (${input.heightCm}cm) fits size ${bestScore.size} (${height_min_cm}-${height_max_cm}cm), toward the upper end`
      );
    }
  } else {
    rationale.push(
      `Your height (${input.heightCm}cm) is close to size ${bestScore.size} range (${height_min_cm}-${height_max_cm}cm)`
    );
  }

  // BMI explanation
  if (bmiAnalysis.category === 'normal') {
    rationale.push(`Your build (BMI ${bmiAnalysis.bmi}) is ideal for this size`);
  } else if (bmiAnalysis.category === 'athletic') {
    rationale.push(
      `Your build (BMI ${bmiAnalysis.bmi}) suggests athletic/muscular - this size should fit comfortably`
    );
  } else if (bmiAnalysis.category === 'overweight') {
    rationale.push(`Your build (BMI ${bmiAnalysis.bmi}) may benefit from a roomier fit`);
  }

  // Favorite jersey explanation
  if (input.favoriteJersey && bestScore.deltas.jerseyLengthDiff !== undefined) {
    const lengthDiff = Math.abs(bestScore.deltas.jerseyLengthDiff);
    const widthDiff = Math.abs(bestScore.deltas.jerseyWidthDiff || 0);

    if (lengthDiff <= 2 && widthDiff <= 2) {
      rationale.push(`This size closely matches your favorite jersey's fit`);
    } else if (lengthDiff <= 4 && widthDiff <= 3) {
      rationale.push(`This size is similar to your favorite jersey`);
    }
  }

  // Risk-based message
  if (riskLevel === 'LOW') {
    rationale.push(`This size will fit you well - order with confidence!`);
  } else if (riskLevel === 'MEDIUM') {
    rationale.push(`This size should work, but review the alternate size as well`);
  }

  return rationale;
}

function generateWarnings(edgeCases: EdgeCase[]): string[] {
  return edgeCases
    .filter((c) => c.severity !== 'LOW')
    .map((c) => c.message);
}

function generateTitle(riskLevel: RiskLevel, primarySize: SizeValue): string {
  switch (riskLevel) {
    case 'LOW':
      return `✅ YOUR SIZE: ${primarySize}`;
    case 'MEDIUM':
      return `⚠️ RECOMMENDED SIZE: ${primarySize}`;
    case 'HIGH':
      return `⚠️ PLEASE READ BEFORE ORDERING`;
    case 'ESCALATE':
      return `🚫 CONTACT US BEFORE ORDERING`;
  }
}

function generateSubtitle(riskLevel: RiskLevel, confidence: number): string | undefined {
  switch (riskLevel) {
    case 'LOW':
      return `CONFIDENCE: ${confidence}% - Excellent Match`;
    case 'MEDIUM':
      return `CONFIDENCE: ${confidence}% - Good Match`;
    case 'HIGH':
      return `CONFIDENCE: ${confidence}% - Please Review Carefully`;
    case 'ESCALATE':
      return undefined;
  }
}

// ============================================================================
// MAIN CALCULATOR
// ============================================================================

export function calculateSize(
  input: SizingInput,
  sizeChart: SizeChartRow[]
): SizeRecommendation {
  // Validate input
  const validation = validateSizingInput(input);
  if (!validation.valid) {
    throw new Error(`Invalid input: ${validation.errors.join(', ')}`);
  }

  // Validate size chart
  if (!sizeChart || sizeChart.length === 0) {
    throw new Error('Size chart is empty');
  }

  // BMI analysis
  const bmiAnalysis = analyzeBMI(input.heightCm, input.weightKg, input.gender);

  // Score all sizes
  const scores = scoreSizes(input, sizeChart, bmiAnalysis);

  // Get best and runner-up
  const bestScore = scores[0];
  const runnerUpScore = scores[1] || bestScore;

  // Detect edge cases
  const edgeCases = detectEdgeCases(input, bestScore, runnerUpScore, scores, bmiAnalysis);

  // Calculate confidence and risk
  const { confidence, riskLevel, breakdown } = calculateConfidenceAndRisk(
    bestScore,
    runnerUpScore,
    input,
    edgeCases
  );

  // Calculate alternate size
  const availableSizes = sizeChart.map((s) => s.size);
  const alternateSize = calculateAlternateSize(bestScore, runnerUpScore, availableSizes);

  // Generate human-friendly content
  const title = generateTitle(riskLevel, bestScore.size);
  const subtitle = generateSubtitle(riskLevel, confidence);
  const rationale = generateRationale(input, bestScore, bmiAnalysis, riskLevel);
  const warnings = generateWarnings(edgeCases);

  // Determine recommended action
  let recommendedAction: SizeRecommendation['recommendedAction'];
  const mustContact = edgeCases.some((c) => c.recommendation === 'MUST_CONTACT');
  const shouldContact = edgeCases.some((c) => c.recommendation === 'CONTACT_US');

  if (mustContact) {
    recommendedAction = 'MUST_CONTACT';
  } else if (shouldContact || riskLevel === 'HIGH') {
    recommendedAction = 'CONTACT_RECOMMENDED';
  } else if (riskLevel === 'MEDIUM') {
    recommendedAction = 'ORDER_WITH_INFO';
  } else {
    recommendedAction = 'ORDER_NOW';
  }

  const shouldShowContact = riskLevel === 'HIGH' || riskLevel === 'ESCALATE';

  return {
    primary: bestScore.size,
    alternate: alternateSize,
    riskLevel,
    confidence,
    confidenceBreakdown: breakdown,
    title,
    subtitle,
    rationale,
    warnings: warnings.length > 0 ? warnings : undefined,
    edgeCases,
    recommendedAction,
    shouldShowContact,
    chart: sizeChart,
    bmiAnalysis,
    debug:
      process.env.NODE_ENV === 'development'
        ? {
            scores,
            input,
            allEdgeCases: edgeCases,
          }
        : undefined,
  };
}
