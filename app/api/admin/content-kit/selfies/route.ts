import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"

// SHOOT-STUDIO: Sandra uploads her own reference selfies (front, side profiles, full body)
// for the admin Shoot Studio. Stored in user_avatar_images (active), which listAdminSelfies
// reads. Multiple stay active on purpose so she can use several angles per shoot.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"
const MAX_BYTES = 12 * 1024 * 1024

async function requireAdmin(request?: NextRequest) {
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

async function adminUserId(): Promise<string | null> {
  const rows = (await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1`) as Array<{ id: string }>
  return rows[0]?.id ? String(rows[0].id) : null
}

// image_type must be in the table CHECK constraint (migration 59):
// selfie / lifestyle / mirror / casual / professional / side-profile / full-body / inspiration.
const ALLOWED_TYPES = new Set(["selfie", "side-profile", "full-body"])

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const form = await request.formData()
    const files = form.getAll("files").filter((f): f is File => f instanceof File)
    if (files.length === 0) {
      return NextResponse.json({ error: "No files attached" }, { status: 400 })
    }
    const requested = String(form.get("imageType") || "selfie")
    const imageType = ALLOWED_TYPES.has(requested) ? requested : "selfie"

    const userId = await adminUserId()
    const urls: string[] = []
    for (const file of files.slice(0, 6)) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `${file.name} is over 12MB` }, { status: 400 })
      }
      const ext = file.type.includes("png") ? "png" : "jpg"
      const blob = await put(
        `content-kit/selfies/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        { access: "public", contentType: file.type },
      )
      urls.push(blob.url)
      if (userId) {
        // Non-destructive: keep other selfies active so Sandra can use several angles.
        await sql`
          INSERT INTO user_avatar_images (user_id, image_url, image_type, is_active, uploaded_at)
          VALUES (${userId}, ${blob.url}, ${imageType}, ${true}, NOW())
        `
      }
    }
    // Return the refreshed pool so the UI matches the DB exactly.
    const selfies = await listAdminSelfies().catch(() => urls)
    return NextResponse.json({ success: true, urls, selfies })
  } catch (error: any) {
    console.error("[shoot-studio] selfie upload failed:", error)
    return NextResponse.json({ success: false, error: error?.message || "Upload failed" }, { status: 500 })
  }
}

// Remove a selfie from the pool (deactivate, never hard-delete).
export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const url = typeof body.url === "string" ? body.url : ""
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 })
  const userId = await adminUserId()
  if (userId) {
    await sql`
      UPDATE user_avatar_images SET is_active = false
      WHERE user_id = ${userId} AND image_url = ${url}
    `
  }
  const selfies = await listAdminSelfies().catch(() => [])
  return NextResponse.json({ success: true, selfies })
}
