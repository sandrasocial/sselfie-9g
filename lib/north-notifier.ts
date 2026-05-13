/**
 * north-notifier.ts
 * DO_NOT_REMOVE_WEBHOOK_COMPATIBILITY: Stripe subscription webhooks still call this
 * best-effort notifier. It is intentionally non-blocking and must not affect payments.
 * Fire-and-forget POST to OpenClaw (North agent) for business automation events.
 * Never throws — failures are logged silently so they never break Stripe webhook responses.
 */

const OPENCLAW_URL = "http://127.0.0.1:18789/hooks/agent"
const OPENCLAW_TOKEN = "14f297fbd737fd81356a89d9fab85a6aecdb9e71ca564ea3"

export interface NorthEvent {
  path: "stripe-new-member" | "stripe-cancellation" | "stripe-payment-failed"
  customerId: string
  email?: string
  firstName?: string
  plan?: string
  amount?: string
}

export async function notifyNorth(event: NorthEvent): Promise<void> {
  try {
    const messageLines = [
      `path=${event.path}`,
      `customerId=${event.customerId}`,
      event.email ? `email=${event.email}` : null,
      event.firstName ? `firstName=${event.firstName}` : null,
      event.plan ? `plan=${event.plan}` : null,
      event.amount ? `amount=${event.amount}` : null,
    ]
      .filter(Boolean)
      .join("\n")

    await fetch(OPENCLAW_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENCLAW_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: messageLines,
        name: event.path,
        agentId: "north",
        sessionKey: `hook:stripe:${event.path}:${event.customerId}`,
        wakeMode: "now",
        deliver: true,
        channel: "telegram",
        to: "6778427140",
        model: "anthropic/claude-haiku-4-5-20251001",
        timeoutSeconds: 30,
      }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error("[north-notifier] Failed to notify North:", err)
  }
}
