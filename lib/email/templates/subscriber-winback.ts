// Subscriber win-back (EMAIL-03, 2026-06-11) - 4 personal notes over ~3 weeks for subscribers
// with no opens or clicks in 60+ days. Research basis: win-back recovers 10-20% of dormant
// subscribers; suppressing the rest protects deliverability for everyone else. Personal-note
// format on purpose (re-engagement reads as Sandra, never as a brand blast). No discounts:
// value first, honest sunset last. Copy is Sandra-approval-gated behind SUBSCRIBER_WINBACK_ENABLED.
//
// REWRITE-2026-07-03 (Sandra-approved email audit): 826 sends, 0 clicks on the old copy.
// These readers are cold and have likely forgotten who Sandra is, so the arc is now a
// re-introduction: 1) who I am now, 2) the real story that started it, 3) the one free
// thing worth coming back for (/ai-prompts), 4) honest goodbye + sunset. Email types,
// tracked-link params, and send mechanics unchanged.
//
// NOT the same thing as win-back-day3/7/14.ts (member churn win-back) - this is list hygiene
// for free subscribers who stopped opening.

import { buildRevenueEmailLink } from "./revenue-links"
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
    <p style="margin:0 0 18px;">It's been a while since you've heard from me, so let me start over. I'm Sandra.</p>
    <p style="margin:0 0 18px;">Single mom, three kids, Iceland. A few years ago my marriage ended and I rebuilt my whole life with an iPhone and a mirror selfie. Somewhere along that road you joined my list, probably for selfie tips or AI photo prompts.</p>
    <p style="margin:0 0 18px;">Since then a lot has changed. I built SSELFIE, where I help women show up online with photos that still look like them. Real face, best day, nothing fake. Over a hundred thousand women follow along now, and honestly, that still feels strange to type.</p>
    <p style="margin:0 0 18px;">But my emails clearly haven't been reaching you lately, or they haven't been worth opening. Both are on me.</p>
    <p style="margin:0 0 18px;">So this month I'm sending you a few short notes to see if what I do now is useful to you. If it is, you don't have to do anything. Just open the ones that look interesting.</p>
    <p style="margin:0 0 18px;">And if it's not for you anymore, the unsubscribe link below works in one click. No hard feelings, ever.</p>
    <p style="margin:0;">Either way: hi again.</p>
  `

  return {
    subject: "it's been a while. can I reintroduce myself?",
    html: renderPersonalNote({ title: "Can I reintroduce myself?", bodyHtml }),
    text: `Hi ${firstName},

It's been a while since you've heard from me, so let me start over. I'm Sandra.

Single mom, three kids, Iceland. A few years ago my marriage ended and I rebuilt my whole life with an iPhone and a mirror selfie. Somewhere along that road you joined my list, probably for selfie tips or AI photo prompts.

Since then a lot has changed. I built SSELFIE, where I help women show up online with photos that still look like them. Real face, best day, nothing fake. Over a hundred thousand women follow along now, and honestly, that still feels strange to type.

But my emails clearly haven't been reaching you lately, or they haven't been worth opening. Both are on me.

So this month I'm sending you a few short notes to see if what I do now is useful to you. If it is, you don't have to do anything. Just open the ones that look interesting.

And if it's not for you anymore, the unsubscribe link below works in one click. No hard feelings, ever.

Either way: hi again.

