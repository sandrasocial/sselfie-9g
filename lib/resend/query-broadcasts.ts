import { getResendApiKey } from "./api-key"

export interface ResendBroadcastSummary {
  id: string
  name?: string | null
  subject?: string | null
  status?: string | null
  created_at?: string | null
  sent_at?: string | null
  scheduled_at?: string | null
  audience_id?: string | null
  segment_id?: string | null
}

export async function getRecentBroadcasts(limit = 10): Promise<ResendBroadcastSummary[]> {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not configured, skipping broadcast fetch")
    return []
  }

  try {
    const response = await fetch(`https://api.resend.com/broadcasts?limit=${limit}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[resend] Failed to fetch broadcasts:", response.status, errorText)
      return []
    }

    const payload = await response.json()
    const broadcasts = Array.isArray(payload?.data) ? payload.data : []

    return broadcasts as ResendBroadcastSummary[]
  } catch (error) {
    console.error("[resend] Exception fetching broadcasts:", error)
    return []
  }
}

export async function getBroadcastDetails(broadcastId: string) {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not configured, skipping broadcast fetch")
    return null
  }

  try {
    const response = await fetch(`https://api.resend.com/broadcasts/${broadcastId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[resend] Failed to fetch broadcast details:", response.status, errorText)
      return null
    }

    const payload = await response.json()
    return payload?.data || payload || null
  } catch (error) {
    console.error("[resend] Exception fetching broadcast details:", error)
    return null
  }
}
