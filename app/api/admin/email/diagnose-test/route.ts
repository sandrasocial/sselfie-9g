import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"

const sql = neon(process.env.DATABASE_URL!)
const resend = new Resend(process.env.RESEND_API_KEY)
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

/**
 * Diagnostic endpoint to check email sending configuration and recent sends
 */
export async function GET(request: Request) {
  try {
    // Admin authentication check
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden - Admin only" }, { status: 403 })
    }

    const diagnostics: any = {
      timestamp: new Date().toISOString(),
      environment: {
        hasResendApiKey: !!process.env.RESEND_API_KEY,
        resendApiKeyPrefix: process.env.RESEND_API_KEY?.substring(0, 10) + "...",
        adminEmail: ADMIN_EMAIL,
        hasDatabaseUrl: !!process.env.DATABASE_URL,
      },
      recentEmailLogs: [],
      resendStatus: null,
      testSend: null,
    }

    // Check recent email logs
    try {
      const recentLogs = await sql`
        SELECT 
          user_email,
          email_type,
          status,
          resend_message_id,
          error_message,
          sent_at
        FROM email_logs
        WHERE user_email = ${ADMIN_EMAIL}
        ORDER BY sent_at DESC
        LIMIT 5
      `
      diagnostics.recentEmailLogs = recentLogs || []
    } catch (error: any) {
      diagnostics.recentEmailLogsError = error.message
    }

    // Test Resend API connection
    try {
      // Just check if we can create a Resend instance (doesn't send anything)
      const testResend = new Resend(process.env.RESEND_API_KEY)
      diagnostics.resendStatus = {
        connected: true,
        message: "Resend client initialized successfully",
      }
    } catch (error: any) {
      diagnostics.resendStatus = {
        connected: false,
        error: error.message,
      }
    }

    // Optional: Send a simple test email
    const sendTest = new URL(request.url).searchParams.get("sendTest") === "true"
    if (sendTest) {
      try {
        const { data, error } = await resend.emails.send({
          from: "SSelfie <hello@sselfie.ai>",
          to: ADMIN_EMAIL,
          subject: "[DIAGNOSTIC TEST] Email System Check",
          html: `
            <h1>Email System Diagnostic Test</h1>
            <p>If you received this email, your email system is working correctly!</p>
            <p>Timestamp: ${new Date().toISOString()}</p>
          `,
          text: "Email System Diagnostic Test - If you received this, your email system is working!",
        })

        if (error) {
          diagnostics.testSend = {
            success: false,
            error: error.message,
            details: error,
          }
        } else {
          diagnostics.testSend = {
            success: true,
            messageId: data?.id,
            message: "Test email sent successfully. Check your inbox (and spam folder).",
          }
        }
      } catch (error: any) {
        diagnostics.testSend = {
          success: false,
          error: error.message,
        }
      }
    }

    return NextResponse.json({
      success: true,
      diagnostics,
      instructions: {
        checkLogs: "Review recentEmailLogs to see if emails were actually sent",
        checkResend: "Review resendStatus to verify API connection",
        sendTest: "Add ?sendTest=true to URL to send a test email",
        nextSteps: [
          "1. Check recentEmailLogs - look for 'sent' status and resend_message_id",
          "2. If logs show 'sent', check Resend dashboard: https://resend.com/emails",
          "3. If logs show 'failed', check error_message for details",
          "4. Use ?sendTest=true to send a simple test email",
          "5. Check spam/junk folder if email shows as delivered in Resend",
        ],
      },
    })
  } catch (error: any) {
    console.error("[v0] Error in diagnostic endpoint:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to run diagnostics",
        details: error.message || "Unknown error",
      },
      { status: 500 },
    )
  }
}








































