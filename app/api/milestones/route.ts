import { NextResponse, type NextRequest } from "next/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db/client"
import { withAuth } from "@/lib/auth/with-auth"

async function handleMilestone({
  request,
  user: neonUser,
}: {
  request: NextRequest | Request
  user: NonNullable<Awaited<ReturnType<typeof getUserByAuthId>>>
}) {
  try {
    const body = await request.json().catch(() => ({}))
    const milestoneType = body.milestoneType || "first_image_generated"
    const milestoneTitle = body.title || "First brand photo"
    const milestoneDescription = body.description || "Generated your first brand photo"

    const sql = getDb()

    const existing = await sql`
      SELECT id
      FROM user_milestones
      WHERE user_id = ${neonUser.id}::text
        AND milestone_type = ${milestoneType}
      LIMIT 1
    `

    if (!existing || existing.length === 0) {
      await sql`
        INSERT INTO user_milestones (
          user_id,
          milestone_type,
          milestone_title,
          milestone_description,
          achieved_at
        ) VALUES (
          ${neonUser.id}::text,
          ${milestoneType},
          ${milestoneTitle},
          ${milestoneDescription},
          NOW()
        )
      `
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[Milestones] Error:", error)
    return NextResponse.json({ error: "Failed to record milestone" }, { status: 500 })
  }
}

export const POST = withAuth(handleMilestone, {
  resolveUser: getUserByAuthId,
})
