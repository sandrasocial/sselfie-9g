import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import {
  createShoot,
  extendShoot,
  listShoots,
  refineShoot,
  regenerateShot,
  setShootStatus,
  setShotStatus,
} from "@/lib/content-kit/shoot-generator"
import { publishShootToVault } from "@/lib/content-kit/shoot-publisher"
import { listAdminSelfies } from "@/lib/content-kit/demo-generator"

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
  const [shoots, selfies] = await Promise.all([listShoots(), listAdminSelfies()])
  return NextResponse.json({ shoots, selfies })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    const action = body.action

    if (action === "create") {
      const shoot = await createShoot({
        inspirationUrls: Array.isArray(body.inspirationUrls) ? body.inspirationUrls : [],
        selfieUrl: String(body.selfieUrl || ""),
        notes: typeof body.notes === "string" ? body.notes : undefined,
      })
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "refine") {
      const shoot = await refineShoot(Number(body.id), String(body.message || ""))
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "regenerate") {
      const quality = body.quality === "high" ? "high" : "medium"
      const shoot = await regenerateShot(Number(body.id), String(body.shotId || ""), quality)
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "extend") {
      const shoot = await extendShoot(Number(body.id), Number(body.count || 2))
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "publish") {
      const result = await publishShootToVault(Number(body.id))
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    console.error("[shoot-studio] action failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Something broke. Try again." },
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
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })

  if (typeof body.shotId === "string" && typeof body.shotStatus === "string") {
    await setShotStatus(id, body.shotId, body.shotStatus)
    return NextResponse.json({ success: true })
  }
  if (typeof body.status === "string") {
    await setShootStatus(id, body.status)
    return NextResponse.json({ success: true })
  }
  return NextResponse.json({ error: "Nothing to update" }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await sql`DELETE FROM content_shoots WHERE id = ${id}`
  return NextResponse.json({ success: true })
}
