import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  deleteStorySequence,
  generateStorySequence,
  listStorySequences,
  setStoryStatus,
} from "@/lib/content-kit/story-generator"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(request?: NextRequest) {
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const sequences = await listStorySequences()
  return NextResponse.json({ sequences })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.topic !== "string" || !body.topic.trim()) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 })
    }
    const sequence = await generateStorySequence({
      topic: body.topic,
      imageUrls: Array.isArray(body.imageUrls)
        ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string")
        : [],
    })
    return NextResponse.json({ success: true, sequence })
  } catch (error: any) {
    console.error("[content-kit stories] generation failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Generation failed" },
      { status: 500 },
    )
  }
}

export async function PATCH(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  const status = body.status
  if (!id || !["draft", "approved", "posted"].includes(status)) {
    return NextResponse.json({ error: "id and status (draft|approved|posted) required" }, { status: 400 })
  }
  await setStoryStatus(id, status)
  return NextResponse.json({ success: true })
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await deleteStorySequence(id)
  return NextResponse.json({ success: true })
}
