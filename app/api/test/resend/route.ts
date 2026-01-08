import { Resend } from "resend"
import { NextResponse } from "next/server"

export async function GET() {
  try {
    const resend = new Resend(process.env.RESEND_API_KEY)

    console.log("[v0] Testing Resend configuration...")

    // Send a test email
    const { data, error } = await resend.emails.send({
      from: "hello@sselfie.ai",
      to: process.env.ADMIN_EMAIL || "test@example.com",
      subject: "Resend Test Email",
      html: "<p>This is a test email from SSelfie. If you receive this, Resend is configured correctly!</p>",
      tracking_opens: false,
      tracking_clicks: false,
    })

    if (error) {
      console.error("[v0] Resend test failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          details: error,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Resend test successful:", data)
    return NextResponse.json({
      success: true,
      message: "Test email sent successfully",
      messageId: data?.id,
    })
  } catch (error: any) {
    console.error("[v0] Resend test error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
      },
      { status: 500 },
    )
  }
}
