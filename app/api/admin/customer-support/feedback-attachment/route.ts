import { get } from "@vercel/blob"
import { type NextRequest, NextResponse } from "next/server"

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
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const feedbackId = request.nextUrl.searchParams.get("id")?.trim()
  if (!feedbackId) {
    return NextResponse.json({ error: "Feedback id required" }, { status: 400 })
  }

  const rows = await sql`
    SELECT images[1] AS pathname
    FROM feedback
    WHERE id = ${feedbackId}
      AND founder_test_status IS NOT NULL
    LIMIT 1
  `
  const pathname = typeof rows[0]?.pathname === "string" ? rows[0].pathname : ""
  if (!pathname.startsWith("founder-feedback/") || pathname.includes("..")) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  const attachment = await get(pathname, { access: "private", useCache: false })
  if (!attachment || attachment.statusCode !== 200 || !attachment.stream) {
    return NextResponse.json({ error: "Attachment not found" }, { status: 404 })
  }

  return new Response(attachment.stream, {
    status: 200,
    headers: {
      "Content-Type": attachment.blob.contentType || "application/octet-stream",
      "Content-Disposition": "inline",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  })
}
