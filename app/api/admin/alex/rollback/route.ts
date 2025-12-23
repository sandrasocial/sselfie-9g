import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { restoreFromBackup, getRecentBackups } from "@/lib/admin/alex-backup-manager"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

export async function POST(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const body = await req.json()
    const { changeId, filePath } = body

    if (!changeId && !filePath) {
      return NextResponse.json({ 
        error: "Either changeId or filePath is required" 
      }, { status: 400 })
    }

    try {
      const result = await restoreFromBackup(changeId || (await getRecentBackups(filePath, 1))[0]?.changeId || '')

      return NextResponse.json({
        success: true,
        message: result.message,
        ...result
      })
    } catch (error: any) {
      console.error("[Alex] Rollback error:", error)
      return NextResponse.json({
        success: false,
        error: "Failed to rollback",
        details: error.message
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error("[Alex] Rollback endpoint error:", error)
    return NextResponse.json(
      { error: "Failed to process rollback", details: error.message }, 
      { status: 500 }
    )
  }
}

export async function GET(req: Request) {
  try {
    const supabase = await createServerClient()
    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const filePath = searchParams.get('filePath')

    if (!filePath) {
      return NextResponse.json({ 
        error: "filePath query parameter is required" 
      }, { status: 400 })
    }

    const backups = await getRecentBackups(filePath, 10)

    return NextResponse.json({
      success: true,
      filePath: filePath,
      backups: backups.map(b => ({
        changeId: b.changeId,
        timestamp: b.timestamp,
        reason: b.reason,
        date: new Date(b.timestamp).toISOString()
      }))
    })
  } catch (error: any) {
    console.error("[Alex] Get backups error:", error)
    return NextResponse.json(
      { error: "Failed to get backups", details: error.message }, 
      { status: 500 }
    )
  }
}

