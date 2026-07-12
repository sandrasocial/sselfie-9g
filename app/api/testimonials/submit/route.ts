import { NextRequest, NextResponse } from "next/server"

import { logAnalyticsEvent } from "@/lib/analytics/events"
import { sql } from "@/lib/db/client"
import { COLORS as DESIGN_COLORS } from "@/lib/design-tokens"
import { sendEmail } from "@/lib/email/send-email"
import { escapeHtml } from "@/lib/email/templates/stone-email"
import { checkRateLimit } from "@/lib/rate-limit-api"
import { createServerClient } from "@/lib/supabase/server"
import {
  isValidReviewRating,
  isValidReviewText,
  normalizeReviewText,
  SUITE_REVIEW_MAX_TEXT_LENGTH,
  SUITE_REVIEW_MIN_DOWNLOADS,
  SUITE_REVIEW_MIN_TEXT_LENGTH,
  SUITE_REVIEW_PLATFORM,
  SUITE_REVIEW_PRODUCT,
} from "@/lib/testimonials/review-contract"
import { getUserByAuthId, type NeonUser } from "@/lib/user-mapping"
import type { User } from "@supabase/supabase-js"

function cleanName(value: unknown): string | null {
  if (typeof value !== "string") return null
  const normalized = value.trim().replace(/[\r\n\t]+/g, " ").replace(/\s+/g, " ")
  return normalized ? normalized.slice(0, 120) : null
}

function customerName(neonUser: NeonUser, authUser: User): string {
  const joinedName = [neonUser.first_name, neonUser.last_name].filter(Boolean).join(" ")
  return (
    cleanName(neonUser.display_name) ||
    cleanName(neonUser.name) ||
    cleanName(joinedName) ||
    cleanName(authUser?.user_metadata?.name) ||
    cleanName(authUser?.user_metadata?.first_name) ||
    "SSELFIE customer"
  )
}

async function authenticatedCustomer() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const neonUser = await getUserByAuthId(user.id)
  if (!neonUser?.id || !neonUser.email) return null

  return { authUser: user, neonUser }
}

async function existingSuiteReview(userId: string, email: string) {
  return sql`
    SELECT id
    FROM admin_testimonials
    WHERE (
      key_benefits->>'source_user_id' = ${userId}
      OR LOWER(customer_email) = LOWER(${email})
    )
      AND platform = ${SUITE_REVIEW_PLATFORM}
      AND product_mentioned = ${SUITE_REVIEW_PRODUCT}
    ORDER BY created_at DESC
    LIMIT 1
  `
}

async function suiteDownloadCount(userId: string): Promise<number> {
  const rows = await sql`
    SELECT COUNT(*)::int AS download_count
    FROM analytics_events
    WHERE user_id = ${userId}
      AND event_name = 'suite_image_downloaded'
  `
  return Math.max(0, Number(rows[0]?.download_count || 0))
}

export async function POST(request: NextRequest) {
  try {
    const currentUser = await authenticatedCustomer()
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const testimonial = normalizeReviewText(body?.testimonial)
    const rating = body?.rating
    const consent = body?.consent === true

    if (!consent) {
      return NextResponse.json({ error: "Consent is required" }, { status: 400 })
    }
    if (!isValidReviewRating(rating)) {
      return NextResponse.json({ error: "Rating must be between 1 and 5" }, { status: 400 })
    }
    if (!isValidReviewText(testimonial)) {
      return NextResponse.json(
        {
          error: `Testimonial must be between ${SUITE_REVIEW_MIN_TEXT_LENGTH} and ${SUITE_REVIEW_MAX_TEXT_LENGTH} characters`,
        },
        { status: 400 },
      )
    }

    const userId = String(currentUser.neonUser.id)
    const email = currentUser.neonUser.email.trim().toLowerCase()
    const name = customerName(currentUser.neonUser, currentUser.authUser)

    const rate = await checkRateLimit(userId, "REVIEW_SUBMISSION")
    if (!rate.success) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 })
    }

    const prior = await existingSuiteReview(userId, email)
    if (prior.length > 0) {
      return NextResponse.json({
        success: true,
        alreadySubmitted: true,
        testimonialId: prior[0].id,
      })
    }

    const downloadCount = await suiteDownloadCount(userId)
    if (downloadCount < SUITE_REVIEW_MIN_DOWNLOADS) {
      return NextResponse.json({ error: "Review is not available yet" }, { status: 403 })
    }

    const reviewContext = JSON.stringify({
      consent_to_publish: true,
      source_user_id: userId,
      submitted_from: "suite_post_success",
    })
    const inserted = await sql`
      INSERT INTO admin_testimonials (
        customer_name,
        customer_email,
        testimonial_text,
        testimonial_type,
        platform,
        rating,
        product_mentioned,
        key_benefits,
        emotional_tone,
        is_featured,
        is_published,
        collected_at,
        created_at,
        updated_at
      ) VALUES (
        ${name},
        ${email},
        ${testimonial},
        'review',
        ${SUITE_REVIEW_PLATFORM},
        ${rating},
        ${SUITE_REVIEW_PRODUCT},
        ${reviewContext}::jsonb,
        NULL,
        false,
        false,
        NOW(),
        NOW(),
        NOW()
      )
      ON CONFLICT DO NOTHING
      RETURNING id
    `

    if (inserted.length === 0) {
      const duplicate = await existingSuiteReview(userId, email)
      if (duplicate.length > 0) {
        return NextResponse.json({
          success: true,
          alreadySubmitted: true,
          testimonialId: duplicate[0].id,
        })
      }
      return NextResponse.json({ error: "Could not save testimonial" }, { status: 409 })
    }

    const testimonialId = inserted[0].id

    await logAnalyticsEvent({
      eventName: "suite_review_submitted",
      userId,
      path: "/app",
      properties: { rating, testimonial_id: testimonialId },
    })

    try {
      const adminUrl = `${process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"}/admin/testimonials`
      await sendEmail({
        to: process.env.ADMIN_EMAIL || "hello@sselfie.ai",
        subject: `New SSELFIE SUITE review from ${name}`,
        html: `
          <div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:${DESIGN_COLORS.obsidian};">
            <h1 style="font-family:Georgia,'Times New Roman',serif;font-size:30px;font-weight:400;">New SSELFIE SUITE review</h1>
            <p><strong>${escapeHtml(name)}</strong> · ${escapeHtml(email)}</p>
            <p><strong>Rating:</strong> ${rating}/5</p>
            <p style="white-space:pre-wrap;line-height:1.7;">${escapeHtml(testimonial)}</p>
            <p><a href="${escapeHtml(adminUrl)}">Review in admin</a></p>
          </div>
        `,
        text: `New SSELFIE SUITE review\n\n${name} · ${email}\nRating: ${rating}/5\n\n${testimonial}\n\nReview: ${adminUrl}`,
        emailType: "suite-review-submission",
      })
    } catch (emailError) {
      console.error("[suite-review] admin notification failed:", emailError)
    }

    return NextResponse.json({
      success: true,
      alreadySubmitted: false,
      testimonialId,
    })
  } catch (error) {
    console.error("[suite-review] submission failed:", error)
    return NextResponse.json({ error: "Failed to submit testimonial" }, { status: 500 })
  }
}
