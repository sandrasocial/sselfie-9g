/**
 * Delivery email templates for individual legacy academy products.
 *
 * What To Say / Show Up / Get Paid / Concept Cards / Caption Sprint /
 * Feed Reset / AI Photo Refresh.
 *
 * PRESERVE_FOR_EXISTING_BUYERS: these templates are only for historical
 * academy mini-product delivery/resend flows. New CTAs point to the current
 * offer ladder.
 *
 * Each template uses the stone-email design system for consistency.
 * Visibility Suite has its own block further down.
 */

import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"

// ─── Per-product copy ─────────────────────────────────────────────────────────

const PRODUCT_COPY: Record<
  string,
  {
    eyebrow: string
    title: string
    subtitle: string
    body: string
    whatToDoFirst: string
    upsell?: { name: string; price: string; url: string }
  }
> = {
  what_to_say: {
    eyebrow: "What To Say",
    title: "Start with clarity.",
    subtitle: "You know what you do. Let's make sure the right people get it too.",
    body: "I've noticed most people don't buy because the message is confusing, not because the product is wrong. Fix your positioning first. One clear line about what you offer changes everything else.",
    whatToDoFirst: "Open the workbook and start with the message fix workflow.",
    upsell: { name: "Selfie Masterclass", price: "€147", url: `${SITE_URL}/masterclass` },
  },
  show_up: {
    eyebrow: "Show Up",
    title: "Your posting plan is ready.",
    subtitle: "Stop posting only when you feel like it. Show up on a rhythm you can actually keep.",
    body: "Here's the goal: your next week of content planned, written, and ready before Sunday. Open the workbook and work through the 7-day posting plan.",
    whatToDoFirst: "Start with the 7-day posting workflow inside the workbook.",
    upsell: { name: "SSELFIE SUITE", price: "€97/mo", url: `${SITE_URL}/checkout/membership` },
  },
  get_paid: {
    eyebrow: "Get Paid",
    title: "Let's build your first offer.",
    subtitle: "You're already showing up. Now let's get you noticed, and paid.",
    body: "Work through the buyer path workbook. One clear offer. One simple next step. That's what actually gets you sales, not more posts.",
    whatToDoFirst: "Open the buyer path workbook and start with your first offer outline.",
    upsell: { name: "SSELFIE SUITE", price: "€97/mo", url: `${SITE_URL}/checkout/membership` },
  },
  concept_cards_pack: {
    eyebrow: "Concept Cards",
    title: "Ten angles from one topic.",
    subtitle: "No more staring at a blank screen.",
    body: "Pick one thing you talk about all the time. The concept workspace turns it into ten post angles you can use right away.",
    whatToDoFirst: "Open the workspace and start with your current offer topic.",
    upsell: { name: "Selfie Masterclass", price: "€147", url: `${SITE_URL}/masterclass` },
  },
  caption_sprint: {
    eyebrow: "Caption Sprint",
    title: "Your caption bank is ready.",
    subtitle: "A week of captions, without starting from a blank page.",
    body: "The caption workspace turns your offer, your tone, and your CTA into captions you can edit and post. Work through the sprint and you'll have enough copy for your next week.",
    whatToDoFirst: "Open the caption bank and start with your current offer.",
    upsell: { name: "SSELFIE SUITE", price: "€97/mo", url: `${SITE_URL}/checkout/membership` },
  },
  feed_reset_9grid: {
    eyebrow: "Feed Reset",
    title: "Plan your next nine posts.",
    subtitle: "Your profile finally has a direction.",
    body: "The 9-grid workspace helps you clean up what your profile is actually saying, and plan your next posts so it makes sense the moment someone lands on it.",
    whatToDoFirst: "Open the grid workspace and set your profile direction first.",
    upsell: { name: "SSELFIE SUITE", price: "€97/mo", url: `${SITE_URL}/checkout/membership` },
  },
  ai_photo_refresh: {
    eyebrow: "AI Photo Refresh",
    title: "Your visual direction is ready.",
    subtitle: "Five usable photo ideas. No photographer needed.",
    body: "Work through the visual workspace: set your direction, jot your reference notes, and pick your first five image prompts. Your phone is enough.",
    whatToDoFirst: "Open the workspace and start with your visual direction statement.",
    upsell: { name: "Selfie Masterclass", price: "€147", url: `${SITE_URL}/masterclass` },
  },
  ai_photo_prompts: {
    eyebrow: "AI Photo Prompt Pack",
    title: "50 prompts ready to use.",
    subtitle: "Turn your selfies into brand photos. No photographer needed.",
    body: "50 done-for-you AI prompts across 10 brand scenarios. Pick the one that matches what you're offering right now and use it today.",
    whatToDoFirst: "Open the prompt pack and start with the scenario that fits your current offer.",
    upsell: { name: "Selfie Starter Kit", price: "€37", url: `${SITE_URL}/starter-kit` },
  },
}

