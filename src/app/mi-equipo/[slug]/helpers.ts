/**
 * Helper functions for team pages
 * Extracted from the original monolithic page component
 */

import { getBrowserClient } from '@/lib/supabase/client';
import type { Player } from './types';

/**
 * Load collection link for a team
 */
export async function loadCollectionLink(teamId: string): Promise<string | null> {
  try {
    const response = await fetch(`/api/teams/${teamId}/collection-link`);
    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('[Helpers] Error loading collection link:', error);
    return null;
  }
}

/**
 * Copy text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch (error) {
    console.error('[Helpers] Error copying to clipboard:', error);
    return false;
  }
}

/**
 * Share via WhatsApp
 */
export function shareViaWhatsApp(teamName: string, link: string): void {
  const message = encodeURIComponent(
    `${teamName}\n\nPor favor, completa tu información de jugador usando este enlace:\n\n${link}\n\n¡Gracias!`
  );
  window.open(`https://wa.me/?text=${message}`, '_blank');
}

/**
 * Load current user's player info for editing
 */
export async function loadMyPlayerInfo(
  teamId: string,
  userId: string
): Promise<Player | null> {
  try {
    const supabase = getBrowserClient();
    const { data: playerData } = await supabase
      .from('player_info_submissions')
      .select('*')
      .eq('team_id', teamId)
      .eq('user_id', userId)
      .maybeSingle();

    return playerData;
  } catch (error) {
    console.error('[Helpers] Error loading player info:', error);
    return null;
  }
}

/**
 * Update player info (create or update)
 */
export async function updatePlayerInfo(
  teamId: string,
  userId: string,
  playerData: {
    player_name: string;
    jersey_number: string;
    size: string;
    position: string;
    additional_notes: string;
  },
  existingPlayerId?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = getBrowserClient();

    if (existingPlayerId) {
      // Update existing player info
      const { error } = await supabase
        .from('player_info_submissions')
        .update({
          player_name: playerData.player_name.trim(),
          jersey_number: playerData.jersey_number.trim() || null,
          size: playerData.size,
          position: playerData.position.trim() || null,
          additional_notes: playerData.additional_notes.trim() || null,
        })
        .eq('id', existingPlayerId);

      if (error) throw error;
      return { success: true };
    } else {
      // Create new player info - get the latest design request
      const { data: designData } = await supabase
        .from('design_requests')
        .select('id')
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let designRequestId = designData?.id;

      // If no design request exists, create a default one
      if (!designRequestId) {
        const { data: newDesignRequest, error: createError } = await supabase
          .from('design_requests')
          .insert({
            team_id: teamId,
            requested_by: userId,
            user_id: userId,
            user_type: 'manager',
            status: 'pending'
          })
          .select()
          .single();

        if (createError) throw createError;
        designRequestId = newDesignRequest.id;
      }

      // Insert new player info
      const { error } = await supabase
        .from('player_info_submissions')
        .insert({
          team_id: teamId,
          design_request_id: designRequestId,
          user_id: userId,
          player_name: playerData.player_name.trim(),
          jersey_number: playerData.jersey_number.trim() || null,
          size: playerData.size,
          position: playerData.position.trim() || null,
          additional_notes: playerData.additional_notes.trim() || null,
          submitted_by_manager: false,
        });

      if (error) throw error;
      return { success: true };
    }
  } catch (error: any) {
    console.error('[Helpers] Error updating player info:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Swap two players' positions (used in field map)
 */
export async function swapPlayers(
  teamId: string,
  benchPlayerId: string,
  starterPlayerId: string,
  allPlayers: Player[]
): Promise<Player[] | null> {
  try {
    const supabase = getBrowserClient();

    // Get both players' created_at timestamps
    const benchPlayer = allPlayers.find(p => p.id === benchPlayerId);
    const starterPlayer = allPlayers.find(p => p.id === starterPlayerId);

    if (!benchPlayer || !starterPlayer) {
      console.error('[Helpers] Players not found');
      return null;
    }

    // Swap their created_at timestamps to change their order
    const { error: benchError } = await supabase
      .from('player_info_submissions')
      .update({ created_at: starterPlayer.created_at })
      .eq('id', benchPlayerId);

    const { error: starterError } = await supabase
      .from('player_info_submissions')
      .update({ created_at: benchPlayer.created_at })
      .eq('id', starterPlayerId);

    if (benchError || starterError) {
      console.error('[Helpers] Error swapping players:', benchError || starterError);
      return null;
    }

    // Refetch the players list
    const { data: playersData } = await supabase
      .from('player_info_submissions')
      .select('*')
      .eq('team_id', teamId)
      .order('created_at', { ascending: false });

    return playersData || null;
  } catch (error) {
    console.error('[Helpers] Error swapping players:', error);
    return null;
  }
}
