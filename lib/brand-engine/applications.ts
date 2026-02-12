export const BRAND_ENGINE_PIPELINE_STAGES = [
  "applied",
  "qualified_queue",
  "contacted",
  "call_booked",
  "call_completed",
  "offer_sent",
  "closed_won",
  "closed_lost",
  "nurture",
] as const

export type BrandEnginePipelineStage = (typeof BRAND_ENGINE_PIPELINE_STAGES)[number]

type QualificationInput = {
  revenue: string
  currentSpend: string
  hoursPerWeek: string
  readyToInvest: string
  offerType: string
  biggestBottleneck: string
  businessDescription: string
  whyInterested: string
}

type QualificationResult = {
  score: number
  qualified: boolean
  priorityTier: "high" | "medium" | "low"
  pipelineStage: BrandEnginePipelineStage
  notes: string
}

const REVENUE_SCORE: Record<string, number> = {
  "<50k": 10,
  "50-100k": 25,
  "100-250k": 65,
  "250-500k": 85,
  "500k+": 100,
}

const SPEND_SCORE: Record<string, number> = {
  "0-500": 15,
  "500-1500": 35,
  "1500-3000": 70,
  "3000+": 90,
}

const READY_SCORE: Record<string, number> = {
  yes: 100,
  maybe: 50,
  no: 0,
}

const HOURS_SCORE: Record<string, number> = {
  "5": 75,
  "10": 95,
  "15": 90,
  "20+": 80,
}

function scoreTextIntent(...parts: string[]): number {
  const text = parts.join(" ").toLowerCase()
  if (!text.trim()) return 20

  const highIntentSignals = [
    "ready",
    "launch",
    "scale",
    "stuck",
    "consistent",
    "convert",
    "pipeline",
    "sales",
    "revenue",
    "clients",
    "qualified",
    "system",
  ]

  let matched = 0
  for (const signal of highIntentSignals) {
    if (text.includes(signal)) matched += 1
  }

  return Math.min(100, 20 + matched * 10)
}

export function calculateQualificationScore(input: QualificationInput): QualificationResult {
  const revenueScore = REVENUE_SCORE[input.revenue] ?? 20
  const spendScore = SPEND_SCORE[input.currentSpend] ?? 20
  const readyScore = READY_SCORE[input.readyToInvest] ?? 20
  const hoursScore = HOURS_SCORE[input.hoursPerWeek] ?? 60
  const intentScore = scoreTextIntent(
    input.biggestBottleneck,
    input.businessDescription,
    input.whyInterested,
  )
  const offerFitBonus = input.offerType === "cohort" ? 8 : input.offerType === "both" ? 5 : 0

  const weighted =
    revenueScore * 0.33 +
    spendScore * 0.24 +
    readyScore * 0.2 +
    hoursScore * 0.08 +
    intentScore * 0.15 +
    offerFitBonus

  const score = Math.max(0, Math.min(100, Math.round(weighted)))
  const qualified = score >= 55 && input.readyToInvest !== "no"
  const priorityTier: "high" | "medium" | "low" =
    score >= 80 ? "high" : score >= 60 ? "medium" : "low"
  const pipelineStage: BrandEnginePipelineStage = qualified ? "qualified_queue" : "nurture"

  const notes = [
    `revenue_score=${revenueScore}`,
    `spend_score=${spendScore}`,
    `ready_score=${readyScore}`,
    `hours_score=${hoursScore}`,
    `intent_score=${intentScore}`,
    `offer_fit_bonus=${offerFitBonus}`,
    `final_score=${score}`,
  ].join("; ")

  return {
    score,
    qualified,
    priorityTier,
    pipelineStage,
    notes,
  }
}

export function resolveLeadSource(sourceChannel?: string, sourceDetail?: string): {
  channel: string
  detail: string | null
} {
  const channel = (sourceChannel || "unknown").trim().toLowerCase()
  const detail = sourceDetail?.trim() || null

  if (!channel) {
    return { channel: "unknown", detail }
  }

  return { channel, detail }
}

export async function ensureBrandEngineApplicationsSchema(sql: any) {
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS offer_type VARCHAR(50) DEFAULT 'cohort'
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS source_channel VARCHAR(80) DEFAULT 'unknown'
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS source_detail TEXT
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS lead_tags JSONB DEFAULT '[]'::jsonb
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS pipeline_stage VARCHAR(50) DEFAULT 'applied'
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS qualification_score INTEGER DEFAULT 0
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS qualification_notes TEXT
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS priority_tier VARCHAR(20) DEFAULT 'low'
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS draft_mode BOOLEAN DEFAULT TRUE
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS call_booked_at TIMESTAMP
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS call_completed_at TIMESTAMP
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS offer_sent_at TIMESTAMP
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS closed_at TIMESTAMP
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS closed_reason TEXT
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS cash_collected_cents INTEGER DEFAULT 0
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS expected_value_cents INTEGER DEFAULT 0
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
  `

  await sql`CREATE INDEX IF NOT EXISTS idx_brand_engine_applications_pipeline_stage ON brand_engine_applications(pipeline_stage)`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_engine_applications_score ON brand_engine_applications(qualification_score DESC)`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_engine_applications_source ON brand_engine_applications(source_channel)`
  await sql`CREATE INDEX IF NOT EXISTS idx_brand_engine_applications_created_at ON brand_engine_applications(created_at DESC)`
}

export function expectedOfferValueCents(offerType: string) {
  switch (offerType) {
    case "vip":
      return 499700
    case "both":
      return 249700
    case "cohort":
    default:
      return 249700
  }
}
