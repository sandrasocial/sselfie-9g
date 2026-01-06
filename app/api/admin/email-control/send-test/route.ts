import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { sendEmail } from "@/lib/email/send-email"

const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * POST /api/admin/email-control/send-test
 * Send a test email to the admin
 * Body: { subject?: string, html?: string, text?: string, template?: string }
 */
export async function POST(request: Request) {
  try {
    // Admin auth check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await request.json()
    const { subject, html, text, template } = body

    // Default test email content
    const emailSubject = subject || "Test Email from SSELFIE Admin"
    const emailHtml =
      html ||
      `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1>Test Email</h1>
        <p>This is a test email sent from the SSELFIE Admin Email Control Center.</p>
        <p>If you received this, email sending is working correctly.</p>
        <p><strong>Template:</strong> ${template || "default"}</p>
        <p><strong>Sent at:</strong> ${new Date().toISOString()}</p>
      </div>
    `
    const emailText = text || "This is a test email sent from the SSELFIE Admin Email Control Center."

    // Send test email
    const result = await sendEmail({
      to: ADMIN_EMAIL,
      subject: emailSubject,
      html: emailHtml,
      text: emailText,
      emailType: "admin-test",
    })

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: "Test email sent successfully",
        messageId: result.messageId,
      })
    } else {
      return NextResponse.json(
        {
          success: false,
          error: result.error || "Failed to send test email",
        },
        { status: 500 },
      )
    }
  } catch (error: any) {
    console.error("[EMAIL-CONTROL] Error sending test email:", error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to send test email",
      },
      { status: 500 },
    )
  }
}

