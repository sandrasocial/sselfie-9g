import { NextRequest, NextResponse } from "next/server"

import { sendEmail } from "@/lib/email/send-email"
import { addOrUpdateResendContact, updateContactTags } from "@/lib/resend/manage-contact"

type InquiryPayload = {
  name?: string
  email?: string
  instagramHandle?: string
  currentChallenge?: string
  desiredOutcome?: string
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
    const adminEmail = process.env.WORK_WITH_ME_INQUIRY_EMAIL || process.env.ADMIN_EMAIL || "hello@sselfie.ai"

    await addOrUpdateResendContact(email, name, {
      source: "work-with-me-inquiry",
      status: "lead",
      inquiry_type: "one_to_one",
    }).catch((error) => {
      console.error("[v0] Failed to sync inquiry contact to Resend:", error)
    })

    await updateContactTags(email, {
      inquiry_type: "one_to_one",
      inquiry_status: "new",
      journey: "high_intent",
    }).catch((error) => {
      console.error("[v0] Failed to update inquiry tags:", error)
    })

    const adminEmailResult = await sendEmail({
      to: adminEmail,
      subject: `New 1:1 inquiry from ${name}`,
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <h1 style="margin: 0 0 20px; font-size: 28px; font-weight: 600;">New 1:1 inquiry</h1>
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
        </div>
      `,
      text: [
        "New 1:1 inquiry",
        `Name: ${name}`,
        `Email: ${email}`,
        `Instagram: ${instagramHandle || "Not provided"}`,
        "",
        "What's not working right now?",
        currentChallenge,
        "",
        "What do they want in the next 6 months?",
        desiredOutcome,
      ].join("\n"),
      emailType: "work_with_me_inquiry_admin",
      tags: ["work-with-me", "inquiry", "one-to-one"],
    })

    if (!adminEmailResult.success) {
      return NextResponse.json({ error: adminEmailResult.error || "Failed to submit inquiry" }, { status: 500 })
    }

    await sendEmail({
      to: email,
      subject: "I got your note",
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #1c1917;">
          <p>Hi ${safeName},</p>
          <p>Thank you for reaching out.</p>
          <p>I got your note, and I will come back to you after I read through it properly.</p>
          <p>You do not need to send anything again unless there is something important I should see right away.</p>
          <p>Sandra</p>
        </div>
      `,
      text: [
        `Hi ${name},`,
        "",
        "Thank you for reaching out.",
        "I got your note, and I will come back to you after I read through it properly.",
        "You do not need to send anything again unless there is something important I should see right away.",
        "",
        "Sandra",
      ].join("\n"),
      emailType: "work_with_me_inquiry_confirmation",
      tags: ["work-with-me", "inquiry-confirmation"],
    }).catch((error) => {
      console.error("[v0] Failed to send inquiry confirmation email:", error)
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[v0] Error submitting inquiry:", error)
    return NextResponse.json({ error: "Failed to submit inquiry" }, { status: 500 })
  }
}
