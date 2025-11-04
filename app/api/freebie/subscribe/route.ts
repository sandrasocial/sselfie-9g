import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY!)

async function ensureTableExists() {
  const supabase = createAdminClient()

  // Try to query the table - if it doesn't exist, create it
  const { error: checkError } = await supabase.from("freebie_subscribers").select("id").limit(1)

  // If table doesn't exist (PGRST205 error), create it
  if (checkError && checkError.code === "PGRST205") {
    console.log("[v0] Table doesn't exist, creating it now...")

    // Execute raw SQL to create the table using Supabase's RPC
    // Note: This requires a custom function in Supabase, so we'll use a different approach
    // Instead, we'll return false and handle it in the main function
    return false
  }

  return true
}

export async function POST(request: NextRequest) {
  console.log("[v0] Freebie subscribe POST handler called")

  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { email, name, source, utm_source, utm_medium, utm_campaign, referrer, user_agent } = body

    if (!email || !name) {
      console.log("[v0] Missing email or name")
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    console.log("[v0] Email and name received:", { email, name })

    const accessToken = crypto.randomUUID()
    console.log("[v0] Generated access token")

    console.log("[v0] Creating Supabase admin client")
    const supabase = createAdminClient()

    // Ensure table exists before inserting subscriber
    const tableExists = await ensureTableExists()
    if (!tableExists) {
      console.error("[v0] Database table not set up")
      return NextResponse.json(
        {
          error: "Database table not set up",
          details:
            "Please run the setup script: scripts/create-freebie-subscribers-table.sql in your Supabase SQL editor",
        },
        { status: 500 },
      )
    }

    console.log("[v0] Inserting subscriber into database")
    const { data: result, error: dbError } = await supabase
      .from("freebie_subscribers")
      .insert({
        email,
        name,
        source: source || "selfie-guide",
        access_token: accessToken,
        utm_source,
        utm_medium,
        utm_campaign,
        referrer,
        user_agent,
      })
      .select("id, access_token")
      .single()

    if (dbError) {
      console.error("[v0] Database error:", dbError)

      if (dbError.code === "PGRST205" || dbError.message.includes("Could not find the table")) {
        return NextResponse.json(
          {
            error: "Database table not set up",
            details:
              "Please run the setup script: scripts/create-freebie-subscribers-table.sql in your Supabase SQL editor",
            sqlError: dbError.message,
          },
          { status: 500 },
        )
      }

      return NextResponse.json(
        {
          error: "Failed to save subscription",
          details: dbError.message,
        },
        { status: 500 },
      )
    }

    console.log("[v0] Subscriber created with ID:", result.id)

    let emailSent = false
    let emailError = null
    try {
      if (process.env.RESEND_API_KEY) {
        console.log("[v0] Sending welcome email via Resend")

        const guideUrl = `${process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"}/freebie/selfie-guide/access/${accessToken}`

        await resend.emails.send({
          from: "SSELFIE <hello@sselfie.ai>",
          to: email,
          replyTo: "hello@sselfie.ai",
          subject: "Your Selfie Guide is Ready! 📸",
          html: `
            <div style="font-family: system-ui, -apple-system, sans-serif; max-width: 600px; margin: 0 auto;">
              <h1 style="font-size: 24px; font-weight: 300; margin-bottom: 16px;">Hey ${name}!</h1>
              <p style="font-size: 16px; line-height: 1.6; color: #333;">Your selfie guide is ready and waiting for you!</p>
              <p style="font-size: 16px; line-height: 1.6; color: #333;">Click the button below to access your guide and start taking selfies that make you feel amazing.</p>
              <a href="${guideUrl}" style="display: inline-block; background: #000; color: #fff; padding: 12px 32px; text-decoration: none; border-radius: 8px; margin: 24px 0; font-weight: 500;">ACCESS YOUR GUIDE</a>
              <p style="font-size: 14px; color: #666; margin-top: 32px;">Can't click the button? Copy and paste this link: ${guideUrl}</p>
              <p style="font-size: 14px; color: #666; margin-top: 24px;">xo,<br>Sandra</p>
            </div>
          `,
        })

        emailSent = true
        console.log("[v0] Welcome email sent successfully")
      } else {
        console.log("[v0] RESEND_API_KEY not configured, skipping email")
      }
    } catch (error: any) {
      console.error("[v0] Error sending email:", error)
      emailError = error.message || "Unknown email error"

      if (error.message && error.message.includes("domain is not verified")) {
        console.error(
          "[v0] IMPORTANT: Resend domain not verified. Please verify sselfie.ai at https://resend.com/domains",
        )
        emailError = "Domain not verified in Resend. Please verify sselfie.ai at https://resend.com/domains"
      }
    }

    console.log("[v0] Returning success response")
    return NextResponse.json({
      success: true,
      accessToken: result.access_token,
      emailSent,
      emailError,
      message: emailSent
        ? "Successfully subscribed! Check your email for the guide link."
        : "Successfully subscribed! Redirecting to your guide...",
    })
  } catch (error) {
    console.error("[v0] Error in POST handler:", error)
    return NextResponse.json(
      {
        error: "Failed to process subscription",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
