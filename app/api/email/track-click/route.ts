import type { NextRequest } from "next/server"
import { neon } from "@neondatabase/serverless"
import { sanitizeRedirect } from "@/lib/security/url-validator"

const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const trackingId = searchParams.get("id")
  const clickType = searchParams.get("type")
  const redirect = searchParams.get("redirect")

  if (!trackingId || !clickType || !redirect) {
    return new Response("Missing parameters", { status: 400 })
  }

  const safeRedirect = sanitizeRedirect(redirect, "/checkout")

  try {
    // Log the click
    await sql`
      INSERT INTO email_campaign_clicks (tracking_id, click_type, clicked_at)
      VALUES (${trackingId}, ${clickType}, NOW())
    `

    // Update subscriber tag
    // NOTE: freebie_subscribers.id is SERIAL (INTEGER), not UUID
    await sql`
      UPDATE freebie_subscribers
      SET tags = COALESCE(tags, '[]'::jsonb) || jsonb_build_array(${`clicked_${clickType}`})
      WHERE id = ${parseInt(trackingId, 10)}
    `

    // Redirect to checkout
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    return Response.redirect(`${siteUrl}${safeRedirect}`, 302)
  } catch (error) {
    console.error("[v0] Error tracking click:", error)
    // Still redirect even if tracking fails
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://sselfie.ai"
    return Response.redirect(`${siteUrl}${safeRedirect}`, 302)
  }
}
