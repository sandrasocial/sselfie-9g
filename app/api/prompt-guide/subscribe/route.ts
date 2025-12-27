import { type NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { Resend } from "resend"
import { addOrUpdateResendContact, addContactToSegment } from "@/lib/resend/manage-contact"
import { syncContactToLoops } from '@/lib/loops/manage-contact'
import { cookies } from "next/headers"

const resend = new Resend(process.env.RESEND_API_KEY!)
const sql = neon(process.env.DATABASE_URL!)

// Free Prompt Guide segment ID (hardcoded for reliability)
const FREE_PROMPT_GUIDE_SEGMENT_ID = "b25764ce-1f17-4869-9859-546cf9729355"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      email,
      name,
      emailListTag,
      pageId,
      utm_source,
      utm_medium,
      utm_campaign,
      referrer,
      user_agent,
    } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required" }, { status: 400 })
    }

    // Check if email already exists
    const existingSubscriber = await sql`
      SELECT id, access_token
      FROM freebie_subscribers
      WHERE email = ${email}
      LIMIT 1
    `

    let accessToken: string

    let newSubscriberId: number | null = null

    if (existingSubscriber.length > 0) {
      accessToken = existingSubscriber[0].access_token
    } else {
      // Create new subscriber
      accessToken = crypto.randomUUID()

      const insertResult = await sql`
        INSERT INTO freebie_subscribers (
          email, name, source, access_token, utm_source, utm_medium,
          utm_campaign, referrer, user_agent, email_tags, created_at, updated_at
        )
        VALUES (
          ${email},
          ${name},
          'prompt-guide',
          ${accessToken},
          ${utm_source || null},
          ${utm_medium || null},
          ${utm_campaign || null},
          ${referrer || null},
          ${user_agent || null},
          ARRAY['prompt-guide-subscriber', ${emailListTag || 'prompt-guide'}::text]::text[],
          NOW(),
          NOW()
        )
        RETURNING id
      `

      if (insertResult && insertResult.length > 0) {
        newSubscriberId = insertResult[0].id
      }

      // Add to Resend contact list if tag provided
      if (emailListTag && process.env.RESEND_API_KEY) {
        try {
          const firstName = name.split(" ")[0] || name
          const result = await addOrUpdateResendContact(email, firstName, {
            source: "prompt-guide-subscriber",
            status: "lead",
            product: emailListTag,
            journey: "nurture",
          })

          // If contact was added successfully, add to the Free Prompt Guide segment
          if (result.success) {
            try {
              const segmentResult = await addContactToSegment(email, FREE_PROMPT_GUIDE_SEGMENT_ID)
              if (segmentResult.success) {
                console.log(`[PromptGuide] ✅ Added ${email} to Free Prompt Guide segment (${FREE_PROMPT_GUIDE_SEGMENT_ID})`)
              } else {
                console.warn(`[PromptGuide] ⚠️ Failed to add ${email} to segment: ${segmentResult.error}`)
              }
            } catch (segmentError) {
              console.error("[PromptGuide] Error adding to segment:", segmentError)
              // Don't fail the request if segment addition fails
            }
          }
        } catch (error) {
          console.error("[PromptGuide] Error adding to Resend:", error)
          // Don't fail the request if Resend fails
        }
      }

      // NEW: Add to Loops
      if (newSubscriberId) {
        try {
          const loopsResult = await syncContactToLoops({
            email,
            name,
            source: 'prompt-guide-subscriber',
            tags: ['prompt-guide', emailListTag || 'prompt-guide'],
            customFields: {
              status: 'lead',
              product: emailListTag,
              journey: 'nurture'
            }
          })
          
          if (loopsResult.success) {
            console.log(`[PromptGuide] ✅ Added to Loops: ${email}`)
            
            await sql`
              UPDATE freebie_subscribers 
              SET loops_contact_id = ${loopsResult.contactId || email},
                  synced_to_loops = true,
                  loops_synced_at = NOW()
              WHERE id = ${newSubscriberId}
            `
          }
        } catch (loopsError: any) {
          console.warn(`[PromptGuide] ⚠️ Loops sync error:`, loopsError)
        }
      }
    }

    // Set access token cookie
    const cookieStore = await cookies()
    cookieStore.set("access_token", accessToken, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    // Track email capture
    if (pageId) {
      await sql`
        UPDATE prompt_pages
        SET email_capture_count = email_capture_count + 1
        WHERE id = ${pageId}
      `.catch((error) => {
        console.error("[PromptGuide] Error tracking email capture:", error)
      })
    }

    return NextResponse.json({
      success: true,
      accessToken,
      message: "Successfully subscribed",
    })
  } catch (error) {
    console.error("[PromptGuide] Error subscribing:", error)
    return NextResponse.json(
      {
        error: "Failed to subscribe",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    )
  }
}
