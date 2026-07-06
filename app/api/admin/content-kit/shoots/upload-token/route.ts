import { type NextRequest, NextResponse } from "next/server"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"
import { createServerClient } from "@/lib/supabase/server"

// Admin-gated client upload token route for Shoot Studio inspiration images.
// The file bytes go browser -> Vercel Blob, not browser -> Next route -> Blob,
// so phone/Pinterest images do not trip Vercel's function request body limit.

export const dynamic = "force-dynamic"
export const maxDuration = 60

const ADMIN_EMAIL = "ssa@ssasocial.com"
const MAX_BYTES = 20 * 1024 * 1024

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

function isSafeInspirationPath(pathname: string) {
  return (
    pathname.startsWith("content-kit/inspiration/") &&
    !pathname.includes("..") &&
    /\.(jpe?g|png|webp|heic|heif)$/i.test(pathname)
  )
}

function getRequestedPathname(body: HandleUploadBody): string | null {
  if (body.type !== "blob.generate-client-token") return null
  const pathname = body.payload?.pathname
  return typeof pathname === "string" ? pathname : null
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: HandleUploadBody
  try {
    body = (await request.json()) as HandleUploadBody
  } catch {
    return NextResponse.json({ error: "Invalid upload token request" }, { status: 400 })
  }

  const requestedPathname = getRequestedPathname(body)
  if (requestedPathname) {
    if (!(await requireAdmin(request))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!isSafeInspirationPath(requestedPathname)) {
      return NextResponse.json({ error: "Invalid inspiration upload path" }, { status: 400 })
    }
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async (pathname) => {
        if (!isSafeInspirationPath(pathname)) {
          throw new Error("Invalid inspiration upload path")
        }
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
          maximumSizeInBytes: MAX_BYTES,
          addRandomSuffix: false,
          tokenPayload: JSON.stringify({
            kind: "shoot-inspiration",
            uploadedAt: new Date().toISOString(),
          }),
        }
      },
      onUploadCompleted: async ({ blob }) => {
        console.log("[shoot-studio] inspiration upload completed:", blob.url)
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error: unknown) {
    console.error("[shoot-studio] upload token failed:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to prepare upload" },
      { status: 500 },
    )
  }
}