// ─── Single product delivery ──────────────────────────────────────────────────

export interface AcademyProductDeliveryParams {
  productId: string
  firstName: string
  email: string
  accessUrl: string
  passwordSetupUrl?: string
}

export function generateAcademyProductDeliveryEmail(params: AcademyProductDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { productId, email, accessUrl, passwordSetupUrl } = params
  const firstName = getFirstNameForEmail({ fullName: params.firstName, email })
  const copy = PRODUCT_COPY[productId]

  if (!copy) {
    // Fallback for unknown product IDs
    return generateAcademyGenericDeliveryEmail(params)
  }

  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton(`Open ${copy.eyebrow}`, accessUrl)

  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton(`Open ${copy.eyebrow}`, accessUrl, "outline")}</div>`
    : ""

  const upsellBlock = copy.upsell
    ? renderStonePanel(
        `<p style="margin:0 0 10px;font-size:15px;line-height:1.75;color:#f0ede8;">When you're ready for the next step: <strong style="color:#f0ede8;">${copy.upsell.name}</strong> (${copy.upsell.price}).</p>
         <div>${renderStoneButton(`Get ${copy.upsell.name}`, copy.upsell.url, "outline")}</div>`,
        "Next Step",
      )
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">${copy.body}</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.75;color:#a8a49c;">${copy.whatToDoFirst}</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
    ${upsellBlock}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">
      Questions? Reply to this email or reach us at
      <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a>
    </p>
  `

  const html = renderStoneShell({
    eyebrow: copy.eyebrow,
    title: copy.title,
    subtitle: passwordSetupUrl
      ? `Set your password once, then ${copy.subtitle.toLowerCase()}`
      : copy.subtitle,
    bodyHtml,
    footerLead: "One clear action first. Then the next.",
    footerSignoff: "Sandra x",
  })

  const textUpsell = copy.upsell
    ? `\n\nWhen you're ready for the next step: ${copy.upsell.name} (${copy.upsell.price}): ${copy.upsell.url}`
    : ""

  const text = [
    `Hi ${firstName},`,
    "",
    copy.body,
    "",
    copy.whatToDoFirst,
    "",
    passwordSetupUrl
      ? `Set your password: ${passwordSetupUrl}\nOpen ${copy.eyebrow}: ${accessUrl}`
      : `Open ${copy.eyebrow}: ${accessUrl}`,
    textUpsell,
    "",
    "Questions? Reply here or email support@sselfie.ai",
    "",
    "Sandra x",
  ].join("\n")

  const subject = `${copy.eyebrow}: you're in`

  return { html, text, subject }
}

// ─── Visibility Suite delivery ────────────────────────────────────────────────
// PRESERVE_FOR_EXISTING_BUYERS: no new public checkout points here, but old
// buyers and admin support still need delivery/resend access.

export interface VisibilitySuiteDeliveryParams {
  firstName: string
  email: string
  accessUrl: string
  passwordSetupUrl?: string
}

