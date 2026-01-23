export interface ResendSegmentSummary {
  id: string
  name: string
  size: number
}

function getResendApiKey() {
  return process.env.RESEND_API_KEY || ""
}

export async function getSegmentSizes(): Promise<ResendSegmentSummary[]> {
  const apiKey = getResendApiKey()
  if (!apiKey) {
    console.warn("[resend] RESEND_API_KEY not configured, skipping segment fetch")
    return []
  }

  try {
    const response = await fetch("https://api.resend.com/segments", {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("[resend] Failed to fetch segments:", response.status, errorText)
      return []
    }

    const payload = await response.json()
    const segments = Array.isArray(payload?.data) ? payload.data : []

    return segments.map((segment: any) => ({
      id: segment.id,
      name: segment.name || "Untitled Segment",
      size: Number(segment.contact_count || 0),
    }))
  } catch (error) {
    console.error("[resend] Exception fetching segments:", error)
    return []
  }
}

export async function getSegmentCountById(
  segmentId: string,
  segments?: ResendSegmentSummary[],
): Promise<number> {
  if (!segmentId) return 0
  const segmentList = segments || (await getSegmentSizes())
  const match = segmentList.find((segment) => segment.id === segmentId)
  return match?.size || 0
}
