import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"
import crypto from "crypto"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

/**
 * Email Preview API
 * 
 * Generates HTML/text previews and checks spam score
 */
export async function POST(request: Request) {
  try {
    // Verify admin access
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

    const { campaignId, html, text, subject } = await request.json()

    if (!html && !text) {
      return NextResponse.json({ error: "HTML or text content required" }, { status: 400 })
    }

    // Generate content hash for caching
    const contentHash = crypto
      .createHash("md5")
      .update(`${html || ""}${text || ""}${subject || ""}`)
      .digest("hex")

    // Check if preview already exists
    const existing = await sql`
      SELECT * FROM email_previews
      WHERE content_hash = ${contentHash}
      ORDER BY created_at DESC
      LIMIT 1
    `

    if (existing && existing.length > 0) {
      return NextResponse.json({
        preview: existing[0],
        cached: true,
      })
    }

    // Basic spam score calculation (can be enhanced with external service)
    const spamIssues: string[] = []
    let spamScore = 0

    // Check for common spam triggers
    if (html) {
      const htmlLower = html.toLowerCase()

      // Excessive capitalization
      const capsRatio = (html.match(/[A-Z]/g) || []).length / html.length
      if (capsRatio > 0.3) {
        spamScore += 20
        spamIssues.push("Excessive capitalization")
      }

      // Too many links
      const linkCount = (html.match(/<a\s+href/gi) || []).length
      if (linkCount > 10) {
        spamScore += 15
        spamIssues.push("Too many links")
      }

      // Spam keywords
      const spamKeywords = ["free", "click here", "limited time", "act now", "urgent", "guaranteed"]
      const foundKeywords = spamKeywords.filter((keyword) => htmlLower.includes(keyword))
      if (foundKeywords.length > 3) {
        spamScore += 10
        spamIssues.push(`Multiple spam keywords: ${foundKeywords.join(", ")}`)
      }

      // Missing alt text on images
      const imagesWithoutAlt = (html.match(/<img[^>]*(?!alt=)[^>]*>/gi) || []).length
      if (imagesWithoutAlt > 0) {
        spamScore += 5
        spamIssues.push("Images missing alt text")
      }

      // No plain text version
      if (!text || text.trim().length < 50) {
        spamScore += 10
        spamIssues.push("Missing or short plain text version")
      }
    }

    // Subject line checks
    if (subject) {
      const subjectLower = subject.toLowerCase()
      if (subjectLower.includes("!!!") || (subject.match(/!/g) || []).length > 2) {
        spamScore += 10
        spamIssues.push("Excessive exclamation marks in subject")
      }

      if (subject.length > 50) {
        spamScore += 5
        spamIssues.push("Subject line too long")
      }
    }

    // Rendering issues
    const renderingIssues: string[] = []
    if (html) {
      // Check for unclosed tags (basic check)
      const openTags = (html.match(/<[^/][^>]*>/g) || []).length
      const closeTags = (html.match(/<\/[^>]+>/g) || []).length
      if (Math.abs(openTags - closeTags) > 5) {
        renderingIssues.push("Potential unclosed HTML tags")
      }

      // Check for inline styles (can cause rendering issues)
      const inlineStyles = (html.match(/style=["'][^"']*["']/gi) || []).length
      if (inlineStyles > 20) {
        renderingIssues.push("Many inline styles (may not render in all clients)")
      }
    }

    // Save preview
    const preview = await sql`
      INSERT INTO email_previews (
        campaign_id,
        preview_type,
        content_hash,
        html_preview,
        text_preview,
        spam_score,
        spam_issues,
        rendering_issues
      )
      VALUES (
        ${campaignId || null},
        'html',
        ${contentHash},
        ${html || null},
        ${text || null},
        ${Math.min(spamScore, 100)},
        ${spamIssues.length > 0 ? spamIssues : null},
        ${renderingIssues.length > 0 ? renderingIssues : null}
      )
      RETURNING *
    `

    return NextResponse.json({
      preview: preview[0],
      cached: false,
      spamScore: Math.min(spamScore, 100),
      spamIssues,
      renderingIssues,
      recommendations: generateRecommendations(spamScore, spamIssues, renderingIssues),
    })
  } catch (error: any) {
    console.error("[v0] Error generating email preview:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

function generateRecommendations(
  spamScore: number,
  spamIssues: string[],
  renderingIssues: string[],
): string[] {
  const recommendations: string[] = []

  if (spamScore > 50) {
    recommendations.push("⚠️ High spam score - consider revising content")
  } else if (spamScore > 30) {
    recommendations.push("⚠️ Moderate spam score - review flagged issues")
  } else {
    recommendations.push("✅ Low spam score - looks good!")
  }

  if (spamIssues.length > 0) {
    recommendations.push(`Fix ${spamIssues.length} spam issue(s)`)
  }

  if (renderingIssues.length > 0) {
    recommendations.push(`Fix ${renderingIssues.length} rendering issue(s)`)
  }

  return recommendations
}
