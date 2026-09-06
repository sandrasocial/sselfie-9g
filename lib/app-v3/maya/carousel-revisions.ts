import type { TextOverlaySpec } from "@/lib/app-v3/text-overlay"
export type CarouselRevision = {
  review?: import("./carousel-review").CarouselReview
  operationId: string
  index: number
  imageUrl: string
  imageId: number | null
  bakedUrl: string | null
  bakedId: number | null
  spec?: TextOverlaySpec
}
/** Explicit indices never fall back to slide one. */
export function requestedSlideIndex(message: string): number | null {
  const match = /\bslide\s*#?\s*(\d+)\b/i.exec(message)
  return match ? Number(match[1]) - 1 : null
}
export function slideRevision(
  state: {
    carouselReviews?: import("./carousel-review").CarouselReview[]
    imageUrls?: string[]
    aiImageIds?: Array<number | null>
    bakedImageUrls?: Array<string | null>
    bakedAiImageIds?: Array<number | null>
    textOverlaySpecs?: TextOverlaySpec[]
  },
  index: number,
  operationId: string
): CarouselRevision {
  const imageUrl = state.imageUrls?.[index]
  if (!imageUrl) throw new Error("That slide does not exist")
  return {
    operationId,
    review: state.carouselReviews?.find(r => r.slide === index + 1),
    index,
    imageUrl,
    imageId: state.aiImageIds?.[index] ?? null,
    bakedUrl: state.bakedImageUrls?.[index] ?? null,
    bakedId: state.bakedAiImageIds?.[index] ?? null,
    spec: state.textOverlaySpecs?.[index],
  }
}
export function restoreSlide<
  T extends {
    carouselReviews?: import("./carousel-review").CarouselReview[]
    imageUrls?: string[]
    aiImageIds?: Array<number | null>
    bakedImageUrls?: Array<string | null>
    bakedAiImageIds?: Array<number | null>
    textOverlaySpecs?: TextOverlaySpec[]
  },
>(state: T, revision: CarouselRevision): T {
  const copy = {
    ...state,
    carouselReviews: [
      ...(state.carouselReviews ?? []).filter(r => r.slide !== revision.index + 1),
      revision.review ?? {
        slide: revision.index + 1,
        status: "unavailable" as const,
        issues: ["This slide changed after its last check. Please review it before posting."],
      },
    ],
    imageUrls: [...(state.imageUrls ?? [])],
    aiImageIds: [...(state.aiImageIds ?? [])],
    bakedImageUrls: [...(state.bakedImageUrls ?? [])],
    bakedAiImageIds: [...(state.bakedAiImageIds ?? [])],
    textOverlaySpecs: [...(state.textOverlaySpecs ?? [])],
  }
  copy.imageUrls[revision.index] = revision.imageUrl
  copy.aiImageIds[revision.index] = revision.imageId
  copy.bakedImageUrls[revision.index] = revision.bakedUrl
  copy.bakedAiImageIds[revision.index] = revision.bakedId
  if (revision.spec) copy.textOverlaySpecs[revision.index] = revision.spec
  return copy
}
