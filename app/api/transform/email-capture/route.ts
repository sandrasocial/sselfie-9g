import { type NextRequest, NextResponse } from "next/server"

import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"

export const runtime = "nodejs"

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const firstName = typeof body?.firstName === "string" ? body.firstName.trim().slice(0, 80) : null

    if (!email || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Valid email required" }, { status: 400 })
    }

    await addOrUpdateResendContact(email, firstName, {
      source: "transform-tool",
      status: "lead",
      product: "transform",
      journey: "nurture",
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[transform/email-capture] Error:", error)
    // Don't block the user if Resend fails
    return NextResponse.json({ ok: true })
  }
}
