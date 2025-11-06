import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email/send-email"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"
import { neon } from "@/lib/db"

const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: Request) {
  try {
    const { email } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    console.log(`[v0] Testing purchase email flow for: ${email}`)

    // Generate the welcome email
    const productionUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    const emailContent = generateWelcomeEmail({
      customerName: email.split("@")[0],
      customerEmail: email,
      passwordSetupUrl: `${productionUrl}/auth/setup-password`,
      creditsGranted: 50,
      packageName: "ONE-TIME SESSION (TEST)",
    })

    console.log("[v0] Email content generated:", {
      hasHtml: !!emailContent.html,
      hasText: !!emailContent.text,
      htmlLength: emailContent.html?.length || 0,
      textLength: emailContent.text?.length || 0,
    })

    // Send the email
    const emailResult = await sendEmail({
      to: email,
      subject: "TEST: Welcome to SSelfie! Set up your account",
      html: emailContent.html,
      text: emailContent.text,
      tags: ["test", "welcome", "account-setup"],
    })

    if (emailResult.success) {
      console.log(`[v0] Test email sent successfully, message ID: ${emailResult.messageId}`)

      // Log to database
      await sql`
        INSERT INTO email_logs (
          user_email,
          email_type,
          resend_message_id,
          status,
          sent_at
        )
        VALUES (
          ${email},
          'test_welcome',
          ${emailResult.messageId},
          'sent',
          NOW()
        )
      `

      return NextResponse.json({
        success: true,
        messageId: emailResult.messageId,
        message: "Test email sent successfully! Check your inbox (and spam folder).",
      })
    } else {
      console.error(`[v0] Failed to send test email: ${emailResult.error}`)

      return NextResponse.json(
        {
          success: false,
          error: emailResult.error,
          message: "Failed to send test email",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[v0] Test email error:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        message: "Error testing email flow",
      },
      { status: 500 },
    )
  }
}
