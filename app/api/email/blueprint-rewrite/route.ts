/**
 * Brand Blueprint Rewrite Email Automation
 * POST /api/email/blueprint-rewrite
 * 
 * Triggers: sendRewrittenBlueprintEmail()
 * Access: User or Admin
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { sendRewrittenBlueprintEmail } from "@/lib/email/automations"
import { requireUserOrAdmin } from "@/lib/email/auth-helpers"

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  blueprintData: z.any().optional(),
  userId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    console.log("[Email API] Blueprint rewrite email request received")

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

    const { email, firstName, blueprintData, userId } = validated.data

    // Use authenticated user's ID if not provided
    const targetUserId = userId || auth.userId

    // Verify user can only trigger for themselves unless admin
    if (!auth.isAdmin && targetUserId !== auth.userId) {
      return NextResponse.json(
        { error: "Unauthorized: Cannot send email for other users" },
        { status: 403 },
      )
    }

    console.log("[Email API] Sending rewritten blueprint email:", {
      email,
      userId: targetUserId,
      hasFirstName: !!firstName,
      hasBlueprintData: !!blueprintData,
    })

    // Trigger automation
    const result = await sendRewrittenBlueprintEmail({
      email,
      firstName,
      blueprintData,
      userId: targetUserId,
    })

    if (!result.success) {
      console.error("[Email API] Failed to send rewritten blueprint email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Email API] Rewritten blueprint email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Email API] Error in blueprint rewrite route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

