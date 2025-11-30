/**
 * Billing Email Automation
 * POST /api/email/billing
 * 
 * Triggers: sendBillingEmail(type, userId, options)
 * Access: Admin only
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { sendBillingEmail } from "@/lib/email/automations"
import { requireAdminOrKey } from "@/lib/email/auth-helpers"

const requestSchema = z.object({
  type: z.enum([
    "payment_success",
    "payment_failed",
    "subscription_started",
    "subscription_canceled",
  ]),
  userId: z.string(),
  email: z.string().email("Invalid email address").optional(),
  firstName: z.string().optional(),
  productName: z.string().optional(),
  amount: z.number().optional(),
  billingPeriod: z.enum(["month", "year"]).optional(),
  retryUrl: z.string().url("Invalid retry URL").optional(),
})

export async function POST(request: Request) {
  try {
    console.log("[Email API] Billing email request received")

    // Authenticate: Admin only
    const auth = await requireAdminOrKey(request)
    if (auth instanceof NextResponse) {
      return auth
    }

    // Parse and validate request body
    const body = await request.json()
    const validated = requestSchema.safeParse(body)

    if (!validated.success) {
      console.error("[Email API] Validation error:", validated.error.errors)
      return NextResponse.json(
        { error: "Invalid request data", details: validated.error.errors },
        { status: 400 },
      )
    }

    const { type, userId, ...options } = validated.data

    console.log("[Email API] Sending billing email:", {
      type,
      userId,
      hasEmail: !!options.email,
      hasFirstName: !!options.firstName,
    })

    // Trigger automation
    const result = await sendBillingEmail(type, userId, options)

    if (!result.success) {
      console.error("[Email API] Failed to send billing email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Email API] Billing email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Email API] Error in billing route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

