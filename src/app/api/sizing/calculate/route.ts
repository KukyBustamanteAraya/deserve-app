// POST /api/sizing/calculate
// Calculate size recommendation based on user measurements
//
// V2 Changes:
// - weightKg now REQUIRED (for BMI calculation and body proportion assessment)
// - fitPreference now REQUIRED (affects sizing recommendation)
// - favoriteJersey optional but recommended (for accurate fit prediction)
// - Returns risk-based recommendations (LOW/MEDIUM/HIGH/ESCALATE)
// - Includes edge case detection and human-friendly messaging

import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabase/server-client';
import { calculateSize, validateSizingInput } from '@/lib/sizing/calculator';
import { logger } from '@/lib/logger';
import { toError, toSupabaseError } from '@/lib/error-utils';
import { z } from 'zod';
import type { SizingInput, SizeChartRow } from '@/types/sizing';

// Input validation schema - V2
const SizingInputSchema = z.object({
  // Required
  heightCm: z.number().min(120).max(250),
  weightKg: z.number().min(20).max(200), // NOW REQUIRED for BMI calculation
  sportId: z.number().int().positive(),
  productTypeSlug: z.string().min(1),
  gender: z.enum(['boys', 'girls', 'men', 'women', 'unisex']),
  fitPreference: z.enum(['slim', 'regular', 'relaxed']), // NOW REQUIRED

  // Optional - Favorite jersey measurements for better accuracy
  favoriteJersey: z.object({
    lengthCm: z.number().min(40).max(120),
    widthCm: z.number().min(30).max(80),
    fitFeeling: z.enum(['tight', 'perfect', 'loose']),
  }).optional(),
});

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json();
    const validatedInput = SizingInputSchema.parse(body);

    // Validate sizing input
    const validation = validateSizingInput(validatedInput);
    if (!validation.valid) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: validation.errors,
        },
        { status: 400 }
      );
    }

    // Fetch size chart from database
    const supabase = await createSupabaseServer();

    const { data: sizeChart, error: chartError } = await supabase
      .rpc('get_size_chart', {
        p_sport_id: validatedInput.sportId,
        p_product_type: validatedInput.productTypeSlug,
        p_gender: validatedInput.gender,
      });

    if (chartError) {
      logger.error('Error fetching size chart:', chartError);
      return NextResponse.json(
        {
          error: 'Failed to fetch size chart',
          details: chartError.message,
        },
        { status: 500 }
      );
    }

    if (!sizeChart || sizeChart.length === 0) {
      // Better error message with actionable info
      const sportNames: Record<number, string> = { 1: 'Soccer', 2: 'Basketball', 3: 'Volleyball' };
      const sportName = sportNames[validatedInput.sportId] || `Sport ${validatedInput.sportId}`;
      const genderLabel = validatedInput.gender === 'boys' ? 'Boys' : validatedInput.gender === 'girls' ? 'Girls' : validatedInput.gender;

      return NextResponse.json(
        {
          error: 'Size chart not available',
          details: `We don't have sizing data for ${genderLabel} ${sportName} ${validatedInput.productTypeSlug} yet. Please contact support for sizing help.`,
        },
        { status: 404 }
      );
    }

    // Calculate size recommendation
    const recommendation = calculateSize(
      validatedInput as SizingInput,
      sizeChart as SizeChartRow[]
    );

    // Return recommendation
    return NextResponse.json({
      success: true,
      recommendation,
      warnings: validation.warnings,
    });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: 'Invalid input',
          details: error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    if (error instanceof Error) {
      logger.error('Sizing calculation error:', toError(error));
      return NextResponse.json(
        {
          error: 'Calculation failed',
          details: error.message,
        },
        { status: 500 }
      );
    }

    logger.error('Unknown sizing calculation error:', toError(error));
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}

// GET /api/sizing/calculate?sportId=1&productType=jersey&gender=boys
// Get available size chart without calculation
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const sportId = searchParams.get('sportId');
    const productType = searchParams.get('productType');
    const gender = searchParams.get('gender');

    if (!sportId || !productType || !gender) {
      return NextResponse.json(
        {
          error: 'Missing required parameters',
          details: 'sportId, productType, and gender are required',
        },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseServer();

    const { data: sizeChart, error: chartError } = await supabase
      .rpc('get_size_chart', {
        p_sport_id: parseInt(sportId),
        p_product_type: productType,
        p_gender: gender,
      });

    if (chartError) {
      logger.error('Error fetching size chart:', chartError);
      return NextResponse.json(
        {
          error: 'Failed to fetch size chart',
          details: chartError.message,
        },
        { status: 500 }
      );
    }

    if (!sizeChart || sizeChart.length === 0) {
      return NextResponse.json(
        {
          error: 'No size chart available',
          details: `No sizes found for the specified parameters`,
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      sizeChart,
      count: sizeChart.length,
    });

  } catch (error) {
    logger.error('Error fetching size chart:', toError(error));
    return NextResponse.json(
      {
        error: 'An unexpected error occurred',
      },
      { status: 500 }
    );
  }
}
