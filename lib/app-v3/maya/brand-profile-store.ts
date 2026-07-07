import "server-only"

// MAYA'S FIRST COFFEE (2026-07-07, Sandra-approved onboarding build). Maya interviews a new
// member in chat right after her first photo lands, and saves the answers HERE - into the
// same user_personal_brand table every existing system already reads (chat context, month
// drafts, This Week ideas, feed-style resolution). App v3 previously had NO writer for this
// table; the old /studio wizards were the only ones, and new members never see them.

import { sql } from "@/lib/db/client"
import { getRedisClient, CacheKeys } from "@/lib/redis"

export interface BrandProfileFacts {
  name?: string
  businessType?: string
  targetAudience?: string
  transformationStory?: string
  /** What showing up online should get her in the next ~90 days. */
  goals?: string
  futureVision?: string
  brandVoice?: string
}

const clean = (v: string | undefined): string | null => {
  const t = typeof v === "string" ? v.trim() : ""
  return t.length > 0 ? t.slice(0, 2000) : null
}

/**
 * Merge interview facts into user_personal_brand (COALESCE semantics - never blanks a field
 * she filled elsewhere). Marks the profile completed once the essentials exist, and
 * invalidates the Redis cache so Maya's very next reply already knows her.
 */
export async function saveBrandProfileFacts(
  neonUserId: string | number,
  facts: BrandProfileFacts,
): Promise<boolean> {
  const userId = String(neonUserId)
  const name = clean(facts.name)
  const businessType = clean(facts.businessType)
  const targetAudience = clean(facts.targetAudience)
  const transformationStory = clean(facts.transformationStory)
  const goals = clean(facts.goals)
  const futureVision = clean(facts.futureVision)
  const brandVoice = clean(facts.brandVoice)

  if (!name && !businessType && !targetAudience && !transformationStory && !goals && !futureVision && !brandVoice) {
    return false
  }

  const updated = await sql`
    UPDATE user_personal_brand
    SET
      name = COALESCE(${name}, name),
      business_type = COALESCE(${businessType}, business_type),
      target_audience = COALESCE(${targetAudience}, target_audience),
      ideal_audience = COALESCE(${targetAudience}, ideal_audience),
      transformation_story = COALESCE(${transformationStory}, transformation_story),
      content_goals = COALESCE(${goals}, content_goals),
      future_vision = COALESCE(${futureVision}, future_vision),
      brand_voice = COALESCE(${brandVoice}, brand_voice),
      is_completed = CASE
        WHEN COALESCE(${businessType}, business_type) IS NOT NULL
         AND (COALESCE(${transformationStory}, transformation_story) IS NOT NULL
           OR COALESCE(${targetAudience}, target_audience) IS NOT NULL)
        THEN true ELSE is_completed END,
      updated_at = NOW()
    WHERE user_id = ${userId}
    RETURNING id
  `

  if (updated.length === 0) {
    await sql`
      INSERT INTO user_personal_brand (
        user_id, name, business_type, target_audience, ideal_audience, transformation_story,
        content_goals, future_vision, brand_voice, is_completed, created_at, updated_at
      ) VALUES (
        ${userId}, ${name}, ${businessType}, ${targetAudience}, ${targetAudience},
        ${transformationStory}, ${goals}, ${futureVision}, ${brandVoice},
        ${Boolean(businessType && (transformationStory || targetAudience))}, NOW(), NOW()
      )
    `
  }

  // getUserPersonalBrand caches in Redis - drop it so her NEXT Maya reply already knows her.
  try {
    await getRedisClient().del(CacheKeys.mayaPersonalBrand(userId))
  } catch (cacheError) {
    console.error("[brand-profile] cache invalidation skipped:", cacheError)
  }
  return true
}
