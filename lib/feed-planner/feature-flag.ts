import { sql } from "@/lib/db/client"


export async function getFeedPlannerV2Flag(userId: number | string): Promise<boolean> {
  const [row] = await sql`
    SELECT use_feed_planner_v2
    FROM users
    WHERE id = ${Number(userId)}
    LIMIT 1
  `

  if (!row) return false
  return true
}
