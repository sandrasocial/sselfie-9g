import "server-only"

import { sql } from "@/lib/db/client"
import { getShoot } from "@/lib/content-kit/shoot-generator"
import { getApprovedPublishableShots, getShootPublishReadiness } from "@/lib/content-kit/shoot-readiness"
import { ensureVaultCollectionsSchema, extractMoodLine, toVaultSlug } from "@/lib/vault/published-collections"
import { derivePublicVaultWhenToUse } from "@/lib/vault/public-copy"

export async function publishShootToVault(id: number) {
  await ensureVaultCollectionsSchema()
  const shoot = await getShoot(id)
  if (!shoot) throw new Error("Shoot not found")

  const readiness = getShootPublishReadiness(shoot)
  if (!readiness.ready) throw new Error(readiness.reason)

  const approvedShots = getApprovedPublishableShots(shoot)
  const slug = toVaultSlug(shoot.title, shoot.id)
  const cards = approvedShots.map((shot, index) => ({
    number: String(index + 1),
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
        ${Number(card.number)},
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
