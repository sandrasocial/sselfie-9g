export async function getAudienceContacts(audienceId: string) {
  const resendApiKey = process.env.RESEND_API_KEY

  if (!resendApiKey) {
    throw new Error("RESEND_API_KEY is not configured")
  }

  console.log("[v0] Fetching contacts from Resend audience:", audienceId)

  const response = await fetch(`https://api.resend.com/audiences/${audienceId}/contacts`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("[v0] Resend API error:", response.status, errorText)
    throw new Error(`Failed to fetch contacts from Resend: ${response.status} ${errorText}`)
  }

  const data = await response.json()
  console.log("[v0] Fetched contacts from Resend:", data?.data?.length || 0)

  // Filter out unsubscribed contacts
  const activeContacts = (data?.data || []).filter((contact: { unsubscribed: boolean }) => !contact.unsubscribed)

  console.log("[v0] Active (subscribed) contacts:", activeContacts.length)

  return activeContacts
}

export async function getAudienceContactCount(audienceId: string): Promise<number> {
  try {
    const contacts = await getAudienceContacts(audienceId)
    return contacts.length
  } catch (error) {
    console.error("[v0] Error fetching audience contact count:", error)
    return 0
  }
}
