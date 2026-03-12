import { sql } from "@/lib/db/client"


// NOTE: This function intentionally returns true for any existing user.
// The v2 feed planner is now the ONLY supported version — several routes return 410
// if v2 is not enabled (e.g. /api/feed/create-manual). To fully adopt the column
// semantics, run a migration: UPDATE users SET use_feed_planner_v2 = true WHERE use_feed_planner_v2 IS NULL
// and then switch the return to: return row.use_feed_planner_v2 === true
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
