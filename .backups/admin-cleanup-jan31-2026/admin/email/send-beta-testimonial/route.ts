import { NextResponse } from "next/server"
import { Resend } from "resend"
import { generateBetaTestimonialEmail } from "@/lib/email/templates/beta-testimonial-request"

const resend = new Resend(process.env.RESEND_API_KEY!)

export async function POST() {
  try {
    const audienceId = process.env.RESEND_AUDIENCE_ID
    const betaSegmentId = process.env.RESEND_BETA_SEGMENT_ID

    if (!audienceId) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_AUDIENCE_ID not configured",
          message:
            "RESEND_AUDIENCE_ID not configured. Please add your Resend audience ID to environment variables in the Vars section of the sidebar.",
        },
        { status: 400 },
      )
    }

    if (!betaSegmentId) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_BETA_SEGMENT_ID not configured",
          message:
            "RESEND_BETA_SEGMENT_ID not configured. Please add your Beta Users segment ID (8da5ee08-60cf-47a5-bdaa-9419c7eb5aa5) to environment variables in the Vars section of the sidebar.",
        },
        { status: 400 },
      )
    }

    console.log("[v0] Creating beta testimonial broadcast for segment:", betaSegmentId)

    let recipientCount = 0
    try {
      const segmentContacts = await resend.contacts.list({
        audienceId: audienceId,
      })
      
      // Note: Resend doesn't have a direct segment contacts API yet,
      // so we show the total audience size with a note about segment filtering
      recipientCount = segmentContacts.data?.data?.length || 0
      console.log(`[v0] Audience has ${recipientCount} total contacts (broadcast will use segment filter)`)
    } catch (error) {
      console.warn("[v0] Could not fetch contact count:", error)
      recipientCount = 0
    }

    // Generate the email template (personalization happens in Resend)
    const emailTemplate = generateBetaTestimonialEmail({ customerName: "{{first_name}}" })

    const broadcast = await resend.broadcasts.create({
      audienceId: betaSegmentId, // Use segment ID instead of full audience ID
      from: "Sandra at SSELFIE <hello@sselfie.ai>",
      subject: "You're helping me build something incredible ✨",
      html: emailTemplate.html,
    })

    if (broadcast.error) {
      console.error("[v0] Error creating broadcast:", broadcast.error)

      // Check if it's a domain verification error
      if (broadcast.error.message?.includes("domain") || broadcast.error.message?.includes("verified")) {
        return NextResponse.json(
          {
            success: false,
            error: "Domain not verified",
            details: `Your sselfie.ai domain needs to be verified in Resend before sending broadcasts.`,
            instructions: [
              "Go to https://resend.com/domains",
              "Verify your sselfie.ai domain",
              "Then try sending the broadcast again",
            ],
          },
          { status: 400 },
        )
      }

      return NextResponse.json(
        {
          success: false,
          error: "Failed to create broadcast",
          details: broadcast.error.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Broadcast created successfully:", broadcast.data?.id)

    return NextResponse.json({
      success: true,
      broadcastId: broadcast.data?.id,
      recipientCount, 
      message: `Beta testimonial request created successfully from hello@sselfie.ai! This will be sent to your Beta Users segment (paying customers only).`,
      instructions: [
        "1. Go to https://resend.com/broadcasts",
        "2. Find your broadcast (should be at the top)",
        "3. The broadcast will be sent ONLY to your Beta Users segment (paying customers, not freebie leads)",
        "4. Preview the email to make sure it looks perfect",
        "5. Click 'Send' when ready to send to all beta customers",
      ],
      note: `This broadcast uses your Beta Users segment to exclude freebie subscribers and only target paying customers.`,
    })
  } catch (error) {
    console.error("[v0] Error creating beta testimonial broadcast:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create broadcast",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
