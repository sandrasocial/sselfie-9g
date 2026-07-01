// Subscriber win-back (EMAIL-03, 2026-06-11) - 4 personal notes over ~3 weeks for subscribers
// with no opens or clicks in 60+ days. Research basis: win-back recovers 10-20% of dormant
// subscribers; suppressing the rest protects deliverability for everyone else. Personal-note
// format on purpose (re-engagement reads as Sandra, never as a brand blast). No discounts:
// value first, honest sunset last. Copy is Sandra-approval-gated behind SUBSCRIBER_WINBACK_ENABLED.
//
// NOT the same thing as win-back-day3/7/14.ts (member churn win-back) - this is list hygiene
// for free subscribers who stopped opening.

import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderPersonalLink, renderPersonalNote } from "./stone-email"

export const SUBSCRIBER_WINBACK_EMAIL_TYPES = {
  reminder: "subscriber-winback-1",
  value: "subscriber-winback-2",
  offer: "subscriber-winback-3",
  sunset: "subscriber-winback-4",
} as const

const FREE_PROMPTS_URL = "https://www.sselfie.ai/ai-prompts"

function trackedLink(base: string, emailType: string, content: string, recipientEmail?: string | null): string {
  return buildRevenueEmailLink(base, {
    source: "email",
    medium: "winback",
    campaign: "subscriber_winback",
    content,
    emailType,
    checkoutEmail: recipientEmail,
  })
}

export function generateWinback1Email({ firstName }: { firstName: string; recipientEmail?: string | null }) {
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">You joined my list for AI photo prompts, and somewhere along the way we lost touch. That's on me as much as you. Inboxes are wild.</p>
    <p style="margin:0 0 18px;">Quick check: do you still want what I send? One useful email at a time, real AI photo advice for your brand, no fluff.</p>
    <p style="margin:0 0 18px;">If yes, you don't need to do anything. Open one now and then and I'll keep them coming.</p>
    <p style="margin:0;">If you're done, the unsubscribe link below works in one click. No hard feelings.</p>
  `

  return {
    subject: "still want these?",
    html: renderPersonalNote({ title: "Still want these?", bodyHtml }),
    text: `Hi ${firstName},

You joined my list for AI photo prompts, and somewhere along the way we lost touch. That's on me as much as you. Inboxes are wild.

Quick check: do you still want what I send? One useful email at a time, real AI photo advice for your brand, no fluff.

If yes, you don't need to do anything. Open one now and then and I'll keep them coming.

If you're done, the unsubscribe link below works in one click. No hard feelings.

Sandra x`,
  }
}

export function generateWinback2Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const promptsUrl = trackedLink(FREE_PROMPTS_URL, SUBSCRIBER_WINBACK_EMAIL_TYPES.value, "free_prompt", recipientEmail)

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">No pitch today. Just the thing people thank me for most.</p>
    <p style="margin:0 0 18px;">One selfie, one prompt, ten minutes in ChatGPT: a photo that looks like it came from a brand shoot. Still your face. Still you. Just clearer.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("The free prompt is here", promptsUrl)}.</p>
    <p style="margin:0;">Try it on a selfie you already have. That's it.</p>
  `

  return {
    subject: "the 10-minute brand shoot",
    html: renderPersonalNote({ title: "The 10-minute brand shoot", bodyHtml }),
    text: `Hi ${firstName},

No pitch today. Just the thing people thank me for most.

One selfie, one prompt, ten minutes in ChatGPT: a photo that looks like it came from a brand shoot. Still your face. Still you. Just clearer.

The free prompt is here:
${promptsUrl}

Try it on a selfie you already have. That's it.

Sandra x`,
  }
}

export function generateWinback3Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const vaultUrl = trackedLink(
    promptVaultCheckoutUrl(),
    SUBSCRIBER_WINBACK_EMAIL_TYPES.offer,
    "vault_offer",
    recipientEmail,
  )

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">If the free prompt worked for you, the Prompt Vault is the full version: every editorial collection, full shot sequences, $27 once. New drops included forever.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Here's the Vault", vaultUrl)}.</p>
    <p style="margin:0;">And if AI photos aren't your thing anymore, that's okay too. One last note from me next week, then I'll quietly stop.</p>
  `

  return {
    subject: "one selfie, every photoshoot",
    html: renderPersonalNote({ title: "One selfie, every photoshoot", bodyHtml }),
    text: `Hi ${firstName},

If the free prompt worked for you, the Prompt Vault is the full version: every editorial collection, full shot sequences, $27 once. New drops included forever.

Here's the Vault:
${vaultUrl}

And if AI photos aren't your thing anymore, that's okay too. One last note from me next week, then I'll quietly stop.

Sandra x`,
  }
}

export function generateWinback4Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const promptsUrl = trackedLink(FREE_PROMPTS_URL, SUBSCRIBER_WINBACK_EMAIL_TYPES.sunset, "stay_link", recipientEmail)

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">I keep my list honest. If my emails aren't landing for you anymore, I'd rather stop sending than clutter your inbox.</p>
    <p style="margin:0 0 18px;">This is the last one unless you tell me otherwise. To stay, just open or click anything, ${renderPersonalLink("even this", promptsUrl)}.</p>
    <p style="margin:0 0 18px;">If I don't hear from you, I'll quietly take you off the regular emails. You can come back anytime at sselfie.ai.</p>
    <p style="margin:0;">Thanks for being here, even for a little while.</p>
  `

  return {
    subject: "should I stop emailing you?",
    html: renderPersonalNote({ title: "Should I stop emailing you?", bodyHtml }),
    text: `Hi ${firstName},

I keep my list honest. If my emails aren't landing for you anymore, I'd rather stop sending than clutter your inbox.

This is the last one unless you tell me otherwise. To stay, just open or click anything, even this:
${promptsUrl}

If I don't hear from you, I'll quietly take you off the regular emails. You can come back anytime at sselfie.ai.

Thanks for being here, even for a little while.

Sandra x`,
  }
}
