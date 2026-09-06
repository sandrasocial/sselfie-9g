import { sql } from "@/lib/db/client"
import { getResendApiKey } from "@/lib/resend/api-key"

export function inboundAddress(value: unknown): string | null {
  if (typeof value !== "string" || /[\r\n]/.test(value)) return null
  const address = (value.match(/<([^<>]+)>$/)?.[1] || value).trim().toLowerCase()
  return /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/.test(address) ? address : null
}

// Google documents these two consumer-mail domains as the same inbox:
// https://support.google.com/mail/answer/10313
// This is for support correspondence only, never login or entitlement identity.
export function correspondenceAddresses(email: string): string[] {
  if (email.endsWith("@gmail.com")) return [email, email.replace(/@gmail\.com$/, "@googlemail.com")]
  if (email.endsWith("@googlemail.com")) return [email, email.replace(/@googlemail\.com$/, "@gmail.com")]
  return [email]
}

export function isAutomaticReply(email: { subject?: string; headers?: Record<string, unknown> }): boolean {
  const headers = Object.fromEntries(Object.entries(email.headers || {}).map(([key, value]) => [key.toLowerCase(), String(value).toLowerCase()]))
  return Boolean(
    (headers["auto-submitted"] && headers["auto-submitted"] !== "no") ||
    headers["x-autoreply"] || headers["x-autorespond"] ||
    /^(bulk|list|junk)$/.test(headers.precedence || "") ||
    /^(automatic reply|auto.?reply|out of office|delivery status notification|undeliverable):?/i.test(email.subject || ""),
  )
}

// Called only AFTER Resend signature verification. Incoming text is customer data,
// never an instruction to send, bill, grant access, or execute an agent action.
export async function receiveCustomerEmail(data: any) {
  const id = typeof data?.email_id === "string" ? data.email_id : ""
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { ignored: true, reason: "invalid_email_id" }
  const sender = inboundAddress(data.from)
  const recipients: Array<string | null> = (Array.isArray(data.to) ? data.to : [data.to]).map(inboundAddress)
  if (!sender || sender.endsWith("@sselfie.ai") || !recipients.some(address => address === "hello@sselfie.ai" || address === "support@sselfie.ai")) {
    return { ignored: true, reason: "outside_customer_mailbox" }
  }

  const addresses = correspondenceAddresses(sender)
  const known = await sql`
    SELECT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = ANY(${addresses}::text[]))
      OR EXISTS(SELECT 1 FROM freebie_subscribers WHERE LOWER(email) = ANY(${addresses}::text[]))
      OR EXISTS(SELECT 1 FROM email_logs WHERE LOWER(user_email) = ANY(${addresses}::text[])
        AND status IN ('sent', 'delivered') AND created_at > NOW() - INTERVAL '30 days') AS known
  `
  // Unknown mail remains in Resend. Do not import DMARC reports, vendor mail,
  // or unrelated inbox contents into the commercial briefing.
  if (!known[0]?.known) return { ignored: true, reason: "unknown_sender_kept_in_resend" }
  const existing = await sql`
    SELECT id FROM email_events WHERE event_type = 'email.received'
      AND metadata->>'resend_message_id' = ${id} LIMIT 1
  `
  if (existing.length) return { recorded: true, duplicate: true }

  const response = await fetch(`https://api.resend.com/emails/receiving/${id}`, {
    headers: { Authorization: `Bearer ${getResendApiKey()}` },
    signal: AbortSignal.timeout(10000),
  })
  if (!response.ok) throw new Error(`Resend receiving lookup failed (${response.status})`)
  const email = await response.json()
  if (email.id !== id || inboundAddress(email.from) !== sender) throw new Error("Received email identity mismatch")
  const automated = isAutomaticReply(email)
  const metadata = {
    provider: "resend", direction: "inbound", untrusted_content: true,
    resend_message_id: id, sender_email: sender, recipient_email: sender,
    subject: String(email.subject || "(no subject)").slice(0, 255),
    text: typeof email.text === "string" ? email.text.slice(0, 6000) : "HTML-only message. Read the original in Resend before replying.",
    provider_created_at: email.created_at, received_at: new Date().toISOString(),
    message_id: typeof email.message_id === "string" ? email.message_id : null,
    automated,
  }
  // Serialize retries by provider email id. The INSERT runs in a fresh statement
  // snapshot after the lock, so concurrent deliveries cannot duplicate this row.
  await sql.transaction([
    sql`SELECT pg_advisory_xact_lock(hashtext(${`resend-inbound:${id}`}))`,
    sql`INSERT INTO email_events (email_type, event_type, status, metadata, created_at, recipient_count)
      SELECT 'customer_reply', 'email.received', ${automated ? "ignored" : "needs_reply"}, ${JSON.stringify(metadata)}::jsonb, NOW(), 1
      WHERE NOT EXISTS (SELECT 1 FROM email_events WHERE event_type = 'email.received' AND metadata->>'resend_message_id' = ${id})`,
  ], { isolationLevel: "ReadCommitted" })
  return { recorded: true, automated }
}

// A signed delivery event plus the exact thread header and recipient is evidence
// of a reply. Another campaign to the same address is not an answered question.
export async function markCustomerEmailAnswered(eventType: string, data: any) {
  if (eventType !== "email.delivered" || !data?.email_id) return
  const from = inboundAddress(data.from)
  if (!from || !["hello@sselfie.ai", "support@sselfie.ai"].includes(from)) return
  const headers: Array<{ name: string; value: unknown }> = Array.isArray(data.headers)
    ? data.headers
    : Object.entries(data.headers || {}).map(([name, value]) => ({ name, value }))
  const reference = headers.find(header => header.name?.toLowerCase() === "in-reply-to")?.value
  if (typeof reference !== "string" || !reference.trim() || /[\r\n]/.test(reference)) return
  const recipients = (Array.isArray(data.to) ? data.to : [data.to]).map(inboundAddress).filter(Boolean)
  if (!recipients.length) return
  await sql`
    UPDATE email_events SET status = 'answered', metadata = metadata || ${JSON.stringify({
      answered_by_resend_message_id: data.email_id, answered_at: new Date().toISOString(),
    })}::jsonb
    WHERE event_type = 'email.received' AND status = 'needs_reply'
      AND metadata->>'message_id' = ${reference.trim()}
      AND LOWER(metadata->>'sender_email') = ANY(${recipients}::text[])
  `
}

export type CustomerEmailReply = {
  id: string; user_email: string; subject: string; message: string;
  provider_email_id: string; message_id: string; created_at: string; status: string;
}

export async function getCustomerEmailReplies(email?: string): Promise<CustomerEmailReply[]> {
  const addresses = email ? correspondenceAddresses(email) : []
  const rows = await sql`
    SELECT id::text, metadata->>'sender_email' AS user_email,
      metadata->>'subject' AS subject, metadata->>'text' AS message,
      metadata->>'resend_message_id' AS provider_email_id,
      metadata->>'message_id' AS message_id,
      metadata->>'provider_created_at' AS created_at, status
    FROM email_events
    WHERE event_type = 'email.received' AND status = 'needs_reply'
      AND created_at > NOW() - INTERVAL '30 days'
      AND (${email || null}::text IS NULL OR LOWER(metadata->>'sender_email') = ANY(${addresses}::text[]))
    ORDER BY id DESC LIMIT 20
  `
  return rows as CustomerEmailReply[]
}
