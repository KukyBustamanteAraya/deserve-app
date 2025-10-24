import { SupabaseClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

export interface AutoPopulateResult {
  success: boolean;
  count: number;
  error?: string;
}

/**
 * Auto-populates a sub-team roster with placeholder players
 *
 * Creates placeholder entries with:
 * - Sequential jersey numbers (1, 2, 3, ...)
 * - Generic player names (Player 1, Player 2, ...)
 * - Null values for size, position, and email (to be filled in later)
 * - auto_generated flag for easy identification
 *
 * @param supabase - Supabase client instance
 * @param subTeamId - UUID of the sub-team to populate
 * @param estimatedSize - Number of placeholder players to create (1-200)
 * @param createdBy - UUID of the user creating the placeholders
 * @returns Result object with success status and count
 */
export async function autoPopulateRoster(
  supabase: SupabaseClient,
  subTeamId: string,
  estimatedSize: number,
  createdBy: string
): Promise<AutoPopulateResult> {
  try {
    // Validate inputs
    if (estimatedSize <= 0 || estimatedSize > 200) {
      logger.error('[AutoPopulateRoster] Invalid roster size:', {
        subTeamId,
        estimatedSize,
      });
      return {
        success: false,
        count: 0,
        error: 'Invalid roster size. Must be between 1 and 200.'
      };
    }

    logger.info('[AutoPopulateRoster] Starting auto-population:', {
      subTeamId,
      estimatedSize,
      createdBy,
    });

    // Generate roster members
    const members = [];
    for (let i = 1; i <= estimatedSize; i++) {
      members.push({
        sub_team_id: subTeamId,
        player_name: `Player ${i}`,
        jersey_number: i.toString(),
        size: null,
        position: null,
        email: null,
        additional_info: { auto_generated: true },
        created_by: createdBy,
      });
    }

    // Batch insert all members
    const { data, error } = await supabase
      .from('institution_sub_team_members')
      .insert(members)
      .select();

    if (error) {
      logger.error('[AutoPopulateRoster] Failed to insert members:', {
        error,
        errorCode: error.code,
        errorMessage: error.message,
        subTeamId,
        estimatedSize,
      });
      return {
        success: false,
        count: 0,
        error: error.message || 'Failed to create placeholder players'
      };
    }

    const insertedCount = data?.length || 0;
    logger.info('[AutoPopulateRoster] Successfully created roster:', {
      subTeamId,
      requestedCount: estimatedSize,
      insertedCount,
      createdBy,
    });

    return {
      success: true,
      count: insertedCount
    };
  } catch (error: any) {
    logger.error('[AutoPopulateRoster] Unexpected error:', {
      error,
      errorMessage: error?.message,
      subTeamId,
      estimatedSize,
    });
    return {
      success: false,
      count: 0,
      error: error?.message || 'Unexpected error during roster population'
    };
  }
}
