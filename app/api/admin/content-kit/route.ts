import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  generateCarousels,
  listCarousels,
  setCarouselStatus,
  updateCarouselSlides,
} from "@/lib/content-kit/carousel-generator"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin(request?: NextRequest) {
  // CRON_SECRET bearer lets server-side automation (weekly kit cron) use this too.
  const bearer = request?.headers.get("authorization")
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret && bearer === `Bearer ${cronSecret}`) return true
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.email === ADMIN_EMAIL
}

export async function GET(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const carousels = await listCarousels()
  return NextResponse.json({ carousels })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const imageUrls = Array.isArray(body.imageUrls)
      ? body.imageUrls.filter((url: unknown): url is string => typeof url === "string")
      : []
    const overlayUrls = Array.isArray(body.overlayUrls)
      ? body.overlayUrls.filter((url: unknown): url is string => typeof url === "string")
      : []
    const mode = body.mode === "tutorial" ? "tutorial" : "standard"
    const reelReferenceIds = Array.isArray(body.reelReferenceIds)
      ? body.reelReferenceIds
          .map((id: unknown) => Number(id))
          .filter((id: number) => Number.isFinite(id))
      : undefined
    const keyword = ["KIT", "PROMPT", "PRESET", "SELFIE"].includes(String(body.keyword))
      ? (String(body.keyword) as "KIT" | "PROMPT" | "PRESET" | "SELFIE")
      : undefined
    const hasVisualSource =
      mode === "tutorial" || Boolean(body.sourceShootId) || imageUrls.length > 0
    const carousels = await generateCarousels({
      count: typeof body.count === "number" ? body.count : hasVisualSource ? 1 : 2,
      mode,
      renderStyle: body.renderStyle === "editable" ? "editable" : "baked",
      topic: typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined,
      imageUrls,
      overlayUrls,
      reelReferenceIds,
      keyword,
      sourceShootId: Number.isFinite(Number(body.sourceShootId))
        ? Number(body.sourceShootId)
        : undefined,
    })
    return NextResponse.json({ success: true, carousels })
  } catch (error: any) {
    console.error("[content-kit] generation failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Generation failed" },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const id = Number(body.id)
    if (!id || !Array.isArray(body.slides)) {
      return NextResponse.json({ error: "id and slides[] required" }, { status: 400 })
    }
    const deck = await updateCarouselSlides(id, body.slides)
    if (!deck) return NextResponse.json({ error: "Carousel not found" }, { status: 404 })
    return NextResponse.json({ success: true, deck })
  } catch (error: any) {
    console.error("[content-kit] slide update failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Update failed" },
      { status: 500 }
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
    return NextResponse.json(
      { error: "id and status (draft|approved|posted) required" },
      { status: 400 }
    )
  }
  await setCarouselStatus(id, status)
  return NextResponse.json({ success: true })
}
