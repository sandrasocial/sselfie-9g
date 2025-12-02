import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"

export async function GET() {
  try {
    console.log("[v0] Testing email sending...")

    // Check if RESEND_API_KEY is configured
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json(
        {
          success: false,
          error: "RESEND_API_KEY not configured",
        },
        { status: 500 },
      )
    }

    // Generate test email
    const emailContent = generateWelcomeEmail({
      customerName: "Test User",
      customerEmail: process.env.ADMIN_EMAIL || "test@example.com",
      passwordSetupUrl: "https://sselfie.ai/auth/setup-password?token=test",
      creditsGranted: 50,
      packageName: "Test Package",
    })

    console.log("[v0] Email content generated, length:", emailContent.html.length)

    // Send test email
    const result = await sendEmail({
      to: process.env.ADMIN_EMAIL || "test@example.com",
      subject: "🧪 Test Email from SSelfie",
      html: emailContent.html,
      text: emailContent.text,
      tags: ["test", "diagnostic"],
    })

    console.log("[v0] Email sent successfully:", result)

    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      recipient: process.env.ADMIN_EMAIL || "test@example.com",
      messageId: result.id,
    })
  } catch (error: any) {
    console.error("[v0] Email test failed:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.toString(),
      },
      { status: 500 },
    )
  }
}
