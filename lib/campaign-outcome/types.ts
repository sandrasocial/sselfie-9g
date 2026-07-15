export type CampaignOrderStatus =
  | "awaiting_intake"
  | "inputs_ready"
  | "generating"
  | "needs_qa"
  | "delivered"
  | "generation_failed"
  | "refunded"

export type CampaignPostRole = "attention" | "trust" | "offer"

export type CampaignPost = {
  role: CampaignPostRole
  headline: string
  caption: string
  cta: string
  visualPrompt: string
  visualUrl: string
  whyThisPost: string
}

export type CampaignData = {
  visualDirection: string
  firstPostReason: string
  posts: CampaignPost[]
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
  platform: string | null
  campaign_data: CampaignData | Record<string, never>
  generation_attempts: number
  generation_error: string | null
  admin_notes: string | null
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

export function isCampaignData(value: unknown): value is CampaignData {
  if (!value || typeof value !== "object") return false
  const data = value as Partial<CampaignData>
  return (
    typeof data.visualDirection === "string" &&
    typeof data.firstPostReason === "string" &&
    Array.isArray(data.posts) &&
    data.posts.length === 3 &&
    data.posts.every(
      post =>
        post &&
        typeof post.role === "string" &&
        typeof post.headline === "string" &&
        typeof post.caption === "string" &&
        typeof post.cta === "string" &&
        typeof post.visualPrompt === "string" &&
        typeof post.visualUrl === "string"
    )
  )
}
