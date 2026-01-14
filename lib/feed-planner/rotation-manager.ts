/**
 * Rotation Manager
 * 
 * Manages rotation state for outfit/location/accessory selection.
 * Ensures users get different content each time they generate a feed.
 */

import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)

export interface RotationState {
  userId: string
  vibe: string
  fashionStyle: string
  outfitIndex: number
  locationIndex: number
  accessoryIndex: number
}

/**
 * Get current rotation state for user + vibe + style combo
 * Creates new state if doesn't exist
 * 
 * @param userId - User ID
 * @param vibe - Vibe key (e.g., 'luxury_dark_moody')
 * @param fashionStyle - Fashion style (e.g., 'business')
 * @returns Current rotation state
 */
export async function getRotationState(
  userId: string,
  vibe: string,
  fashionStyle: string
): Promise<RotationState> {
  try {
    const result = await sql`
      SELECT outfit_index, location_index, accessory_index
      FROM user_feed_rotation_state
      WHERE user_id = ${userId} AND vibe = ${vibe} AND fashion_style = ${fashionStyle}
      LIMIT 1
    `
    
    if (result.length === 0) {
      // Create new state
      await sql`
        INSERT INTO user_feed_rotation_state 
        (user_id, vibe, fashion_style, outfit_index, location_index, accessory_index)
        VALUES (${userId}, ${vibe}, ${fashionStyle}, 0, 0, 0)
        ON CONFLICT (user_id, vibe, fashion_style) DO NOTHING
      `
      
      return {
        userId,
        vibe,
        fashionStyle,
        outfitIndex: 0,
        locationIndex: 0,
        accessoryIndex: 0
      }
    }
    
    const row = result[0] as any
    return {
      userId,
      vibe,
      fashionStyle,
      outfitIndex: row.outfit_index || 0,
      locationIndex: row.location_index || 0,
      accessoryIndex: row.accessory_index || 0
    }
  } catch (error: any) {
    // If table doesn't exist yet, return default state
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      console.warn('[Rotation Manager] Table not found, using default state:', error.message)
      return {
        userId,
        vibe,
        fashionStyle,
        outfitIndex: 0,
        locationIndex: 0,
        accessoryIndex: 0
      }
    }
    throw error
  }
}

/**
 * Increment rotation indices after feed generation
 * Increments by 4 for outfits (uses 4 per feed)
 * Increments by 3 for locations (uses 3 per feed)
 * Increments by 2 for accessories (uses 2 per feed)
 * 
 * @param userId - User ID
 * @param vibe - Vibe key
 * @param fashionStyle - Fashion style
 */
export async function incrementRotationState(
  userId: string,
  vibe: string,
  fashionStyle: string
): Promise<void> {
  try {
    await sql`
      UPDATE user_feed_rotation_state
      SET outfit_index = outfit_index + 4,
          location_index = location_index + 3,
          accessory_index = accessory_index + 2,
          last_used_at = NOW(),
          total_generations = total_generations + 1,
          updated_at = NOW()
      WHERE user_id = ${userId} AND vibe = ${vibe} AND fashion_style = ${fashionStyle}
    `
  } catch (error: any) {
    // If table doesn't exist yet, silently fail (migration may not have run)
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      console.warn('[Rotation Manager] Table not found, skipping increment:', error.message)
      return
    }
    throw error
  }
}

/**
 * Reset rotation state (useful for testing or user request)
 * 
 * @param userId - User ID
 * @param vibe - Optional vibe key (if provided, resets only that combo)
 * @param fashionStyle - Optional fashion style (if provided, resets only that combo)
 */
export async function resetRotationState(
  userId: string,
  vibe?: string,
  fashionStyle?: string
): Promise<void> {
  try {
    if (vibe && fashionStyle) {
      // Reset specific vibe + style combo
      await sql`
        UPDATE user_feed_rotation_state
        SET outfit_index = 0,
            location_index = 0,
            accessory_index = 0,
            updated_at = NOW()
        WHERE user_id = ${userId} AND vibe = ${vibe} AND fashion_style = ${fashionStyle}
      `
    } else {
      // Reset all for user
      await sql`
        UPDATE user_feed_rotation_state
        SET outfit_index = 0,
            location_index = 0,
            accessory_index = 0,
            updated_at = NOW()
        WHERE user_id = ${userId}
      `
    }
  } catch (error: any) {
    // If table doesn't exist yet, silently fail
    if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
      console.warn('[Rotation Manager] Table not found, skipping reset:', error.message)
      return
    }
    throw error
  }
}
