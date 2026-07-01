import { randomUUID } from "crypto"
import { sql } from "@/lib/db/client"
import { buildAiPhotoshootEmailTags } from "@/lib/audience/ai-photoshoot-segment"

export const SELFIE_AI_PHOTOS_KIT_SOURCE = "selfie-ai-photos-kit-paid"
export const SELFIE_AI_PHOTOS_KIT_TAG = "bought_selfie_ai_photos_kit"

export async function ensurePaidSelfieAiPhotosKitSubscriber(
  email: string,
  name?: string | null,
) {
  const resolvedName = (name || email.split("@")[0] || "AI Photos Kit buyer").trim()
  const existingSubscriber = await sql`
    SELECT id, access_token, email_tags
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  const existing = existingSubscriber[0] as
    | { id: number; access_token?: string | null; email_tags?: string[] | null }
    | undefined
  const accessToken = existing?.access_token?.trim() || randomUUID()
  const tags = new Set(Array.isArray(existing?.email_tags) ? existing.email_tags : [])
  tags.add("purchased")
  tags.add("customer")
  tags.add(SELFIE_AI_PHOTOS_KIT_SOURCE)
  tags.add(SELFIE_AI_PHOTOS_KIT_TAG)
  const normalizedTags = buildAiPhotoshootEmailTags(Array.from(tags), ["buyer"])

  if (existing) {
    await sql`
      UPDATE freebie_subscribers
      SET
        name = COALESCE(NULLIF(${resolvedName}, ''), name),
        source = ${SELFIE_AI_PHOTOS_KIT_SOURCE},
        access_token = ${accessToken},
        email_tags = ${normalizedTags}::text[],
        converted_to_user = TRUE,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `

    return { subscriberId: existing.id as number, accessToken }
  }

  const inserted = await sql`
    INSERT INTO freebie_subscribers (
      email,
      name,
      source,
      access_token,
      email_tags,
      converted_to_user,
      converted_at,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${resolvedName},
      ${SELFIE_AI_PHOTOS_KIT_SOURCE},
      ${accessToken},
      ${normalizedTags}::text[],
      TRUE,
      NOW(),
      NOW(),
      NOW()
    )
    RETURNING id
  `

  return { subscriberId: inserted[0].id as number, accessToken }
}
