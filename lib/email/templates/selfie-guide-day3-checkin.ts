import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"

export interface SelfieGuideDay3CheckinParams {
  firstName?: string
  recipientEmail: string
  accessUrl: string
}

export function generateSelfieGuideDay3CheckinEmail({
  firstName,
  recipientEmail,
  accessUrl,
}: SelfieGuideDay3CheckinParams): {
  html: string
  text: string
  subject: string
} {
  const name = getFirstNameForEmail({ fullName: firstName, email: recipientEmail })
  const trackedAccessUrl = buildRevenueEmailLink(accessUrl, {
    campaign: "selfie_guide_day3_checkin",
    content: "part_2_window_light",
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${name},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">This is usually where people disappear.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Not because they don&apos;t care. Because it gets awkward when it is finally time to put your own face in the frame.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">So make today smaller.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Open chapter two. Find the section on window light. Take one photo in the light you already have. No outfit planning. No perfect setup.</p>
    <p style="margin:0 0 24px;font-size:16px;line-height:1.75;">Five minutes is enough.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Open chapter two", trackedAccessUrl)}</div>
  `

  const html = renderStoneShell({
    title: "Five minutes. One photo.",
    eyebrow: "Selfie Guide",
    subtitle: "You do not need to be ready. Just begin smaller.",
    bodyHtml,
    footerLead: "Reply if you get stuck. Tell me what feels hard.",
    footerSignoff: "Sandra x",
  })

  const text = `Selfie Guide

Hi ${name},

This is usually where people disappear.

Not because they don't care. Because it gets awkward when it is finally time to put your own face in the frame.

So make today smaller.

Open chapter two. Find the section on window light. Take one photo in the light you already have. No outfit planning. No perfect setup.

Five minutes is enough.

Open chapter two: ${trackedAccessUrl}

Reply if you get stuck. Tell me what feels hard.
Sandra x`

  return {
    html,
    text,
    subject: "This is usually where people disappear",
  }
}
