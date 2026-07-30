import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { sql } from "@/lib/db/client"
import {
  createShootDraft,
  extendShoot,
  getShoot,
  InspirationModerationError,
  listShoots,
  refineShoot,
  regenerateShot,
  ShootRenderError,
  setShootStatus,
  setShotStatus,
} from "@/lib/content-kit/shoot-generator"
import { publishShootToVault } from "@/lib/content-kit/shoot-publisher"
import {
  areAdminIdentityReferences,
  listAdminSelfies,
} from "@/lib/content-kit/demo-generator"
import { addAdminMemoryNote } from "@/lib/app-v3/maya/admin-memory-store"

export const dynamic = "force-dynamic"
export const maxDuration = 300

const ADMIN_EMAIL = "ssa@ssasocial.com"

async function rememberShootDecision(input: {
  kind: "approval" | "rejection" | "workflow"
  note: string
  sourceId: string | number
  sourceTitle?: string | null
  metadata?: Record<string, unknown>
}) {
  try {
    await addAdminMemoryNote({
      adminUserId: ADMIN_EMAIL,
      kind: input.kind,
      note: input.note,
      sourceType: "shot",
      sourceId: input.sourceId,
      sourceTitle: input.sourceTitle ?? null,
      metadata: input.metadata,
    })
  } catch (error) {
    console.error("[shoot-studio] admin memory note skipped:", error)
  }
}

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
      const selfieUrls = Array.isArray(body.selfieUrls)
        ? body.selfieUrls.map((u: unknown) => String(u || "")).filter(Boolean)
        : body.selfieUrl
          ? [String(body.selfieUrl)]
          : []
      if (!(await areAdminIdentityReferences(selfieUrls))) {
        return NextResponse.json(
          { error: "Choose only Sandra's verified admin selfies" },
          { status: 400 },
        )
      }
      // Plan + save the shoot only. Images are rendered by the CLIENT, one regenerate call per
      // shot: a 6-9 shot batch outruns maxDuration in ANY single invocation (sync or after()),
      // and the batch renderers only persist at the end, so a kill lost every image. Per-shot
      // requests each fit the limit easily and persist atomically as they finish.
      const shoot = await createShootDraft({
        inspirationUrls: Array.isArray(body.inspirationUrls) ? body.inspirationUrls : [],
        selfieUrls,
        notes: typeof body.notes === "string" ? body.notes : undefined,
        collectionType: body.collectionType === "story" ? "story" : "cohesive",
        vibe: typeof body.vibe === "string" ? body.vibe : undefined,
      })
      return NextResponse.json({ success: true, shoot, rendering: true })
    }

    if (action === "refine") {
      const shoot = await refineShoot(Number(body.id), String(body.message || ""))
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "regenerate") {
      const quality = body.quality === "medium" ? "medium" : "high"
      const shoot = await regenerateShot(Number(body.id), String(body.shotId || ""), quality)
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "extend") {
      const shoot = await extendShoot(Number(body.id), Number(body.count || 2))
      return NextResponse.json({ success: true, shoot })
    }

    if (action === "publish") {
      const result = await publishShootToVault(Number(body.id))
      await addAdminMemoryNote({
        adminUserId: ADMIN_EMAIL,
        kind: "workflow",
        note: `Published "${result.shoot.title}" to the Vault after the shoot reached Sandra's approved-shot threshold.`,
        sourceType: "shoot",
        sourceId: result.shoot.id,
        sourceTitle: result.shoot.title,
        metadata: { vaultSlug: result.collection.slug },
      }).catch((error) => console.error("[shoot-studio] publish memory skipped:", error))
      return NextResponse.json({ success: true, ...result })
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  } catch (error: any) {
    if (error instanceof ShootRenderError) {
      return NextResponse.json(
        {
          success: false,
          error: error.message,
          code: error.code,
          retryable: error.retryable,
          shoot: error.shoot,
        },
        { status: error.status },
      )
    }
    if (error instanceof InspirationModerationError) {
      return NextResponse.json(
        { success: false, error: error.message, code: error.code, retryable: false },
        { status: error.status },
      )
    }
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
    const before = await getShoot(id)
    const shot = before?.shots.find((candidate) => candidate.id === body.shotId)
    await setShotStatus(id, body.shotId, body.shotStatus)
    if (body.shotStatus === "approved" || body.shotStatus === "killed") {
      await rememberShootDecision({
        kind: body.shotStatus === "approved" ? "approval" : "rejection",
        note:
          body.shotStatus === "approved"
            ? `Approved "${shot?.title || body.shotId}" from "${before?.title || `shoot ${id}`}" as on-brand enough to keep.`
            : `Rejected "${shot?.title || body.shotId}" from "${before?.title || `shoot ${id}`}" so future drafts should avoid that direction.`,
        sourceId: `${id}:${body.shotId}`,
        sourceTitle: before?.title ?? null,
        metadata: {
          shootId: id,
          shotId: body.shotId,
          shotTitle: shot?.title ?? null,
          action: body.shotStatus,
        },
      })
    }
    return NextResponse.json({ success: true })
  }
  if (typeof body.status === "string") {
    const before = await getShoot(id)
    await setShootStatus(id, body.status)
    if (body.status === "approved") {
      await addAdminMemoryNote({
        adminUserId: ADMIN_EMAIL,
        kind: "approval",
        note: `Approved the full shoot "${before?.title || `shoot ${id}`}" as a collection direction worth using across the Vault, freebie, and emails.`,
        sourceType: "shoot",
        sourceId: id,
        sourceTitle: before?.title ?? null,
      }).catch((error) => console.error("[shoot-studio] shoot approval memory skipped:", error))
    }
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
