import type { MayaLandingPageBlueprint } from "@/lib/maya/page-generation/types"

export type MayaGeneratedAssetType = "page" | "calendar" | "pdf"

export interface MayaCalendarPreviewPost {
  id: string
  dayLabel: string
  postType: "Reel" | "Carousel" | "Post"
  hook: string
  overlay: string
  imageUrl?: string
}

export interface MayaCalendarAssetPreviewData {
  kind: "calendar"
  monthLabel: string
  summary: string
  posts: MayaCalendarPreviewPost[]
}

export interface MayaPageAssetPreviewData {
  kind: "page"
  eyebrow: string
  headline: string
  truth: string
  ctaLabel: string
  heroImageUrl?: string
  supportImageUrls: string[]
  proofBullets: string[]
}

export interface MayaPdfAssetPreviewData {
  kind: "pdf"
  headline: string
  chapters: string[]
}

export type MayaGeneratedAssetPreviewData =
  | MayaCalendarAssetPreviewData
  | MayaPageAssetPreviewData
  | MayaPdfAssetPreviewData

export interface MayaGeneratedAsset {
  id: string
  assetType: MayaGeneratedAssetType
  title: string
  instruction: string
  previewText: string
  previewHtml: string
  previewData?: MayaGeneratedAssetPreviewData
  blueprint?: MayaLandingPageBlueprint
  url?: string
  createdAt: string
  status: "draft"
}
