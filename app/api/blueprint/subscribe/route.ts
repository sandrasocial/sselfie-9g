import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { addOrUpdateResendContact } from "@/lib/resend/manage-contact"
import { syncContactToFlodesk } from '@/lib/flodesk'

const resend = new Resend(process.env.RESEND_API_KEY!)
const sql = neon(process.env.DATABASE_URL!)

export async function POST(request: NextRequest) {
  console.log("[v0] Blueprint subscribe POST handler called")

  try {
    const body = await request.json()
    console.log("[v0] Request body:", body)

    const { email, name, formData, selectedFeedStyle, step, source, utm_source, utm_medium, utm_campaign, referrer, user_agent } = body

    if (!email || !name) {
      console.log("[v0] Missing email or name")
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    // Extract feed_style: prefer selectedFeedStyle, fallback to formData.vibe (backward compatibility)
    const feedStyle = selectedFeedStyle || formData?.vibe || null
    console.log("[v0] Feed style extracted:", { selectedFeedStyle, formDataVibe: formData?.vibe, feedStyle })

    console.log("[v0] Email and name received:", { email, name })

    // Check if email already exists
    console.log("[v0] Checking if email already exists")
    const existingSubscriber = await sql`
      SELECT id, access_token, welcome_email_sent, name, resend_contact_id, email
      FROM blueprint_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    if (existingSubscriber.length > 0) {
      console.log("[v0] Existing subscriber found:", existingSubscriber[0].id)
      const subscriber = existingSubscriber[0]

      // Update form data if provided
      if (formData) {
        await sql`
          UPDATE blueprint_subscribers
          SET form_data = ${JSON.stringify(formData)},
              business = ${formData.business || null},
              dream_client = ${formData.dreamClient || null},
              struggle = ${formData.struggle || null},
              selfie_skill_level = ${formData.lightingKnowledge || null},
              feed_style = ${feedStyle},
              post_frequency = ${formData.postFrequency || null},
              updated_at = NOW()
          WHERE id = ${subscriber.id}
        `
      }

      return NextResponse.json({
        success: true,
        accessToken: subscriber.access_token,
        alreadySubscribed: true,
        message: "Welcome back! Continuing your blueprint...",
      })
    }

    // Generate access token for new subscriber
    const accessToken = crypto.randomUUID()
    console.log("[v0] Generated access token for new subscriber")

    // Insert new subscriber
    console.log("[v0] Inserting new subscriber into database")
    const result = await sql`
      INSERT INTO blueprint_subscribers (
        email, name, source, access_token, utm_source, utm_medium, 
        utm_campaign, referrer, user_agent, email_tags, form_data,
        business, dream_client, struggle, selfie_skill_level, feed_style, post_frequency,
        created_at, updated_at, welcome_email_sent, welcome_email_sent_at
      )
      VALUES (
        ${email},
        ${name},
        ${source || "brand-blueprint"},
        ${accessToken},
        ${utm_source || null},
        ${utm_medium || null},
        ${utm_campaign || null},
        ${referrer || null},
        ${user_agent || null},
        ARRAY['blueprint-subscriber', 'sselfie-brand-blueprint']::text[],
        ${formData ? JSON.stringify(formData) : null},
        ${formData?.business || null},
        ${formData?.dreamClient || null},
        ${formData?.struggle || null},
        ${formData?.lightingKnowledge || null},
        ${feedStyle},
        ${formData?.postFrequency || null},
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

    // Add to Resend audience
    try {
      const firstName = name.split(" ")[0] || name
      const resendResult = await addOrUpdateResendContact(email, firstName, {
        source: "blueprint-subscriber",
        status: "lead",
        product: "sselfie-brand-blueprint",
        journey: "nurture",
        signup_date: new Date().toISOString().split("T")[0],
      })

      if (resendResult.success && resendResult.contactId) {
        console.log(`[v0] Added to Resend audience with ID: ${resendResult.contactId}`)

        await sql`
          UPDATE blueprint_subscribers 
          SET resend_contact_id = ${resendResult.contactId},
              updated_at = NOW()
          WHERE id = ${newSubscriber.id}
        `
      } else {
        console.log(`[v0] Resend sync skipped: ${resendResult.error || "Unknown error"}`)
      }
    } catch (resendError) {
      console.log(
        `[v0] Resend integration unavailable, continuing without it:`,
        resendError instanceof Error ? resendError.message : "Unknown error",
      )
    }

    // NEW: Add to Flodesk (marketing contacts)
    try {
      const flodeskResult = await syncContactToFlodesk({
        email,
        name,
        source: 'blueprint-subscriber',
        tags: ['brand-blueprint', 'lead'],
        customFields: {
          status: 'lead',
          product: 'sselfie-brand-blueprint',
          journey: 'nurture',
          signupDate: new Date().toISOString().split('T')[0],
          business: formData?.business,
          dreamClient: formData?.dreamClient,
          struggle: formData?.struggle
        }
      })
      
      if (flodeskResult.success) {
        console.log(`[v0] ✅ Added to Flodesk: ${email}`)
        
        await sql`
          UPDATE blueprint_subscribers 
          SET flodesk_contact_id = ${flodeskResult.contactId || email},
              synced_to_flodesk = true,
              flodesk_synced_at = NOW(),
              updated_at = NOW()
          WHERE id = ${newSubscriber.id}
        `
      } else {
        console.warn(`[v0] ⚠️ Flodesk sync failed: ${flodeskResult.error}`)
      }
    } catch (flodeskError: any) {
      console.warn(`[v0] ⚠️ Flodesk sync error:`, flodeskError)
    }

    console.log("[v0] Returning success response")
    return NextResponse.json({
      success: true,
      accessToken: newSubscriber.access_token,
      message: "Successfully saved! Continue building your blueprint.",
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
