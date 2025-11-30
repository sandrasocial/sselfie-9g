/**
 * Welcome Sequence Automation (5 emails)
 * POST /api/email/welcome-sequence
 * 
 * Triggers: startWelcomeSequence()
 * Access: User or Admin
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { startWelcomeSequence } from "@/lib/email/automations"
import { requireUserOrAdmin } from "@/lib/email/auth-helpers"

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  userId: z.string(),
})

export async function POST(request: Request) {
  try {
    console.log("[Email API] Welcome sequence request received")

    // Authenticate: User or Admin
    const auth = await requireUserOrAdmin(request)
    if (!auth.success) {
      return auth.response
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

    const { email, firstName, userId } = validated.data

    // Verify user can only trigger for themselves unless admin
    if (!auth.isAdmin && userId !== auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot trigger sequence for other users" },
        { status: 403 },
      )
    }

    console.log("[Email API] Starting welcome sequence:", {
      email,
      userId,
      hasFirstName: !!firstName,
    })

    // Trigger automation
    const result = await startWelcomeSequence({
      email,
      firstName,
      userId,
    })

    if (!result.success) {
      console.error("[Email API] Failed to start welcome sequence:", result.errors)
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
      `[Email API] Welcome sequence started: ${result.scheduled} emails scheduled`,
    )

    return NextResponse.json({
      success: true,
      scheduled: result.scheduled,
    })
  } catch (error) {
    console.error("[Email API] Error in welcome sequence route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

