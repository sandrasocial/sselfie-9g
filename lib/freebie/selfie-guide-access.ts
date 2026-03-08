import { randomUUID } from "crypto"

import { sql } from "@/lib/db/client"
import { normalizeFreebieEmailTags, resolveAccessToken } from "@/lib/freebie/subscribe-utils"

export async function ensurePaidSelfieGuideSubscriber(email: string, name?: string | null) {
  const cleanedName = typeof name === "string" && name.trim().length > 0 ? name.trim() : null
  const existingSubscriber = await sql`
    SELECT id, access_token, email_tags
    FROM freebie_subscribers
    WHERE LOWER(email) = LOWER(${email})
    LIMIT 1
  `

  const existing = existingSubscriber[0] as
    | { id: number; access_token?: string | null; email_tags?: string[] | null }
    | undefined
  const { accessToken } = resolveAccessToken(existing?.access_token, randomUUID)
  const tags = new Set(
    normalizeFreebieEmailTags(Array.isArray(existing?.email_tags) ? (existing?.email_tags as string[]) : null),
  )
  tags.add("purchased")
  tags.add("customer")
  tags.add("selfie-guide-paid")
  const normalizedTags = Array.from(tags)

  if (existing) {
    await sql`
      UPDATE freebie_subscribers
      SET
        name = COALESCE(${cleanedName}, name),
        source = 'selfie-guide-paid',
        access_token = ${accessToken},
        email_tags = ${normalizedTags}::text[],
        converted_to_user = TRUE,
        converted_at = COALESCE(converted_at, NOW()),
        updated_at = NOW()
      WHERE id = ${existing.id}
    `

    return { subscriberId: existing.id, accessToken }
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
      guide_access_email_sent,
      guide_access_email_sent_at,
      created_at,
      updated_at
    )
    VALUES (
      ${email},
      ${cleanedName},
      'selfie-guide-paid',
      ${accessToken},
      ${normalizedTags}::text[],
      TRUE,
      NOW(),
      FALSE,
      NULL,
      NOW(),
      NOW()
    )
    RETURNING id
  `

  return { subscriberId: inserted[0].id as number, accessToken }
}
