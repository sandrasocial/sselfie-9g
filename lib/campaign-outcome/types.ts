export type CampaignOrderStatus =
  | "awaiting_intake"
  | "inputs_ready"
  | "generating"
  | "needs_qa"
  | "delivered"
  | "generation_failed"
  | "refunded"

export type CampaignPostRole = "attention" | "trust" | "offer"
export type CampaignStoryRole = "warmup" | "offer"

export type CampaignPhoto = {
  id: string
  kind: "primary" | "alternate"
  label: string
  visualPrompt: string
  whyThisPhoto: string
  visualUrl: string
}

export type CampaignPost = {
  role: CampaignPostRole
  headline: string
  caption: string
  cta: string
  visualPrompt: string
  visualUrl: string
  whyThisPost: string
}

export type CampaignSlide = {
  index: number
  headline: string
  body: string
  visualUrl: string
}

export type CampaignCarousel = {
  title: string
  slides: CampaignSlide[]
}

export type CampaignStorySequence = {
  role: CampaignStoryRole
  title: string
  slides: CampaignSlide[]
}

export type CampaignPublishDay = {
  day: number
  asset: string
  instruction: string
}

export type CampaignPatternReference = {
  id: string
  hookLine: string
  views: number | null
  source: "reel-corpus" | "viral-dna"
}

export type CampaignTraceability = {
  note: string
  intakeFields: Array<"what_she_sells" | "promotion" | "target_audience" | "voice_reference">
  corpusPattern: CampaignPatternReference
}

export type CampaignReelClipPlan = {
  id: string
  sourcePhotoId: string
  motionPrompt: string
}

export type CampaignReelClip = CampaignReelClipPlan & {
  sourcePhotoUrl: string
  status: "ready" | "unavailable"
  videoUrl: string | null
  note: string | null
}

export type CampaignReel = {
  hook: string
  script: string
  selfFilmedClipInstruction: string
  brollClips: CampaignReelClip[]
  overlayLines: string[]
  assembly: {
    clipOrder: string[]
    overlayPlacements: Array<{
      overlayLine: string
      overClipId: string
    }>
    targetLengthSeconds: number
    audioType: string
  }
  caption: string
  cta: string
  traceability: CampaignTraceability
}

export type CampaignData = {
  visualDirection: string
  firstPostReason: string
  photos: CampaignPhoto[]
  posts: CampaignPost[]
  carousel: CampaignCarousel
  storySequences: CampaignStorySequence[]
  publishPlan: CampaignPublishDay[]
  reel: CampaignReel
  traceability: CampaignTraceability
}

export type CampaignOrder = {
  id: number
  user_id: string | null
  customer_email: string
  customer_name: string | null
  access_token: string
  stripe_session_id: string
  stripe_payment_id: string | null
  stripe_customer_id: string | null
  source_order_id: number | null
  status: CampaignOrderStatus
  selfie_url: string | null
  what_she_sells: string | null
  promotion: string | null
  target_audience: string | null
  voice_reference: string | null
  platform: string | null
  campaign_data: CampaignData | Record<string, never>
  generation_attempts: number
  generation_error: string | null
  admin_notes: string | null
  redo_requested_at: string | Date | null
  refund_requested_at: string | Date | null
  is_test_mode: boolean
  purchased_at: string | Date
  intake_email_sent_at: string | Date | null
  inputs_completed_at: string | Date | null
  generated_at: string | Date | null
  qa_approved_at: string | Date | null
  delivered_at: string | Date | null
  delivery_email_sent_at: string | Date | null
  downloaded_at: string | Date | null
  published_answer: boolean | null
  published_confirmed_at: string | Date | null
  day7_email_sent_at: string | Date | null
  repeat_purchased_at: string | Date | null
  repeat_attribution_recorded_at: string | Date | null
  created_at: string | Date
  updated_at: string | Date
}

export type CampaignBuyerOrder = Pick<CampaignOrder, "status" | "campaign_data">

