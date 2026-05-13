import { NextRequest, NextResponse } from "next/server"

import { sendEmail } from "@/lib/email/send-email"
import { addOrUpdateResendContact, updateContactTags } from "@/lib/resend/manage-contact"

type InquiryPayload = {
  name?: string
  email?: string
  instagramHandle?: string
  currentChallenge?: string
  desiredOutcome?: string
  currentOffer?: string
  helpFocus?: string
  investmentReadiness?: string
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
}

function formatHandle(handle: string) {
  const trimmed = handle.trim()
  if (!trimmed) return ""
  return trimmed.startsWith("@") ? trimmed : `@${trimmed}`
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as InquiryPayload
    const name = body.name?.trim() || ""
    const email = body.email?.trim().toLowerCase() || ""
    const instagramHandle = formatHandle(body.instagramHandle || "")
    const currentChallenge = body.currentChallenge?.trim() || ""
    const desiredOutcome = body.desiredOutcome?.trim() || ""
    const currentOffer = body.currentOffer?.trim() || ""
    const helpFocus = body.helpFocus?.trim() || ""
    const investmentReadiness = body.investmentReadiness?.trim() || ""

    if (!name || !email || !currentChallenge || !desiredOutcome) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    const safeName = escapeHtml(name)
    const safeEmail = escapeHtml(email)
    const safeHandle = escapeHtml(instagramHandle)
    const safeChallenge = escapeHtml(currentChallenge).replaceAll("\n", "<br />")
    const safeOutcome = escapeHtml(desiredOutcome).replaceAll("\n", "<br />")
    const safeCurrentOffer = escapeHtml(currentOffer).replaceAll("\n", "<br />")
    const safeHelpFocus = escapeHtml(helpFocus)
    const safeInvestmentReadiness = escapeHtml(investmentReadiness)
    const adminEmail = process.env.WORK_WITH_ME_INQUIRY_EMAIL || process.env.ADMIN_EMAIL || "hello@sselfie.ai"

    await addOrUpdateResendContact(email, name, {
      source: "work-with-me-inquiry",
      status: "lead",
      inquiry_type: "visibility_to_paid_private_sprint",
      help_focus: helpFocus,
      investment_readiness: investmentReadiness,
    }).catch((error) => {
      console.error("[v0] Failed to sync inquiry contact to Resend:", error)
    })

    await updateContactTags(email, {
      inquiry_type: "visibility_to_paid_private_sprint",
      inquiry_status: "new",
      journey: "high_intent",
      help_focus: helpFocus,
      investment_readiness: investmentReadiness,
    }).catch((error) => {
      console.error("[v0] Failed to update inquiry tags:", error)
    })

    const adminEmailResult = await sendEmail({
      to: adminEmail,
      subject: `New Work With Me application from ${name}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600;">New Work With Me application</h1>
          <p style="margin: 0 0 12px;"><strong>Name:</strong> ${safeName}</p>
          <p style="margin: 0 0 12px;"><strong>Email:</strong> ${safeEmail}</p>
          <p style="margin: 0 0 24px;"><strong>Instagram:</strong> ${safeHandle || "Not provided"}</p>
          <div style="margin: 0 0 20px;">
            <p style="margin: 0 0 8px; font-weight: 600;">What's not working right now?</p>
            <p style="margin: 0; line-height: 1.7;">${safeChallenge}</p>
          </div>
          <div>
            <p style="margin: 0 0 8px; font-weight: 600;">What do they want in the next 6 months?</p>
            <p style="margin: 0; line-height: 1.7;">${safeOutcome}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">What are they currently selling?</p>
            <p style="margin: 0; line-height: 1.7;">${safeCurrentOffer || "Not provided"}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">What do they want help with most?</p>
            <p style="margin: 0; line-height: 1.7;">${safeHelpFocus || "Not provided"}</p>
          </div>
          <div style="margin: 20px 0 0;">
            <p style="margin: 0 0 8px; font-weight: 600;">Ready to invest €2,000?</p>
            <p style="margin: 0; line-height: 1.7;">${safeInvestmentReadiness || "Not provided"}</p>
          </div>
        </div>
      `,
      text: [
        "New Work With Me application",
        `Name: ${name}`,
        `Email: ${email}`,
        `Instagram: ${instagramHandle || "Not provided"}`,
        "",
        "What's not working right now?",
        currentChallenge,
        "",
        "What do they want in the next 6 months?",
        desiredOutcome,
        "",
        "What are they currently selling?",
        currentOffer || "Not provided",
        "",
        "What do they want help with most?",
        helpFocus || "Not provided",
        "",
        "Ready to invest €2,000?",
        investmentReadiness || "Not provided",
      ].join("\n"),
      emailType: "work_with_me_inquiry_admin",
      tags: ["work-with-me", "private-sprint", "application"],
    })

    if (!adminEmailResult.success) {
      return NextResponse.json({ error: adminEmailResult.error || "Failed to submit inquiry" }, { status: 500 })
    }

    await sendEmail({
      to: email,
      subject: "Your Work With Me application has been received",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <p>Hi ${safeName},</p>
          <p>Thank you for applying to work privately with Sandra.</p>
          <p>Sandra reviews every application personally. If it looks like the right fit, she will reply with the next step and payment link.</p>
          <p>No payment has been taken.</p>
          <p>Sandra</p>
        </div>
      `,
      text: [
        `Hi ${name},`,
        "",
        "Thank you for applying to work privately with Sandra.",
        "Sandra reviews every application personally. If it looks like the right fit, she will reply with the next step and payment link.",
        "No payment has been taken.",
        "",
        "Sandra",
      ].join("\n"),
      emailType: "work_with_me_inquiry_confirmation",
      tags: ["work-with-me", "private-sprint", "application-confirmation"],
    }).catch((error) => {
      console.error("[v0] Failed to send inquiry confirmation email:", error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting inquiry:", error)
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 })
  }
}
