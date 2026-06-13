import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"
const MAX_BYTES = 8 * 1024 * 1024

async function requireAdmin(request?: NextRequest) {
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    const form = await request.formData()
    const files = form.getAll("files").filter((file): file is File => file instanceof File)
    const kind = String(form.get("kind") || "overlay").replace(/[^a-z0-9-]/gi, "").toLowerCase()
    if (files.length === 0) {
      return NextResponse.json({ error: "No files attached" }, { status: 400 })
    }

    const assets = []
    for (const file of files.slice(0, 8)) {
      if (!file.type.startsWith("image/")) {
        return NextResponse.json({ error: `${file.name} is not an image` }, { status: 400 })
      }
      if (file.size > MAX_BYTES) {
        return NextResponse.json({ error: `${file.name} is over 8MB` }, { status: 400 })
      }
      const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg"
      const blob = await put(
        `content-kit/${kind || "overlay"}/${Date.now()}-${Math.floor(Math.random() * 1e6)}.${ext}`,
        Buffer.from(await file.arrayBuffer()),
        { access: "public", contentType: file.type },
      )
      assets.push({ url: blob.url, label: file.name })
    }

    return NextResponse.json({ success: true, assets })
  } catch (error: any) {
    console.error("[content-kit asset upload] failed:", error)
    return NextResponse.json({ success: false, error: error?.message || "Upload failed" }, { status: 500 })
  }
}
