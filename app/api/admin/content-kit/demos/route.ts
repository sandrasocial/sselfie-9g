import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import {
  deleteDemoPair,
  generateDemoPair,
  listAdminSelfies,
  listDemoPairs,
} from "@/lib/content-kit/demo-generator"

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
  const [pairs, selfies] = await Promise.all([listDemoPairs(), listAdminSelfies()])
  return NextResponse.json({ pairs, selfies })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const body = await request.json().catch(() => ({}))
    if (typeof body.selfieUrl !== "string" || typeof body.prompt !== "string") {
      return NextResponse.json({ error: "selfieUrl and prompt are required" }, { status: 400 })
    }
    const pair = await generateDemoPair({
      selfieUrl: body.selfieUrl,
      prompt: body.prompt,
      title: typeof body.title === "string" ? body.title : undefined,
    })
    return NextResponse.json({ success: true, pair })
  } catch (error: any) {
    console.error("[content-kit demos] generation failed:", error)
    return NextResponse.json(
      { success: false, error: error?.message || "Generation failed" },
      { status: 500 },
    )
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const body = await request.json().catch(() => ({}))
  const id = Number(body.id)
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 })
  await deleteDemoPair(id)
  return NextResponse.json({ success: true })
}
