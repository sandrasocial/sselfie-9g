/**
 * User Preference Tracking - Learn from user behavior to improve motion selection
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL || "")

export interface UserMotionPreferences {
  preferredIntensities: { subtle: number; moderate: number; dynamic: number }
  preferredCameraMovements: Record<string, number>
  preferredMotionTypes: Record<string, number>
  categoryPreferences: Record<string, number>
  lastUpdated: Date
}

/**
 * Track user interaction with a video (like, view, share, etc.)
 */
export async function trackUserInteraction(
  userId: number,
  videoId: number,
  interactionType: "like" | "view" | "share" | "download"
): Promise<void> {
  try {
    // Get the video's motion prompt and metadata
    const video = await sql`
      SELECT motion_prompt, image_id
      FROM generated_videos
      WHERE id = ${videoId} AND user_id = ${userId}
      LIMIT 1
    `
    
    if (video.length === 0) return
    
    // For now, we'll store preferences in a simple way
    // In production, you might want a dedicated preferences table
    console.log(`[v0] User ${userId} ${interactionType} video ${videoId}`)
    
    // This is a placeholder - in production, you'd update a preferences table
    // that tracks which motion types, intensities, and camera movements users prefer
  } catch (error) {
    console.error("[v0] Error tracking user interaction:", error)
  }
}

/**
 * Get user's motion preferences based on their history
 */
export async function getUserMotionPreferences(
  userId: number
): Promise<Partial<UserMotionPreferences>> {
  try {
    // Analyze user's video history to infer preferences
    const videos = await sql`
      SELECT motion_prompt, created_at
      FROM generated_videos
      WHERE user_id = ${userId}
        AND status = 'completed'
        AND motion_prompt IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 50
    `
    
    if (videos.length === 0) {
      return {
        preferredIntensities: { subtle: 0.5, moderate: 0.35, dynamic: 0.15 },
        preferredCameraMovements: {},
        preferredMotionTypes: {},
        categoryPreferences: {},
      }
    }
    
    // Analyze motion prompts to infer preferences
    const intensities = { subtle: 0, moderate: 0, dynamic: 0 }
    const cameraMovements: Record<string, number> = {}
    const motionTypes: Record<string, number> = {}
    
    videos.forEach((video: any) => {
      const prompt = (video.motion_prompt || "").toLowerCase()
      
      // Infer intensity from keywords
      if (prompt.includes("slowly") || prompt.includes("gently") || prompt.includes("subtly")) {
        intensities.subtle++
      } else if (prompt.includes("quickly") || prompt.includes("dramatically") || prompt.includes("energetic")) {
        intensities.dynamic++
      } else {
        intensities.moderate++
      }
      
      // Extract camera movement
      const cameraMatch = prompt.match(/camera\s+([^;]+)/)
      if (cameraMatch) {
        const movement = cameraMatch[1].trim()
        cameraMovements[movement] = (cameraMovements[movement] || 0) + 1
      }
      
      // Infer motion type from keywords
      if (prompt.includes("hair") || prompt.includes("breeze")) {
        motionTypes.environmental = (motionTypes.environmental || 0) + 1
      }
      if (prompt.includes("breath") || prompt.includes("blink")) {
        motionTypes.physiological = (motionTypes.physiological || 0) + 1
      }
      if (prompt.includes("coffee") || prompt.includes("phone") || prompt.includes("book")) {
        motionTypes.interactional = (motionTypes.interactional || 0) + 1
      }
    })
    
    // Normalize to percentages
    const total = videos.length
    const preferredIntensities = {
      subtle: intensities.subtle / total,
      moderate: intensities.moderate / total,
      dynamic: intensities.dynamic / total,
    }
    
    return {
      preferredIntensities,
      preferredCameraMovements: cameraMovements,
      preferredMotionTypes: motionTypes,
      categoryPreferences: {},
    }
  } catch (error) {
    console.error("[v0] Error getting user preferences:", error)
    return {
      preferredIntensities: { subtle: 0.5, moderate: 0.35, dynamic: 0.15 },
      preferredCameraMovements: {},
      preferredMotionTypes: {},
      categoryPreferences: {},
    }
  }
}

/**
 * Get recommended motion intensity based on user preferences
 */
export function getRecommendedIntensity(
  preferences: Partial<UserMotionPreferences>,
  category?: string
): "subtle" | "moderate" | "dynamic" {
  if (!preferences.preferredIntensities) {
    // Default distribution
    const rand = Math.random()
    if (rand < 0.5) return "subtle"
    if (rand < 0.85) return "moderate"
    return "dynamic"
  }
  
  const { subtle, moderate, dynamic } = preferences.preferredIntensities
  
  // Use weighted random based on preferences
  const rand = Math.random()
  if (rand < subtle) return "subtle"
  if (rand < subtle + moderate) return "moderate"
  return "dynamic"
}

