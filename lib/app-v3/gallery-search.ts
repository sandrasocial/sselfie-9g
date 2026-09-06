import type { AppV3GalleryAsset } from "./gallery-assets"

/** Search observed descriptions and member labels, never the image-generation prompt. */
export function searchGalleryPhotos(
  assets: AppV3GalleryAsset[],
  query: string,
  unusedOnly = false
) {
  const terms =
    query
      .toLowerCase()
      .match(/[\p{L}\p{N}]+/gu)
      ?.filter(
        t =>
          t.length > 2 &&
          ![
            "find",
            "photo",
            "photos",
            "image",
            "images",
            "with",
            "this",
            "that",
            "have",
            "used",
            "yet",
            "for",
            "the",
            "and",
          ].includes(t)
      ) ?? []
  return assets
    .filter(a => a.kind === "image" && (!unusedOnly || !a.isUsed))
    .map(a => {
      const text = [a.description, a.labels, a.title].filter(Boolean).join(" ").toLowerCase()
      return { asset: a, score: terms.reduce((n, term) => n + (text.includes(term) ? 1 : 0), 0) }
    })
    .filter(r => !terms.length || r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(r => r.asset)
}
