import type { GalleryImage } from "@/lib/data/images"

export function rankTopImages(images: GalleryImage[], limit: number = 3): GalleryImage[] {
  if (!Array.isArray(images) || images.length < 5) return []

  return [...images]
    .sort((a, b) => {
      const favoriteDiff = Number(Boolean(b.is_favorite)) - Number(Boolean(a.is_favorite))
      if (favoriteDiff !== 0) return favoriteDiff
      const timeA = new Date(a.created_at).getTime()
      const timeB = new Date(b.created_at).getTime()
      return timeB - timeA
    })
    .slice(0, limit)
}
