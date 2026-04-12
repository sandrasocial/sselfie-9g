import { NextResponse } from "next/server"
import { sql } from "@/lib/db/client"
import { sendEmail } from "@/lib/email/send-email"
import { getFirstNameForEmail } from "@/lib/email/recipient-name"
import { generateSelfieGuideCompleteEmail } from "@/lib/email/templates/selfie-guide-complete"
import { generateSelfieGuideDay14MayaBridgeEmail } from "@/lib/email/templates/selfie-guide-day14-maya-bridge"

const FROM_EMAIL = "Sandra from SSELFIE <hello@sselfie.ai>"
const REPLY_TO_EMAIL = "hello@sselfie.ai"

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { token, chapterIndex, challengeDays, completed, challengeComplete } = body

    // Validate required fields
    if (typeof token !== "string" || token.trim() === "") {
      return NextResponse.json({ error: "Invalid token" }, { status: 400 })
    }
    if (typeof chapterIndex !== "number") {
      return NextResponse.json({ error: "Invalid chapterIndex" }, { status: 400 })
    }

    const trimmedToken = token.trim()
    const challengeDayCount =
      Array.isArray(challengeDays) && challengeDays.length > 0 ? challengeDays.length : 0

    // Look up subscriber by access_token
    const rows = await sql`
      SELECT id, email, name, guide_completed_at, guide_challenge_completed_at
      FROM freebie_subscribers
      WHERE access_token = ${trimmedToken}
      LIMIT 1
    `

    if (rows.length === 0) {
      return NextResponse.json({ error: "Subscriber not found" }, { status: 404 })
    }

    const subscriber = rows[0]
    const wasAlreadyCompleted = subscriber.guide_completed_at !== null
    const wasChallengeAlreadyCompleted = subscriber.guide_challenge_completed_at !== null

    // Build the update conditionally
    if (completed === true && challengeComplete === true) {
      await sql`
        UPDATE freebie_subscribers
        SET
          guide_chapter_index = GREATEST(COALESCE(guide_chapter_index, 0), ${chapterIndex}),
          guide_challenge_day = GREATEST(COALESCE(guide_challenge_day, 0), ${challengeDayCount}),
          guide_completed_at = CASE
            WHEN guide_completed_at IS NULL THEN NOW()
            ELSE guide_completed_at
          END,
          guide_challenge_completed_at = CASE
            WHEN guide_challenge_completed_at IS NULL THEN NOW()
            ELSE guide_challenge_completed_at
          END,
          updated_at = NOW()
        WHERE access_token = ${trimmedToken}
      `
    } else if (completed === true) {
      await sql`
        UPDATE freebie_subscribers
        SET
          guide_chapter_index = GREATEST(COALESCE(guide_chapter_index, 0), ${chapterIndex}),
          guide_challenge_day = GREATEST(COALESCE(guide_challenge_day, 0), ${challengeDayCount}),
          guide_completed_at = CASE
            WHEN guide_completed_at IS NULL THEN NOW()
            ELSE guide_completed_at
          END,
          updated_at = NOW()
        WHERE access_token = ${trimmedToken}
      `
    } else if (challengeComplete === true) {
      await sql`
        UPDATE freebie_subscribers
        SET
          guide_chapter_index = GREATEST(COALESCE(guide_chapter_index, 0), ${chapterIndex}),
          guide_challenge_day = GREATEST(COALESCE(guide_challenge_day, 0), ${challengeDayCount}),
          guide_challenge_completed_at = CASE
            WHEN guide_challenge_completed_at IS NULL THEN NOW()
            ELSE guide_challenge_completed_at
          END,
          updated_at = NOW()
        WHERE access_token = ${trimmedToken}
      `
    } else {
      await sql`
        UPDATE freebie_subscribers
        SET
          guide_chapter_index = GREATEST(COALESCE(guide_chapter_index, 0), ${chapterIndex}),
          guide_challenge_day = GREATEST(COALESCE(guide_challenge_day, 0), ${challengeDayCount}),
          updated_at = NOW()
        WHERE access_token = ${trimmedToken}
      `
    }

    // Fire-and-forget: send completion email only on first completion event
    if (completed === true && !wasAlreadyCompleted) {
      const email = subscriber.email as string
      // freebie_subscribers stores full name in `name` column; derive first name for email
      const fullName = typeof subscriber.name === "string" ? subscriber.name.trim() : undefined
      const firstName = fullName ? fullName.split(" ")[0] : undefined

      const emailContent = generateSelfieGuideCompleteEmail({
        firstName,
        recipientEmail: email,
      })

      sendEmail({
        to: email,
        subject: emailContent.subject,
        html: emailContent.html,
        text: emailContent.text,
        from: FROM_EMAIL,
        replyTo: REPLY_TO_EMAIL,
        emailType: "selfie-guide-complete",
      }).catch((err: unknown) => {
        console.error("[selfie-guide/progress] completion email failed:", err)
      })
    }

    if (challengeComplete === true && !wasChallengeAlreadyCompleted) {
      const email = typeof subscriber.email === "string" ? subscriber.email : ""
      if (email) {
        const alreadySentDay14Rows = await sql`
          SELECT 1
          FROM email_logs
          WHERE LOWER(user_email) = LOWER(${email})
            AND email_type = 'selfie-guide-day14-maya-bridge'
            AND status IN ('sent', 'delivered')
          LIMIT 1
        `

        if (alreadySentDay14Rows.length === 0) {
          const accessUrl = `https://sselfie.ai/selfie-guide/access/${trimmedToken}`
          const firstName = getFirstNameForEmail({
            fullName: typeof subscriber.name === "string" ? subscriber.name : undefined,
            email,
          })
          const day14Email = generateSelfieGuideDay14MayaBridgeEmail({
            firstName,
            recipientEmail: email,
            accessUrl,
          })

          sendEmail({
            to: email,
            subject: day14Email.subject,
            html: day14Email.html,
            text: day14Email.text,
            from: FROM_EMAIL,
            replyTo: REPLY_TO_EMAIL,
            emailType: "selfie-guide-day14-maya-bridge",
          }).catch((err: unknown) => {
            console.error("[selfie-guide/progress] challenge completion day14 email failed:", err)
          })
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error("[selfie-guide/progress] error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
