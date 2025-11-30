/**
 * Brand Blueprint Delivery Email Automation
 * POST /api/email/brand-blueprint
 * 
 * Triggers: sendBrandBlueprintEmail()
 * Access: User or Admin
 */

import { NextResponse } from "next/server"
import { z } from "zod"
import { sendBrandBlueprintEmail } from "@/lib/email/automations"
import { requireUserOrAdmin } from "@/lib/email/auth-helpers"

const requestSchema = z.object({
  email: z.string().email("Invalid email address"),
  firstName: z.string().optional(),
  blueprintUrl: z.string().url("Invalid blueprint URL"),
  userId: z.string().optional(),
})

export async function POST(request: Request) {
  try {
    console.log("[Email API] Brand Blueprint email request received")

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

    const { email, firstName, blueprintUrl, userId } = validated.data

    // Use authenticated user's ID if not provided
    const targetUserId = userId || auth.userId

    console.log("[Email API] Sending brand blueprint email:", {
      email,
      userId: targetUserId,
      hasFirstName: !!firstName,
    })

    // Trigger automation
    const result = await sendBrandBlueprintEmail({
      email,
      firstName,
      blueprintUrl,
      userId: targetUserId,
    })

    if (!result.success) {
      console.error("[Email API] Failed to send brand blueprint email:", result.error)
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 },
      )
    }

    console.log("[Email API] Brand blueprint email sent successfully")

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[Email API] Error in brand blueprint route:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

