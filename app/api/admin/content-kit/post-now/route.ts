// POST-NOW-01: on-demand "I need something to post now" endpoint.
// POST  -> generate + store three ready-tonight options (repurpose, trend-test, story-sequence)
// PATCH -> mark one option used / dismissed so it never comes back
import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { runPostNow, setSuggestionStatus } from "@/lib/admin/post-now"

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"
const DEFAULT_ROUTE_TIMEOUT_MS = 50_000

class PostNowTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`The post-now generator took too long after ${Math.ceil(timeoutMs / 1000)} seconds.`)
    this.name = "PostNowTimeoutError"
  }
}

function routeTimeoutMs() {
  const raw = Number(process.env.POST_NOW_ROUTE_TIMEOUT_MS)
  if (Number.isFinite(raw) && raw > 0) return raw
  return DEFAULT_ROUTE_TIMEOUT_MS
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback
}

async function withRouteTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new PostNowTimeoutError(timeoutMs)), timeoutMs)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}

async function requireAdmin(request?: NextRequest) {
  // CRON_SECRET bearer lets server-side automation use this too (same
  // convention as the other admin content-kit routes).
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
    const result = await withRouteTimeout(runPostNow(), routeTimeoutMs())
    return NextResponse.json({
      success: true,
      options: result.options,
      missingInputs: result.missingInputs,
    })
  } catch (error: unknown) {
    console.error("[post-now] generation failed:", error)
    if (error instanceof PostNowTimeoutError) {
      return NextResponse.json(
        {
          success: false,
          error:
            "This took too long to finish in the browser. Try again in a minute, or use the latest weekly brief while I check the generator.",
        },
        { status: 504 },
      )
    }
    return NextResponse.json(
      { success: false, error: errorMessage(error, "Generation failed") },
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
  if (!id || !["used", "dismissed"].includes(status)) {
    return NextResponse.json(
      { error: "id and status (used|dismissed) required" },
      { status: 400 },
    )
  }
  try {
    const updated = await setSuggestionStatus(id, status)
    if (!updated) {
      return NextResponse.json({ error: "Suggestion not found" }, { status: 404 })
    }
    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("[post-now] status update failed:", error)
    return NextResponse.json(
      { success: false, error: errorMessage(error, "Update failed") },
      { status: 500 },
    )
  }
}
