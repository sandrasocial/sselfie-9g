// CONTENT-VISUALS-01: carousel deck schema. Slides are stored as JSONB in
// content_carousels and rendered to 1080x1350 PNGs by the next/og render route.

export type CarouselSlideKind = "hook" | "step" | "list" | "quote" | "cta" | "photo" | "grid"

export type CarouselSlide = {
  kind: CarouselSlideKind
  eyebrow?: string
  title: string
  body?: string
  items?: string[]
  stepNumber?: number
  footer?: string
  /** Full-bleed background image (Vercel Blob URL). When set, the slide renders
   * photo-first with a bottom scrim and white text — the niche-viral format. */
  imageUrl?: string
  /** 2x2 grid images for kind "grid" (the prompts.ig signature: same person,
   * four worlds). Title overlays the grid when present. */
  gridUrls?: string[]
}

export type StorySlideRole =
  | "hook"
  | "tension"
  | "shift"
  | "proof"
  | "teaching"
  | "desire"
  | "bridge"
  | "cta"

export type StoryLine = {
  text: string
  /** lead = big serif statement · support = clean sans · keyword = the giant CTA word */
  size: "lead" | "support" | "keyword"
  /** Emphasized phrases get the hand-drawn underline. 1-3 per slide max (doctrine). */
  emphasis?: boolean
}

export type StorySlide = {
  role: StorySlideRole
  lines: StoryLine[]
  /** Tiny handwritten accent note (Caveat), e.g. "this is the shift", "I'll send it" */
  note?: string
  /** Background photo (untouched — identity preservation is structural). */
  imageUrl?: string
}

export type StorySequence = {
  id: number
  title: string
  topic: string
  slides: StorySlide[]
  status: "draft" | "approved" | "posted"
  createdAt: string
}

// SHOOT-STUDIO-01: an inspiration-driven photoshoot — the content unit everything spins from.

export type ShootShot = {
  /** Stable per-shoot id, "shot-1".."shot-n". */
  id: string
  /** "Collection Name · Shot Name" (middle dot, vault card convention). */
  title: string
  /** Sandra-voice posting guidance (vault whenToUse convention). */
  whenToUse: string
  /** 5 dot-separated lowercase tags. */
  mood: string
  /** Full vault-anatomy prompt, shareable paste-into-ChatGPT form. */
  prompt: string
  /** Generated image (Vercel Blob URL). Absent until generation completes. */
  imageUrl?: string
  status: "draft" | "approved" | "killed"
}

export type ShootMessage = {
  role: "sandra" | "agent"
  text: string
  at: string
}

export type Shoot = {
  id: number
  title: string
  slug: string
  status: "draft" | "approved" | "archived"
  publishedVaultSlug?: string | null
  vaultPublishedAt?: string | null
  emailDropStatus?: "queued" | "included" | "skipped" | null
  inspirationUrls: string[]
  selfieUrl: string
  shots: ShootShot[]
  messages: ShootMessage[]
  createdAt: string
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
