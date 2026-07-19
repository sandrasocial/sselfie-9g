export type FeedArchetype = "personal_brand" | "service" | "product" | "expert"
export type FeedContentRole = "connect" | "teach" | "prove" | "offer" | "process" | "atmosphere"
export type CalendarPlannedFormat = "photo" | "carousel" | "reel-cover"
export type FeedVisualWeight = "quiet" | "strong"
export type FeedSourcePreference = "member_content_first"

export interface CohesiveFeedSlot {
  position: number
  contentRole: FeedContentRole
  plannedFormat: CalendarPlannedFormat
  shotRole: string
  subjectKind: "person" | "work" | "object" | "place" | "text"
  sourcePreference: FeedSourcePreference
  visualWeight: FeedVisualWeight
  faceRequired: boolean
  textOverlay: boolean
  enginePostType: string
  visualDirection: string
  neighborRelationship: string
}

export interface CohesiveFeedPlan {
  archetype: FeedArchetype
  feedStory: string
  visualRhythm: string
  slots: CohesiveFeedSlot[]
}

interface CohesiveFeedPlanInput {
  personalBrand: unknown
  postCount: number
  grid: readonly string[]
}

type SlotIntent = Pick<CohesiveFeedSlot, "contentRole" | "plannedFormat" | "subjectKind">

const ARCHETYPE_PATTERNS: Record<FeedArchetype, readonly SlotIntent[]> = {
  personal_brand: [
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
    { contentRole: "teach", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "process", plannedFormat: "reel-cover", subjectKind: "work" },
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "offer", plannedFormat: "photo", subjectKind: "object" },
    { contentRole: "prove", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
    { contentRole: "process", plannedFormat: "photo", subjectKind: "work" },
  ],
  service: [
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "process", plannedFormat: "reel-cover", subjectKind: "work" },
    { contentRole: "teach", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "prove", plannedFormat: "photo", subjectKind: "work" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
    { contentRole: "offer", plannedFormat: "photo", subjectKind: "object" },
    { contentRole: "connect", plannedFormat: "carousel", subjectKind: "person" },
    { contentRole: "teach", plannedFormat: "reel-cover", subjectKind: "work" },
    { contentRole: "prove", plannedFormat: "photo", subjectKind: "object" },
  ],
  product: [
    { contentRole: "offer", plannedFormat: "photo", subjectKind: "object" },
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
    { contentRole: "process", plannedFormat: "reel-cover", subjectKind: "work" },
    { contentRole: "teach", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "prove", plannedFormat: "photo", subjectKind: "object" },
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "offer", plannedFormat: "carousel", subjectKind: "object" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
  ],
  expert: [
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "teach", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "process", plannedFormat: "reel-cover", subjectKind: "work" },
    { contentRole: "prove", plannedFormat: "photo", subjectKind: "work" },
    { contentRole: "atmosphere", plannedFormat: "photo", subjectKind: "place" },
    { contentRole: "teach", plannedFormat: "carousel", subjectKind: "text" },
    { contentRole: "offer", plannedFormat: "photo", subjectKind: "object" },
    { contentRole: "connect", plannedFormat: "photo", subjectKind: "person" },
    { contentRole: "prove", plannedFormat: "reel-cover", subjectKind: "work" },
  ],
}

const FEED_STORIES: Record<FeedArchetype, string> = {
  personal_brand: "Her point of view leads, then her work, useful ideas, proof, and the offer.",
  service: "The founder leads, then the process, useful teaching, real proof, and the offer.",
  product: "The product leads, supported by people, materials, details, proof, and the offer.",
  expert: "The founder leads, then teaching, real work, proof, useful resources, and the offer.",
}

const VISUAL_RHYTHMS: Record<FeedArchetype, string> = {
  personal_brand:
    "People, working moments, places, details, and quiet text covers with room to breathe.",
  service:
    "People, real work, results, details, and quiet teaching covers balanced across the grid.",
  product: "Products, people, materials, close details, and wider scenes balanced across the grid.",
  expert:
    "People, teaching covers, working moments, useful details, and proof balanced across the grid.",
}

