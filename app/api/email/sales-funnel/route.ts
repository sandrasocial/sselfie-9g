/**
 * Sales Funnel Sequence Automation (7-Day Nurture)
 * POST /api/email/sales-funnel
 * 
 * Triggers: startSalesFunnelSequence()
 * Access: Admin only
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { startSalesFunnelSequence } from "@/lib/email/automations"
import { requireAdminOrKey } from "@/lib/email/auth-helpers"

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  userId: z.string(),
  trigger: z.enum(["freebie", "maya-interaction"]),
})

export async function POST(request: Request) {
  try {
    console.log("[Email API] Sales funnel sequence request received")

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

    const { email, firstName, userId, trigger } = validated.data

    console.log("[Email API] Starting sales funnel sequence:", {
      email,
      userId,
      trigger,
      hasFirstName: !!firstName,
    })

    // Trigger automation
    const result = await startSalesFunnelSequence({
      email,
      firstName,
      userId,
      trigger,
    })

    if (!result.success) {
      console.error("[Email API] Failed to start sales funnel:", result.errors)
      return NextResponse.json(
        {
          success: false,
          scheduled: result.scheduled,
          errors: result.errors,
        },
        { status: 500 },
      )
    }

    console.log(
      `[Email API] Sales funnel sequence started: ${result.scheduled} emails scheduled`,
    )

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
    })
  } catch (error) {
    console.error("[Email API] Error in sales funnel route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

