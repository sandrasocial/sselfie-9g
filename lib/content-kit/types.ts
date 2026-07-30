// CONTENT-VISUALS-01: carousel deck schema. Slides are stored as JSONB in
// content_carousels and rendered to 1080x1350 PNGs by the next/og render route.

export type CarouselSlideKind =
  | "hook"
  | "step"
  | "list"
  | "quote"
  | "cta"
  | "photo"
  | "grid"
  | "before-after"

export type ContentAccent = {
  type: "arrow" | "circle" | "squiggle"
  /** Renderer hint for the callout position. Keep broad so Maya can target practical screenshot areas. */
  target:
    | "top-left"
    | "top-right"
    | "middle-left"
    | "middle-right"
    | "bottom-left"
    | "bottom-right"
    | "center"
    | "keyword"
  color?: string
  label?: string
}

export type ContentOverlayAsset = {
  url: string
  label?: string
  /** Renderer hint: screenshots/product proof usually sit opposite the text block. */
  placement?: "top-right" | "middle-right" | "bottom-right" | "center" | "full" | "left" | "right"
  fit?: "cover" | "contain"
}

export type CarouselSlide = {
  kind: CarouselSlideKind
  eyebrow?: string
  title: string
  body?: string
  items?: string[]
  stepNumber?: number
  footer?: string
  /** Full-bleed or finished slide image (Vercel Blob URL). */
  imageUrl?: string
  /** Tutorial scene slides can ask gpt-image-2 to bake short text into the generated image. */
  headlineRender?: "baked" | "composited"
  /** CAROUSEL-04: app/customer Maya can pass the shared Creative Plan through to the redesign engine. */
  purpose?: string
  visualConcept?: string
  imagePromptDirection?: string
  referenceImageStrategy?: string
  visualReason?: string
  textSafeArea?: string
  /** 2x2 grid images for kind "grid" (the prompts.ig signature: same person,
   * four worlds). Title overlays the grid when present. */
  gridUrls?: string[]
  /** Legacy/fallback screenshots or proof images for pre-CAROUSEL-03 decks. */
  overlayAssets?: ContentOverlayAsset[]
  /** Legacy/fallback tutorial callouts for pre-CAROUSEL-03 decks. */
  accents?: ContentAccent[]
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
  /** 2026-07-04 Story Engine rebuild: a warm closing beat with no product ask, for sequences
   *  that are pure connection (My Story / My Clients / My Beliefs / My Life topics that never
   *  called for an offer). Not every sequence needs to end in "cta" anymore. */
  | "close"

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
  /** Full-bleed or finished story image (Vercel Blob URL). */
  imageUrl?: string
  /** STORY-OVERLAY-01: "composited" = our local renderer draws text over the real selected photo
   * (preferred). "baked" = legacy gpt-image-2 slide with text already in the PNG (back-compat). */
  headlineRender?: "baked" | "composited"
  /** STORY-OVERLAY-01: which vertical band the text + scrim sit in. Default "bottom" (lower third,
   * face stays clear). "top" for photos whose subject sits low. */
  textZone?: "top" | "bottom"
  /** STORY-OVERLAY-01: draw a subtle semi-opaque panel behind the text when the photo is busy. */
  textPanel?: boolean
  /** STORY-OVERLAY-02: horizontal side the text sits on (LLM-picked from the photo's negative space). */
  textAlign?: "left" | "center" | "right"
  /** STORY-OVERLAY-02: CSS object-position for the 9:16 cover crop, e.g. "50% 30%", so the subject
   * stays framed instead of a blind center crop. */
  objectPosition?: string
  /** STORY-OVERLAY-02: how much scrim the text needs to stay readable on this photo. */
  scrimStrength?: "light" | "medium" | "strong"
  /** STORY-OVERLAY-03 (editor): overall text scale multiplier (1 = default), for manual resize. */
  textScale?: number
  /** STORY-OVERLAY-03 (editor): fine manual nudge of the text block, in 1080x1920 px. */
  textOffsetX?: number
  textOffsetY?: number
  /** Legacy/fallback screenshots or proof images for pre-CAROUSEL-03 story decks. */
  overlayAssets?: ContentOverlayAsset[]
}

export type StorySequence = {
  id: number
  title: string
  topic: string
  slides: StorySlide[]
  status: "draft" | "approved" | "posted"
  sourceShootId?: number | null
  sourceShootTitle?: string | null
  createdAt: string
}

// SHOOT-STUDIO-01: an inspiration-driven photoshoot — the content unit everything spins from.

export type ShootShotRole =
  | "establishing-full-body"
  | "movement-lifestyle-action"
  | "seated-hero"
  | "profile"
  | "close-portrait"
  | "cover-safe-hero"
  | "true-detail"

export type ShootShot = {
  /** Stable per-shoot id, "shot-1".."shot-n". */
  id: string
  /** Structural role used to keep a shoot varied and stop detail shots from becoming portraits. */
  shotRole?: ShootShotRole
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
  /** Persisted render state so failed cards are not retried blindly after a reload. */
  renderStatus?: "pending" | "completed" | "moderation_blocked" | "failed"
  /** Stable machine-readable failure reason for the admin API and UI. */
  renderErrorCode?: "moderation_blocked" | "generation_failed" | null
  /** Safe admin-facing explanation. Never stores the raw provider error. */
  renderErrorMessage?: string | null
  /** Number of generation requests made for this shot. */
  renderAttempts?: number
  lastRenderAttemptAt?: string | null
  /** Global Prompt Vault number after this shot is published, used for reels/posts. */
  promptNumber?: string | null
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
  /** "story" = varied collection (one inspiration per shot, no continuity). Default "cohesive". */
  collectionType?: "cohesive" | "story"
  /** Story-collection vibe/style, e.g. "iPhone mirror selfie". */
  vibe?: string | null
  inspirationUrls: string[]
  /** First selfie, kept for the thumbnail + back-compat with older single-selfie shoots. */
  selfieUrl: string
  /** All identity references (front, side profiles, full body). At least one. */
  selfieUrls: string[]
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
  sourceShootId?: number | null
  sourceShootTitle?: string | null
  sourcePeriodStart: string | null
  createdAt: string
}
