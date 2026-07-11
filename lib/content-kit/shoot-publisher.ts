import "server-only"

import { sql } from "@/lib/db/client"
import { getShoot } from "@/lib/content-kit/shoot-generator"
import { getApprovedPublishableShots, getShootPublishReadiness } from "@/lib/content-kit/shoot-readiness"
import {
  ensurePublishedVaultPromptNumbers,
  ensureVaultCollectionsSchema,
  extractMoodLine,
  toVaultSlug,
} from "@/lib/vault/published-collections"
import { derivePublicVaultWhenToUse } from "@/lib/vault/public-copy"
import { getHighestStaticPromptNumber, normalizePromptNumber } from "@/lib/ai-prompts/prompt-data"

type PublishedShootLibraryDrop = {
  shootId: number
  title: string
  description: string
  thumbnailUrl: string | null
  publishedAt: string | Date
}

export async function syncPublishedShootToMemberLibrary(
  drop: PublishedShootLibraryDrop,
): Promise<boolean> {
  try {
    const month = new Date(drop.publishedAt).toISOString().slice(0, 7)
    const existing = (await sql`
      SELECT id FROM academy_monthly_drops WHERE title = ${drop.title} LIMIT 1
    `) as Array<{ id: number }>

    if (existing.length > 0) {
      await sql`
        UPDATE academy_monthly_drops
        SET description = ${drop.description},
            thumbnail_url = ${drop.thumbnailUrl},
            month = ${month},
            resource_type = 'prompt-collection',
            resource_url = '/academy/access/prompt-vault',
            category = 'Prompt Vault',
            status = 'published',
            updated_at = NOW()
        WHERE id = ${existing[0].id}
      `
    } else {
      await sql`
        INSERT INTO academy_monthly_drops (
          title,
          description,
          thumbnail_url,
          resource_type,
          resource_url,
          month,
          category,
          order_index,
          status,
          download_count,
          created_at,
          updated_at
        )
        VALUES (
          ${drop.title},
          ${drop.description},
          ${drop.thumbnailUrl},
          'prompt-collection',
          '/academy/access/prompt-vault',
          ${month},
          'Prompt Vault',
          0,
          'published',
          0,
          NOW(),
          NOW()
        )
      `
    }

    return true
  } catch (error) {
    console.error("[shoot-publisher] member Library drop sync failed:", {
      shootId: drop.shootId,
      title: drop.title,
      error,
    })
    return false
  }
}

export async function publishShootToVault(id: number) {
  await ensureVaultCollectionsSchema()
  await ensurePublishedVaultPromptNumbers()
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")

  const readiness = getShootPublishReadiness(shoot)
  if (!readiness.ready) throw new Error(readiness.reason)

  const approvedShots = getApprovedPublishableShots(shoot)
  const slug = toVaultSlug(shoot.title, shoot.id)
  const existingNumberRows = (await sql`
    SELECT p.source_shot_id, p.number
    FROM vault_prompts p
    INNER JOIN vault_collections c ON c.id = p.collection_id
    WHERE c.source_shoot_id = ${shoot.id}
      AND p.status = 'published'
  `) as Array<{ source_shot_id: string; number: string | null }>
  const existingNumberByShotId = new Map(
    existingNumberRows.flatMap(row => {
      const number = normalizePromptNumber(row.number)
      return number ? [[String(row.source_shot_id), number] as const] : []
    }),
  )
  const maxRows = (await sql`
    SELECT MAX((number)::int)::int AS max_number
    FROM vault_prompts
    WHERE number ~ '^[0-9]+$'
  `) as Array<{ max_number: number | null }>
  let nextPromptNumber = Math.max(
    getHighestStaticPromptNumber(),
    Number(maxRows[0]?.max_number || 0),
  ) + 1
  const cards = approvedShots.map((shot, index) => ({
    number: existingNumberByShotId.get(shot.id) || String(nextPromptNumber++),
    sortOrder: index + 1,
    id: `${slug}-${shot.id}`,
    title: shot.title,
    whenToUse: derivePublicVaultWhenToUse({
      title: shot.title,
      mood: shot.mood,
      whenToUse: shot.whenToUse,
      shotRole: shot.shotRole,
    }),
    mood: shot.mood,
    prompt: shot.prompt,
    exampleImage: shot.imageUrl,
    sourceShotId: shot.id,
  }))
  const moodLine = extractMoodLine(cards)

  const rows = (await sql`
    INSERT INTO vault_collections (
      source_shoot_id,
      title,
      slug,
      status,
      giveaway_shot_id,
      hero_image_url,
      mood_line,
      inspiration_urls,
      email_drop_status,
      published_at,
      updated_at
    )
    VALUES (
      ${shoot.id},
      ${shoot.title},
      ${slug},
      'published',
      ${readiness.giveawayShotId},
      ${cards[0]?.exampleImage ?? null},
      ${moodLine},
      ${JSON.stringify(shoot.inspirationUrls)}::jsonb,
      'queued',
      NOW(),
      NOW()
    )
    ON CONFLICT (source_shoot_id) DO UPDATE SET
      title = EXCLUDED.title,
      slug = EXCLUDED.slug,
      status = 'published',
      giveaway_shot_id = EXCLUDED.giveaway_shot_id,
      hero_image_url = EXCLUDED.hero_image_url,
      mood_line = EXCLUDED.mood_line,
      inspiration_urls = EXCLUDED.inspiration_urls,
      email_drop_status = CASE
        WHEN vault_collections.email_drop_status = 'included' THEN vault_collections.email_drop_status
        ELSE 'queued'
      END,
      updated_at = NOW()
    RETURNING id, slug, published_at
  `) as any[]

  const collection = rows[0]
  await sql`DELETE FROM vault_prompts WHERE collection_id = ${collection.id}`

  for (const card of cards) {
    await sql`
      INSERT INTO vault_prompts (
        collection_id,
        source_shot_id,
        sort_order,
        number,
        card_id,
        title,
        when_to_use,
        mood,
        prompt,
        example_image,
        status
      )
      VALUES (
        ${collection.id},
        ${card.sourceShotId},
        ${card.sortOrder},
        ${card.number},
        ${card.id},
        ${card.title},
        ${card.whenToUse},
        ${card.mood},
        ${card.prompt},
        ${card.exampleImage ?? null},
        'published'
      )
    `
  }

  const publishedShotIds = new Set(cards.map((card) => card.sourceShotId))
  const downstreamApprovedShots = shoot.shots.map((shot) =>
    publishedShotIds.has(shot.id) ? { ...shot, status: "approved" as const } : shot,
  )

  await sql`
    UPDATE content_shoots
    SET status = 'approved',
        shots = ${JSON.stringify(downstreamApprovedShots)}::jsonb,
        updated_at = NOW()
    WHERE id = ${shoot.id}
  `

  await syncPublishedShootToMemberLibrary({
    shootId: shoot.id,
    title: shoot.title,
    description: moodLine,
    thumbnailUrl: cards[0]?.exampleImage ?? null,
    publishedAt: collection.published_at,
  })

  const updatedShoot = await getShoot(shoot.id)
  return {
    shoot: updatedShoot ?? { ...shoot, status: "approved" as const },
    collection: {
      id: Number(collection.id),
      slug: String(collection.slug),
      publishedAt: new Date(collection.published_at).toISOString(),
      shotCount: cards.length,
    },
  }
}
