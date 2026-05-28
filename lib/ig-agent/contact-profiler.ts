import { sql } from "@/lib/db/client"

export type IgContactContext = {
  username: string
  fullName: string | null
  isIcelandic: boolean
  tags: string[]
  linkedBuyerHistory: string | null
  previousConversationSummary: string | null
}

type ContactRow = {
  ig_user_id: string
  username: string | null
  full_name: string | null
  is_icelandic: boolean | null
  tags: string[] | null
  linked_neon_user_id: string | null
}

type EntitlementRow = {
  product_id: string
  status: string
}

type SubscriptionRow = {
  plan_name: string
  status: string
}

type MemoryRow = {
  memory_type: string
  content: string
}

type MessageRow = {
  from_type: string
  content: string
}

export async function buildContactContext(igUserId: string): Promise<IgContactContext> {
  const contacts = await sql`
    SELECT ig_user_id, username, full_name, is_icelandic, tags, linked_neon_user_id
    FROM ig_contacts
    WHERE ig_user_id = ${igUserId}
    LIMIT 1
  `
  const contact = contacts[0] as ContactRow | undefined

  const [messages, memories, entitlements, subscriptions] = await Promise.all([
    sql`
      SELECT m.from_type, m.content, m.sent_at
      FROM ig_messages m
      JOIN ig_conversations c ON c.id = m.conversation_id
      WHERE c.ig_user_id = ${igUserId}
      ORDER BY m.sent_at DESC
      LIMIT 5
    `.catch(() => []),
    sql`
      SELECT memory_type, content, created_at
      FROM ig_contact_memory
      WHERE ig_user_id = ${igUserId}
      ORDER BY created_at DESC
      LIMIT 5
    `.catch(() => []),
    contact?.linked_neon_user_id
      ? sql`
          SELECT product_id, status, created_at
          FROM user_entitlements
          WHERE user_id = ${contact.linked_neon_user_id}
          ORDER BY created_at DESC
          LIMIT 5
        `.catch(() => [])
      : Promise.resolve([]),
    contact?.linked_neon_user_id
      ? sql`
          SELECT plan_name, status, created_at
          FROM subscriptions
          WHERE user_id = ${contact.linked_neon_user_id}
          ORDER BY created_at DESC
          LIMIT 5
        `.catch(() => [])
      : Promise.resolve([]),
  ])

  const purchaseBits = [
    ...(entitlements as EntitlementRow[]).map((row) => `${row.product_id} (${row.status})`),
    ...(subscriptions as SubscriptionRow[]).map((row) => `${row.plan_name} subscription (${row.status})`),
  ]

  const memoryBits = (memories as MemoryRow[]).map((row) => `${row.memory_type}: ${row.content}`)
  const messageSummary = (messages as MessageRow[])
    .reverse()
    .map((row) => `${row.from_type}: ${String(row.content).slice(0, 160)}`)
    .join("\n")

  return {
    username: contact?.username || "unknown",
    fullName: contact?.full_name || null,
    isIcelandic: Boolean(contact?.is_icelandic),
    tags: contact?.tags || [],
    linkedBuyerHistory: purchaseBits.length > 0 ? purchaseBits.join(", ") : null,
    previousConversationSummary: [messageSummary, ...memoryBits].filter(Boolean).join("\n") || null,
  }
}
