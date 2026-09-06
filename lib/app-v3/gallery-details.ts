import "server-only"
import { sql } from "@/lib/db/client"
import { getAllUserImages } from "@/lib/data/images"
import { imageToGalleryAsset, type AppV3GalleryAsset } from "./gallery-assets"

let ensured: Promise<unknown> | null = null
export function ensureGalleryDetails() {
  return (ensured ??= sql`CREATE TABLE IF NOT EXISTS app_v3_asset_details (
    user_id text NOT NULL, asset_id text NOT NULL, description text NOT NULL DEFAULT '',
    labels text NOT NULL DEFAULT '', used_at timestamptz, updated_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, asset_id)
  )`.catch(error => {
    ensured = null
    throw error
  }))
}
export async function readGalleryDetails(userId: string) {
  await ensureGalleryDetails()
  return sql`SELECT asset_id, description, labels, used_at FROM app_v3_asset_details WHERE user_id = ${userId}`
}
export async function ownedGalleryPhotos(userId: string): Promise<AppV3GalleryAsset[]> {
  const [images, details, posted] = await Promise.all([
    getAllUserImages(userId),
    readGalleryDetails(userId),
    sql`SELECT p.image_url FROM feed_posts p JOIN feed_layouts f ON f.id = p.feed_layout_id WHERE f.user_id = ${userId} AND p.is_posted = true`,
  ])
  const used = new Set(posted.map(row => row.image_url))
  return images
    .map(imageToGalleryAsset)
    .filter((a): a is AppV3GalleryAsset => !!a)
    .map(a => {
      const detail = details.find(d => d.asset_id === a.id)
      return {
        ...a,
        description: String(detail?.description || ""),
        labels: String(detail?.labels || ""),
        isUsed: Boolean(detail?.used_at) || used.has(a.url),
      }
    })
}
export async function saveGalleryDetails(
  userId: string,
  assetId: string,
  patch: { description?: string; labels?: string; used?: boolean }
) {
  // Resolve from the user's actual library; never trust a caller-supplied URL or account ID.
  const asset = (await ownedGalleryPhotos(userId)).find(a => a.id === assetId)
  if (!asset) return null
  await sql`INSERT INTO app_v3_asset_details (user_id, asset_id, description, labels, used_at)
    VALUES (${userId}, ${assetId}, ${patch.description ?? ""}, ${patch.labels ?? ""}, ${patch.used ? new Date().toISOString() : null}::timestamptz)
    ON CONFLICT (user_id, asset_id) DO UPDATE SET
      description = CASE WHEN ${patch.description !== undefined} THEN EXCLUDED.description ELSE app_v3_asset_details.description END,
      labels = CASE WHEN ${patch.labels !== undefined} THEN EXCLUDED.labels ELSE app_v3_asset_details.labels END,
      used_at = CASE WHEN ${patch.used !== undefined} THEN EXCLUDED.used_at ELSE app_v3_asset_details.used_at END,
      updated_at = now()`
  return asset
}
