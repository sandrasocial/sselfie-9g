import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { generateFreebieGuideEmail } from "@/lib/email/templates/freebie-guide-email"

const resend = new Resend(process.env.RESEND_API_KEY!)
const sql = neon(process.env.DATABASE_URL!)

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

    console.log("[v0] Checking if email already exists")
    const existingSubscriber = await sql`
      SELECT id, access_token, guide_access_email_sent, name, resend_contact_id, email
      FROM freebie_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    if (existingSubscriber.length > 0) {
      console.log("[v0] Existing subscriber found:", existingSubscriber[0].id)
      const subscriber = existingSubscriber[0]

      const emailAlreadySent = subscriber.guide_access_email_sent !== false

      if (!emailAlreadySent) {
        console.log("[v0] Email was never sent, resending now")
        let emailSent = false
        let emailError = null

        try {
          if (process.env.RESEND_API_KEY) {
            console.log("[v0] Sending guide access email via Resend")

            const productionUrl =
              process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
            const guideUrl = `${productionUrl}/freebie/selfie-guide/access/${subscriber.access_token}`
            const firstName = subscriber.name.split(" ")[0] || subscriber.name

            const emailContent = generateFreebieGuideEmail({
              firstName,
              email: subscriber.email,
              guideAccessLink: guideUrl,
            })

            await resend.emails.send({
              from: "SSELFIE <hello@sselfie.ai>",
              to: subscriber.email,
              replyTo: "hello@sselfie.ai",
              subject: "Your Free Selfie Guide is Ready 📸",
              html: emailContent.html,
              text: emailContent.text,
              tags: [{ name: "freebie-guide", value: "resend" }],
            })

            emailSent = true
            console.log("[v0] Guide access email sent successfully to existing subscriber")

            await sql`
              UPDATE freebie_subscribers
              SET guide_access_email_sent = true,
                  guide_access_email_sent_at = NOW(),
                  updated_at = NOW()
              WHERE id = ${subscriber.id}
            `
          } else {
            console.log("[v0] RESEND_API_KEY not configured, skipping email")
          }
        } catch (error: any) {
          console.error("[v0] Error sending email:", error)
          emailError = error.message || "Unknown email error"
        }

        return NextResponse.json({
          success: true,
          accessToken: subscriber.access_token,
          emailSent,
          emailError,
          alreadySubscribed: true,
          message: emailSent ? "Email sent! Check your inbox for the guide link." : "Redirecting to your guide...",
        })
      }

      console.log("[v0] Email was already sent, returning access")
      return NextResponse.json({
        success: true,
        accessToken: subscriber.access_token,
        emailSent: true,
        alreadySubscribed: true,
        message: "Welcome back! Redirecting to your guide...",
      })
    }

    const accessToken = crypto.randomUUID()
    console.log("[v0] Generated access token for new subscriber")

    console.log("[v0] Inserting new subscriber into database")
    const result = await sql`
      INSERT INTO freebie_subscribers (
        email, name, source, access_token, utm_source, utm_medium, 
        utm_campaign, referrer, user_agent, email_tags, created_at, updated_at,
        guide_access_email_sent, guide_access_email_sent_at
      )
      VALUES (
        ${email},
        ${name},
        ${source || "selfie-guide"},
        ${accessToken},
        ${utm_source || null},
        ${utm_medium || null},
        ${utm_campaign || null},
        ${referrer || null},
        ${user_agent || null},
        ARRAY['freebie-subscriber', 'sselfie-guide']::text[],
        NOW(),
        NOW(),
        false,
        NULL
      )
      RETURNING id, access_token
    `

    if (!result || result.length === 0) {
      console.error("[v0] Failed to insert subscriber")
      return NextResponse.json(
        {
          error: "Failed to save subscription",
        },
        { status: 500 },
      )
    }

    const newSubscriber = result[0]
    console.log("[v0] Subscriber created with ID:", newSubscriber.id)

    const firstName = name.split(" ")[0] || name
    const resendResult = await addOrUpdateResendContact(email, firstName, {
      source: "freebie-subscriber",
      status: "lead",
      product: "sselfie-guide",
      journey: "nurture",
      signup_date: new Date().toISOString().split("T")[0],
    })

    if (resendResult.success && resendResult.contactId) {
      console.log(`[v0] Added to Resend audience with ID: ${resendResult.contactId}`)

      await sql`
        UPDATE freebie_subscribers 
        SET resend_contact_id = ${resendResult.contactId},
            updated_at = NOW()
        WHERE id = ${newSubscriber.id}
      `
    } else {
      console.error(`[v0] Failed to add to Resend audience: ${resendResult.error}`)
    }

    let emailSent = false
    let emailError = null
    try {
      if (process.env.RESEND_API_KEY) {
        console.log("[v0] Sending guide access email via Resend")

        const productionUrl =
          process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai"
        const guideUrl = `${productionUrl}/freebie/selfie-guide/access/${accessToken}`

        const emailContent = generateFreebieGuideEmail({
          firstName,
          email,
          guideAccessLink: guideUrl,
        })

        await resend.emails.send({
          from: "SSELFIE <hello@sselfie.ai>",
          to: email,
          replyTo: "hello@sselfie.ai",
          subject: "Your Free Selfie Guide is Ready 📸",
          html: emailContent.html,
          text: emailContent.text,
          tags: [{ name: "freebie-guide", value: "signup" }],
        })

        emailSent = true
        console.log("[v0] Guide access email sent successfully")

        await sql`
          UPDATE freebie_subscribers
          SET guide_access_email_sent = true,
              guide_access_email_sent_at = NOW(),
              updated_at = NOW()
          WHERE id = ${newSubscriber.id}
        `
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
      accessToken: newSubscriber.access_token,
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