export function generateVisibilitySuiteDeliveryEmail(params: VisibilitySuiteDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { email, accessUrl, passwordSetupUrl } = params
  const firstName = getFirstNameForEmail({ fullName: params.firstName, email })

  const suiteItems = [
    "What To Say",
    "Show Up",
    "Get Paid",
    "Concept Cards",
    "Caption Sprint",
    "Feed Reset",
    "AI Photo Refresh",
  ]

  const suitePanel = renderStonePanel(
    `<p style="margin:0 0 12px;font-size:15px;line-height:1.75;color:#f0ede8;">Your Suite includes:</p>
     ${suiteItems
       .map(
         (item) =>
           `<p style="margin:4px 0;font-size:14px;line-height:1.7;color:#a8a49c;">· ${item}</p>`,
       )
       .join("")}`,
    "What's Included",
  )

  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton("Open Your Visibility Path", accessUrl)

  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Open Your Visibility Path", accessUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Visibility To Paid Suite is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">No rush. Start with <strong>What To Say</strong> and move in order. Each step builds on the last.</p>
    ${suitePanel}
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">
      Questions? Reply here or email
      <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a>
    </p>
  `

  const html = renderStoneShell({
    eyebrow: "Visibility To Paid Suite",
    title: "Your full path is ready.",
    subtitle: passwordSetupUrl
      ? "Set your password once, then start with What To Say and move through each step."
      : "Start with What To Say and move in order. Each step builds on the last.",
    bodyHtml,
    footerLead: "One step at a time. In order.",
    footerSignoff: "Sandra x",
  })

  const text = [
    `Hi ${firstName},`,
    "",
    "Your Visibility To Paid Suite is ready.",
    "",
    "Your Suite includes:",
    ...suiteItems.map((item) => `· ${item}`),
    "",
    passwordSetupUrl
      ? `Set your password: ${passwordSetupUrl}\nOpen your path: ${accessUrl}`
      : `Open your Visibility path: ${accessUrl}`,
    "",
    "No rush. Start with What To Say and move in order.",
    "",
    "Questions? Reply here or email support@sselfie.ai",
    "",
    "Sandra x",
  ].join("\n")

  return {
    html,
    text,
    subject: "Your Visibility To Paid Suite is ready",
  }
}

// ─── Generic fallback ─────────────────────────────────────────────────────────

function generateAcademyGenericDeliveryEmail(params: AcademyProductDeliveryParams): {
  html: string
  text: string
  subject: string
} {
  const { email, accessUrl, passwordSetupUrl } = params
  const firstName = getFirstNameForEmail({ fullName: params.firstName, email })

  const primaryButton = passwordSetupUrl
    ? renderStoneButton("Set Your Password", passwordSetupUrl)
    : renderStoneButton("Open Your Purchase", accessUrl)

  const secondaryButton = passwordSetupUrl
    ? `<div style="margin:10px 0 0;">${renderStoneButton("Open Your Purchase", accessUrl, "outline")}</div>`
    : ""

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your purchase is ready. Open it and take the first step.</p>
    <div style="margin:28px 0 14px;">${primaryButton}</div>
    ${secondaryButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">
      Questions? Reply here or email
      <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a>
    </p>
  `

  const html = renderStoneShell({
    eyebrow: "Purchase Confirmed",
    title: "You're in.",
    subtitle: "Your access is ready. Open it and take the first step.",
    bodyHtml,
  })

  const text = [
    `Hi ${firstName},`,
    "",
    "Your purchase is ready.",
    "",
    passwordSetupUrl
      ? `Set your password: ${passwordSetupUrl}\nOpen your purchase: ${accessUrl}`
      : `Open your purchase: ${accessUrl}`,
    "",
    "Questions? Reply here or email support@sselfie.ai",
    "",
    "Sandra x",
  ].join("\n")

  return { html, text, subject: "Your purchase is ready" }
}
