// CONTENT-VISUALS-01: carousel deck schema. Slides are stored as JSONB in
// content_carousels and rendered to 1080x1350 PNGs by the next/og render route.

export type CarouselSlideKind = "hook" | "step" | "list" | "quote" | "cta"

export type CarouselSlide = {
  kind: CarouselSlideKind
  eyebrow?: string
  title: string
  body?: string
  items?: string[]
  stepNumber?: number
  footer?: string
}

export type DemoPair = {
  id: number
  title: string
  editPrompt: string
  beforeUrl: string
  afterUrl: string
  compositeUrl: string | null
  createdAt: string
}

export type CarouselDeck = {
  id: number
  title: string
  slug: string
  caption: string
  slides: CarouselSlide[]
  status: "draft" | "approved" | "posted"
  sourcePeriodStart: string | null
  createdAt: string
}