function isSlide(value: unknown): value is CampaignSlide {
  if (!value || typeof value !== "object") return false
  const slide = value as Partial<CampaignSlide>
  return (
    typeof slide.index === "number" &&
    typeof slide.headline === "string" &&
    typeof slide.body === "string" &&
    typeof slide.visualUrl === "string"
  )
}

function isTraceability(value: unknown): value is CampaignTraceability {
  if (!value || typeof value !== "object") return false
  const trace = value as Partial<CampaignTraceability>
  return (
    typeof trace.note === "string" &&
    Array.isArray(trace.intakeFields) &&
    Boolean(trace.corpusPattern) &&
    typeof trace.corpusPattern?.id === "string" &&
    typeof trace.corpusPattern?.hookLine === "string"
  )
}

function isReel(value: unknown): value is CampaignReel {
  if (!value || typeof value !== "object") return false
  const reel = value as Partial<CampaignReel>
  return (
    typeof reel.hook === "string" &&
    typeof reel.script === "string" &&
    typeof reel.selfFilmedClipInstruction === "string" &&
    Array.isArray(reel.brollClips) &&
    reel.brollClips.length <= 3 &&
    reel.brollClips.every(
      clip =>
        clip &&
        typeof clip.id === "string" &&
        typeof clip.sourcePhotoId === "string" &&
        typeof clip.sourcePhotoUrl === "string" &&
        (clip.status === "ready" || clip.status === "unavailable") &&
        (clip.videoUrl === null || typeof clip.videoUrl === "string")
    ) &&
    Array.isArray(reel.overlayLines) &&
    reel.overlayLines.length >= 2 &&
    Boolean(reel.assembly) &&
    Array.isArray(reel.assembly?.clipOrder) &&
    Array.isArray(reel.assembly?.overlayPlacements) &&
    reel.assembly.overlayPlacements.length === reel.overlayLines.length &&
    reel.assembly.overlayPlacements.every(
      placement =>
        typeof placement.overlayLine === "string" && typeof placement.overClipId === "string"
    ) &&
    typeof reel.assembly?.targetLengthSeconds === "number" &&
    typeof reel.assembly?.audioType === "string" &&
    typeof reel.caption === "string" &&
    typeof reel.cta === "string" &&
    isTraceability(reel.traceability)
  )
}

export function isCampaignData(value: unknown): value is CampaignData {
  if (!value || typeof value !== "object") return false
  const data = value as Partial<CampaignData>
  return (
    typeof data.visualDirection === "string" &&
    typeof data.firstPostReason === "string" &&
    Array.isArray(data.photos) &&
    data.photos.length === 6 &&
    data.photos.every(
      photo =>
        photo &&
        typeof photo.id === "string" &&
        (photo.kind === "primary" || photo.kind === "alternate") &&
        typeof photo.visualPrompt === "string" &&
        typeof photo.visualUrl === "string"
    ) &&
    Array.isArray(data.posts) &&
    data.posts.length === 3 &&
    data.posts.every(
      post =>
        post &&
        (post.role === "attention" || post.role === "trust" || post.role === "offer") &&
        typeof post.headline === "string" &&
        typeof post.caption === "string" &&
        typeof post.cta === "string" &&
        typeof post.visualPrompt === "string" &&
        typeof post.visualUrl === "string"
    ) &&
    Boolean(data.carousel) &&
    typeof data.carousel?.title === "string" &&
    Array.isArray(data.carousel?.slides) &&
    data.carousel.slides.length === 7 &&
    data.carousel.slides.every(isSlide) &&
    Array.isArray(data.storySequences) &&
    data.storySequences.length === 2 &&
    data.storySequences.every(
      sequence =>
        (sequence.role === "warmup" || sequence.role === "offer") &&
        typeof sequence.title === "string" &&
        Array.isArray(sequence.slides) &&
        sequence.slides.length === 5 &&
        sequence.slides.every(isSlide)
    ) &&
    Array.isArray(data.publishPlan) &&
    data.publishPlan.length === 5 &&
    data.publishPlan.every(
      day =>
        typeof day.day === "number" &&
        typeof day.asset === "string" &&
        typeof day.instruction === "string"
    ) &&
    isReel(data.reel) &&
    isTraceability(data.traceability)
  )
}
