import { get } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

import { decryptFounderScreenshot } from "@/lib/app-v3/maya/founder-screenshot"
import { sql } from "@/lib/db/client"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  try {
    if (!(await requireAdmin())) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const feedbackId = request.nextUrl.searchParams.get("id")?.trim()
    if (!feedbackId) {
      return NextResponse.json({ error: "Feedback id required" }, { status: 400 })
    }

    const rows = await sql`
      SELECT
        images[1] AS pathname,
        founder_screenshot_key,
        founder_screenshot_iv,
        founder_screenshot_auth_tag,
        founder_screenshot_content_type
      FROM feedback
      WHERE id = ${feedbackId}
        AND founder_test_status IS NOT NULL
      LIMIT 1
    `
    const row = rows[0]
    const pathname = typeof row?.pathname === "string" ? row.pathname : ""
    if (
      !pathname.startsWith("founder-feedback/") ||
      pathname.includes("..") ||
      typeof row?.founder_screenshot_key !== "string" ||
      typeof row?.founder_screenshot_iv !== "string" ||
      typeof row?.founder_screenshot_auth_tag !== "string"
    ) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }

    const attachment = await get(pathname, { access: "public", useCache: false })
    if (!attachment || attachment.statusCode !== 200 || !attachment.stream) {
      return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
    }
    const encrypted = new Uint8Array(await new Response(attachment.stream).arrayBuffer())
    const decrypted = decryptFounderScreenshot(encrypted, {
      key: row.founder_screenshot_key,
      iv: row.founder_screenshot_iv,
      authTag: row.founder_screenshot_auth_tag,
    })

    return new Response(decrypted, {
      status: 200,
      headers: {
        "Content-Type": row.founder_screenshot_content_type || "application/octet-stream",
        "Content-Disposition": "inline",
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    console.error("[customer-support] Founder feedback attachment failed:", error)
    return NextResponse.json({ error: "Attachment unavailable" }, { status: 500 })
  }
}
