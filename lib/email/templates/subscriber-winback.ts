// Subscriber win-back: four personal notes for subscribers who have stopped
// meaningfully engaging with lifecycle email. Opens are intentionally not used
// as a stay signal because privacy features can make open data unreliable.
// A click is the explicit re-engagement signal used by the runtime sequence.

import { buildRevenueEmailLink } from "./revenue-links"
import { renderPersonalLink, renderPersonalNote } from "./stone-email"

export const SUBSCRIBER_WINBACK_EMAIL_TYPES = {
  reminder: "subscriber-winback-1",
  value: "subscriber-winback-2",
  offer: "subscriber-winback-3",
  sunset: "subscriber-winback-4",
} as const

const FREE_PROMPTS_URL = "https://www.sselfie.ai/ai-prompts"

function trackedLink(base: string, emailType: string, content: string): string {
  return buildRevenueEmailLink(base, {
    source: "email",
    medium: "winback",
    campaign: "subscriber_winback",
    content,
    emailType,
  })
}

export function generateWinback1Email({ firstName }: { firstName: string; recipientEmail?: string | null }) {
  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">It has been a while, so let me start over. I am Sandra.</p>
    <p style="margin:0 0 18px;">I teach women how to take better photos of themselves, edit them, use AI when it actually helps, and turn those photos into content.</p>
    <p style="margin:0 0 18px;">You probably joined my list for a selfie tip, a guide, or one of my AI photo prompts.</p>
    <p style="margin:0 0 18px;">My emails have clearly not been useful enough lately, so I am going to send you a few short notes and show you what SSELFIE is about now.</p>
    <p style="margin:0 0 18px;">If something is useful, click through and use it. If this is not for you anymore, the unsubscribe link below works in one click. No hard feelings.</p>
    <p style="margin:0;">Either way, hi again.</p>
  `

  return {
    subject: "it has been a while. can I reintroduce myself?",
    html: renderPersonalNote({ title: "Can I reintroduce myself?", bodyHtml }),
    text: `Hi ${firstName},

It has been a while, so let me start over. I am Sandra.

I teach women how to take better photos of themselves, edit them, use AI when it actually helps, and turn those photos into content.

You probably joined my list for a selfie tip, a guide, or one of my AI photo prompts.

My emails have clearly not been useful enough lately, so I am going to send you a few short notes and show you what SSELFIE is about now.

If something is useful, click through and use it. If this is not for you anymore, the unsubscribe link below works in one click. No hard feelings.

Either way, hi again.

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
    <p style="margin:0 0 18px;">When I started taking photos of myself, I did not have a studio or a photographer.</p>
    <p style="margin:0 0 18px;">I had an iPhone, a mirror, a window, and a lot of photos I did not want to post.</p>
    <p style="margin:0 0 18px;">What changed was not becoming more photogenic. I learned how to use light, angles, simple edits, and eventually AI without making myself look like somebody else.</p>
    <p style="margin:0 0 18px;">That is still the point of SSELFIE now. Start with what you already have. Make one photo better. Then actually use it.</p>
    <p style="margin:0;">My next note has the free thing I would start with today.</p>
  `

  return {
    subject: "the photo lesson I still use",
    html: renderPersonalNote({ title: "The photo lesson I still use", bodyHtml }),
    text: `Hi ${firstName},

When I started taking photos of myself, I did not have a studio or a photographer.

I had an iPhone, a mirror, a window, and a lot of photos I did not want to post.

What changed was not becoming more photogenic. I learned how to use light, angles, simple edits, and eventually AI without making myself look like somebody else.

That is still the point of SSELFIE now. Start with what you already have. Make one photo better. Then actually use it.

My next note has the free thing I would start with today.

Sandra x`,
  }
}

export function generateWinback3Email({
  firstName,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const promptsUrl = trackedLink(FREE_PROMPTS_URL, SUBSCRIBER_WINBACK_EMAIL_TYPES.offer, "free_prompt")

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">If you want to see what I mean, start with this.</p>
    <p style="margin:0 0 18px;">I keep five AI photo prompts on a free page. Choose one photo you would love to create, use one clear selfie, and try the prompt in ChatGPT.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Open the five free prompts", promptsUrl)}.</p>
    <p style="margin:0 0 18px;">You do not need to buy anything. I would rather you make one result first and decide whether this way of creating is useful to you.</p>
    <p style="margin:0;">If you make one you love, reply and show me.</p>
  `

  return {
    subject: "the free thing I would start with",
    html: renderPersonalNote({ title: "The free thing I would start with", bodyHtml }),
    text: `Hi ${firstName},

If you want to see what I mean, start with this.

I keep five AI photo prompts on a free page. Choose one photo you would love to create, use one clear selfie, and try the prompt in ChatGPT.

Open the five free prompts:
${promptsUrl}

You do not need to buy anything. I would rather you make one result first and decide whether this way of creating is useful to you.

If you make one you love, reply and show me.

Sandra x`,
  }
}

export function generateWinback4Email({
  firstName,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const promptsUrl = trackedLink(FREE_PROMPTS_URL, SUBSCRIBER_WINBACK_EMAIL_TYPES.sunset, "stay_link")

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">Last note like this.</p>
    <p style="margin:0 0 18px;">I only want to keep sending regular emails to people who actually want them.</p>
    <p style="margin:0 0 18px;">If you want to stay, ${renderPersonalLink("click here to open the free prompts", promptsUrl)}. That click tells me you still want SSELFIE emails.</p>
    <p style="margin:0 0 18px;">If you do nothing, I will quietly stop sending you the regular marketing emails. You can always come back later.</p>
    <p style="margin:0;">Thank you for being here, even if this is where we part ways.</p>
  `

  return {
    subject: "should I stop emailing you?",
    html: renderPersonalNote({ title: "Should I stop emailing you?", bodyHtml }),
    text: `Hi ${firstName},

Last note like this.

I only want to keep sending regular emails to people who actually want them.

If you want to stay, click here to open the free prompts. That click tells me you still want SSELFIE emails:
${promptsUrl}

If you do nothing, I will quietly stop sending you the regular marketing emails. You can always come back later.

Thank you for being here, even if this is where we part ways.

Sandra x`,
  }
}
