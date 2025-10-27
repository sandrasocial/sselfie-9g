import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface PhotoSession {
  id: number
  user_id: string
  session_name: string
  description: string | null
  status: "active" | "completed" | "paused"
  progress: number
  total_shots: number
  completed_shots: number
  category: string | null
  created_at: string
  updated_at: string
  completed_at: string | null
}

export interface SessionShot {
  id: number
  session_id: number
  shot_name: string
  shot_type: string | null
  status: "pending" | "completed" | "skipped"
  image_id: number | null
  order_index: number
  completed_at: string | null
  created_at: string
}

export interface SessionWithShots extends PhotoSession {
  shots: SessionShot[]
}

/**
 * Get user's active session (most recent active session)
 */
export async function getUserActiveSession(userId: string): Promise<SessionWithShots | null> {
  try {
    // Get the most recent active session
    const sessions = await sql`
      SELECT * FROM photo_sessions
      WHERE user_id = ${userId} AND status = 'active'
      ORDER BY updated_at DESC
      LIMIT 1
    `

    if (sessions.length === 0) {
      return null
    }

    const session = sessions[0] as PhotoSession

    // Get shots for this session
    const shots = await sql`
      SELECT * FROM session_shots
      WHERE session_id = ${session.id}
      ORDER BY order_index ASC
    `

    return {
      ...session,
      shots: shots as SessionShot[],
    }
  } catch (error) {
    console.error("[v0] Error fetching active session:", error)
    return null
  }
}

/**
 * Get all user's sessions
 */
export async function getUserSessions(userId: string): Promise<PhotoSession[]> {
  try {
    const sessions = await sql`
      SELECT * FROM photo_sessions
      WHERE user_id = ${userId}
      ORDER BY updated_at DESC
    `

    return sessions as PhotoSession[]
  } catch (error) {
    console.error("[v0] Error fetching user sessions:", error)
    return []
  }
}

/**
 * Create a new photo session
 */
export async function createPhotoSession(
  userId: string,
  sessionName: string,
  category: string,
  shots: string[],
): Promise<PhotoSession | null> {
  try {
    // Create the session
    const sessions = await sql`
      INSERT INTO photo_sessions (user_id, session_name, category, total_shots)
      VALUES (${userId}, ${sessionName}, ${category}, ${shots.length})
      RETURNING *
    `

    const session = sessions[0] as PhotoSession

    // Create the shots
    for (let i = 0; i < shots.length; i++) {
      await sql`
        INSERT INTO session_shots (session_id, shot_name, shot_type, order_index)
        VALUES (${session.id}, ${shots[i]}, ${shots[i]}, ${i})
      `
    }

    return session
  } catch (error) {
    console.error("[v0] Error creating photo session:", error)
    return null
  }
}

/**
 * Update session progress
 */
export async function updateSessionProgress(
  sessionId: number,
  completedShots: number,
  totalShots: number,
): Promise<void> {
  try {
    const progress = Math.round((completedShots / totalShots) * 100)

    await sql`
      UPDATE photo_sessions
      SET 
        completed_shots = ${completedShots},
        progress = ${progress},
        status = ${progress === 100 ? "completed" : "active"},
        completed_at = ${progress === 100 ? new Date().toISOString() : null}
      WHERE id = ${sessionId}
    `
  } catch (error) {
    console.error("[v0] Error updating session progress:", error)
  }
}

/**
 * Mark a shot as completed
 */
export async function completeSessionShot(shotId: number, imageId?: number): Promise<void> {
  try {
    await sql`
      UPDATE session_shots
      SET 
        status = 'completed',
        image_id = ${imageId || null},
        completed_at = ${new Date().toISOString()}
      WHERE id = ${shotId}
    `

    // Update session progress
    const shots = await sql`
      SELECT session_id FROM session_shots WHERE id = ${shotId}
    `

    if (shots.length > 0) {
      const sessionId = shots[0].session_id

      const allShots = await sql`
        SELECT * FROM session_shots WHERE session_id = ${sessionId}
      `

      const completedCount = allShots.filter((s: SessionShot) => s.status === "completed").length

      await updateSessionProgress(sessionId, completedCount, allShots.length)
    }
  } catch (error) {
    console.error("[v0] Error completing session shot:", error)
  }
}