Sandra x`,
  }
}

export function generateWinback2Email({
  firstName,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">I want to tell you about one photo.</p>
    <p style="margin:0 0 18px;">It's a mirror selfie. My living room, after my divorce, kids asleep. No photographer, no budget, and honestly, no confidence either. But I posted it anyway.</p>
    <p style="margin:0 0 18px;">That photo didn't go viral. Nothing dramatic happened. But it was the first time I showed up as myself instead of hiding, and everything I have now grew from that one decision. The audience. The business. This email you're reading.</p>
    <p style="margin:0 0 18px;">Here's what I learned, and what I keep watching happen for the women I work with: nobody's waiting for you to be perfect. They're waiting for you to be visible. One honest photo of your real face does more than a hundred polished posts where you're hiding behind quotes and stock images.</p>
    <p style="margin:0 0 18px;">You don't need to become someone else to start. You need one photo you don't cringe at, and something true to say next to it.</p>
    <p style="margin:0 0 18px;">That's the whole method. It started with a selfie in a messy living room.</p>
    <p style="margin:0;">If you're still in that "phone full of photos, profile still hiding" place, stay with me this week. My next note has the free thing I wish I'd had back then.</p>
  `

  return {
    subject: "the photo that started all of this",
    html: renderPersonalNote({ title: "The photo that started all of this", bodyHtml }),
    text: `Hi ${firstName},

I want to tell you about one photo.

It's a mirror selfie. My living room, after my divorce, kids asleep. No photographer, no budget, and honestly, no confidence either. But I posted it anyway.

That photo didn't go viral. Nothing dramatic happened. But it was the first time I showed up as myself instead of hiding, and everything I have now grew from that one decision. The audience. The business. This email you're reading.

Here's what I learned, and what I keep watching happen for the women I work with: nobody's waiting for you to be perfect. They're waiting for you to be visible. One honest photo of your real face does more than a hundred polished posts where you're hiding behind quotes and stock images.

You don't need to become someone else to start. You need one photo you don't cringe at, and something true to say next to it.

That's the whole method. It started with a selfie in a messy living room.

If you're still in that "phone full of photos, profile still hiding" place, stay with me this week. My next note has the free thing I wish I'd had back then.

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
  const promptsUrl = trackedLink(FREE_PROMPTS_URL, SUBSCRIBER_WINBACK_EMAIL_TYPES.offer, "free_prompt", recipientEmail)

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">The question I get most in my DMs is some version of: "how did you make that photo?"</p>
    <p style="margin:0 0 18px;">The answer is simpler than people expect. One clear selfie, one good prompt, ChatGPT. Ten minutes later you have a photo that looks like it came from a brand shoot. Still your face. Still you. Just your best day.</p>
    <p style="margin:0 0 18px;">I keep my latest five shoots on a free page, with the exact prompts I used. ${renderPersonalLink("They're here", promptsUrl)}.</p>
    <p style="margin:0 0 18px;">Try one on a selfie you already have. That's it. No catch.</p>
    <p style="margin:0;">And if you make one you love, reply and show me. I read everything.</p>
  `

  return {
    subject: "the free thing I'd start with",
    html: renderPersonalNote({ title: "The free thing I'd start with", bodyHtml }),
    text: `Hi ${firstName},

The question I get most in my DMs is some version of: "how did you make that photo?"

The answer is simpler than people expect. One clear selfie, one good prompt, ChatGPT. Ten minutes later you have a photo that looks like it came from a brand shoot. Still your face. Still you. Just your best day.

I keep my latest five shoots on a free page, with the exact prompts I used. They're here:
${promptsUrl}

Try one on a selfie you already have. That's it. No catch.

And if you make one you love, reply and show me. I read everything.

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
    <p style="margin:0 0 18px;">Last note like this, I promise.</p>
    <p style="margin:0 0 18px;">I only want to email people who actually want to hear from me. If that's not you anymore, that's completely fine. People change, inboxes overflow, life moves.</p>
    <p style="margin:0 0 18px;">So here's how I'll leave it. If you open or click anything, even just ${renderPersonalLink("this link to the free prompts", promptsUrl)}, I'll know you want to stay and I'll keep writing to you.</p>
    <p style="margin:0 0 18px;">If I don't hear from you, I'll quietly stop sending you the regular emails. No guilt trip. You can always come back at sselfie.ai.</p>
    <p style="margin:0;">Thank you for letting me into your inbox, even for a while. It means more than you'd think.</p>
  `

  return {
    subject: "should I stop emailing you?",
    html: renderPersonalNote({ title: "Should I stop emailing you?", bodyHtml }),
    text: `Hi ${firstName},

Last note like this, I promise.

I only want to email people who actually want to hear from me. If that's not you anymore, that's completely fine. People change, inboxes overflow, life moves.

So here's how I'll leave it. If you open or click anything, even just this link to the free prompts, I'll know you want to stay and I'll keep writing to you:
${promptsUrl}

If I don't hear from you, I'll quietly stop sending you the regular emails. No guilt trip. You can always come back at sselfie.ai.

Thank you for letting me into your inbox, even for a while. It means more than you'd think.

Sandra x`,
  }
}
