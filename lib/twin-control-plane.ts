import type { NeonQueryFunction } from "@neondatabase/serverless"

export type TwinLeadStatus = "new" | "qualified" | "offer_sent" | "booked" | "closed" | "rejected"

export type TwinQueueStatus = "pending" | "approved" | "rejected"
export type TwinQueueType = "content_draft" | "offer_email" | "dm_response"

export async function ensureTwinQueueSchema(sql: NeonQueryFunction<any, any>) {
  await sql`
    CREATE TABLE IF NOT EXISTS twin_approval_queue (
      id BIGSERIAL PRIMARY KEY,
      item_type VARCHAR(50) NOT NULL,
      lead_id INTEGER,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
      approved_at TIMESTAMP,
      rejected_at TIMESTAMP
    )
  `

  await sql`
    CREATE INDEX IF NOT EXISTS idx_twin_approval_queue_status_created_at
    ON twin_approval_queue(status, created_at DESC)
  `
}

export function toTwinLeadStatus(pipelineStage: string | null, status: string | null): TwinLeadStatus {
  const stage = String(pipelineStage || "").toLowerCase()
  const legacyStatus = String(status || "").toLowerCase()

  if (stage === "closed_won") return "closed"
  if (stage === "closed_lost" || legacyStatus === "closed_lost" || stage === "nurture") return "rejected"
  if (stage === "offer_sent") return "offer_sent"
  if (stage === "call_booked" || stage === "call_completed") return "booked"
  if (stage === "qualified_queue" || stage === "contacted") return "qualified"
  return "new"
}

export function toPipelineUpdate(status: TwinLeadStatus): {
  pipelineStage: string
  status: string
  setCallBookedAt: boolean
  setOfferSentAt: boolean
  setClosedAt: boolean
} {
  switch (status) {
    case "qualified":
      return {
        pipelineStage: "qualified_queue",
        status: "pending_review",
        setCallBookedAt: false,
        setOfferSentAt: false,
        setClosedAt: false,
      }
    case "offer_sent":
      return {
        pipelineStage: "offer_sent",
        status: "offer_sent",
        setCallBookedAt: false,
        setOfferSentAt: true,
        setClosedAt: false,
      }
    case "booked":
      return {
        pipelineStage: "call_booked",
        status: "calendly_sent",
        setCallBookedAt: true,
        setOfferSentAt: false,
        setClosedAt: false,
      }
    case "closed":
      return {
        pipelineStage: "closed_won",
        status: "closed_won",
        setCallBookedAt: false,
        setOfferSentAt: false,
        setClosedAt: true,
      }
    case "rejected":
      return {
        pipelineStage: "closed_lost",
        status: "closed_lost",
        setCallBookedAt: false,
        setOfferSentAt: false,
        setClosedAt: true,
      }
    case "new":
    default:
      return {
        pipelineStage: "applied",
        status: "pending_review",
        setCallBookedAt: false,
        setOfferSentAt: false,
        setClosedAt: false,
      }
  }
}