function profileSearchText(personalBrand: unknown): string {
  if (!personalBrand || typeof personalBrand !== "object") return ""
  const profile = personalBrand as Record<string, unknown>
  return [
    profile.business_type,
    profile.brand_name,
    profile.current_situation,
    profile.content_goals,
    profile.content_themes,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase()
}

export function resolveFeedArchetype(personalBrand: unknown): FeedArchetype {
  const text = profileSearchText(personalBrand)
  if (/\bpersonal brand\b/.test(text) && /\b(photograph\w*|studio|agency)\b/.test(text)) {
    return "service"
  }
  if (/\bpersonal brand\b/.test(text)) return "personal_brand"
  if (/\b(course|educator|education|teacher|teaching|academy|author|speaker)\b/.test(text)) {
    return "expert"
  }
  if (
    /\b(product|shop|e-?commerce|fashion|clothing|jewellery|jewelry|skincare|collection)\b/.test(
      text
    )
  ) {
    return "product"
  }
  if (
    /\b(service|coach|consultant|photograph\w*|salon|stylist|therap\w*|designer|studio|clinic)\b/.test(
      text
    )
  ) {
    return "service"
  }
  return "personal_brand"
}

function shotRoleFor(
  enginePostType: string,
  subjectKind: CohesiveFeedSlot["subjectKind"],
  index: number
) {
  if (enginePostType === "flatlay") return "flatlay"
  if (enginePostType === "detail") return "detail"
  if (subjectKind === "work") return "working"
  const peopleShots = ["portrait", "half-body", "full-body", "wide portrait"]
  return peopleShots[index % peopleShots.length]
}

function visualDirectionFor(slot: SlotIntent, shotRole: string): string {
  const job: Record<FeedContentRole, string> = {
    connect: "Let people see the person behind your brand",
    teach: "Make one useful idea easy to understand",
    prove: "Show real proof or a real result",
    offer: "Make your offer clear and easy to notice",
    process: "Show the real work or how it comes together",
    atmosphere: "Give your feed a quiet visual pause that still belongs to your brand",
  }
  const formatNote =
    slot.plannedFormat === "carousel"
      ? "Keep every slide together and use slide one as the cover."
      : slot.plannedFormat === "reel-cover"
        ? "Use baked-in title text so the cover is ready to post."
        : ""
  const faceNote = slot.subjectKind === "person" ? "Keep your real face and features." : ""
  return [
    `${job[slot.contentRole]}.`,
    `Use a ${shotRole} composition.`,
    "Start with a photo or video you already have.",
    faceNote,
    formatNote,
  ]
    .filter(Boolean)
    .join(" ")
}

export function proModeTypeForFormat(format: CalendarPlannedFormat): string {
  if (format === "carousel") return "carousel-slides"
  if (format === "reel-cover") return "reel-cover"
  return "workbench"
}

export function buildCohesiveFeedPlan(input: CohesiveFeedPlanInput): CohesiveFeedPlan {
  const archetype = resolveFeedArchetype(input.personalBrand)
  const pattern = ARCHETYPE_PATTERNS[archetype]
  const safeGrid = input.grid.length > 0 ? input.grid : ["selfie", "flatlay", "detail"]
  const slots = Array.from({ length: Math.max(1, input.postCount) }, (_, index) => {
    const intent = pattern[index % pattern.length]
    const enginePostType = safeGrid[index % safeGrid.length] ?? "selfie"
    const shotRole = shotRoleFor(enginePostType, intent.subjectKind, index)
    return {
      position: index + 1,
      ...intent,
      sourcePreference: "member_content_first" as const,
      visualWeight: (index % 2 === 0 ? "strong" : "quiet") as FeedVisualWeight,
      faceRequired: enginePostType === "selfie",
      textOverlay: intent.plannedFormat === "carousel" || intent.plannedFormat === "reel-cover",
      enginePostType,
      shotRole,
      visualDirection: visualDirectionFor(intent, shotRole),
      neighborRelationship:
        index === 0
          ? "Open the story and set the tone for the posts beside it."
          : "Change the subject or visual weight from the post before it.",
    }
  })

  return {
    archetype,
    feedStory: FEED_STORIES[archetype],
    visualRhythm: VISUAL_RHYTHMS[archetype],
    slots,
  }
}

export function describeCohesiveFeedPlan(plan: CohesiveFeedPlan): string {
  return plan.slots
    .map(
      slot =>
        `POST ${slot.position}: ${slot.contentRole}; ${slot.plannedFormat}; ${slot.shotRole}; ${slot.subjectKind}; ${slot.visualWeight}; use member content first; ${slot.visualDirection}`
    )
    .join("\n")
}
