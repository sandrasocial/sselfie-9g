import { getDb } from '@/lib/db/client'
import { NextResponse } from 'next/server'
import { getAuthenticatedUserWithRetry } from '@/lib/auth-helper'
import { getUserByAuthId } from '@/lib/user-mapping'

/**
 * Mark a feed post as failed
 * 
 * Used when polling timeout is exceeded and post is stuck in "generating" state
 * This allows the UI to show an error state instead of infinite loading
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    // Authenticate user
    const { user, error: authError } = await getAuthenticatedUserWithRetry()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { postId: postIdStr } = await params
    const postId = parseInt(postIdStr)
    if (isNaN(postId)) {
      return NextResponse.json({ error: 'Invalid post ID' }, { status: 400 })
    }

    const sql = getDb()

    // Completion and timeout callbacks can race. Make the ownership check and state transition
    // one atomic update so a delayed timeout can never overwrite a completed image.
    const updated = await sql`
      UPDATE feed_posts
      SET
        generation_status = 'failed',
        updated_at = NOW()
      WHERE id = ${postId}
        AND user_id = ${neonUser.id}
        AND image_url IS NULL
        AND (
          generation_status = 'generating'
          OR (
            prediction_id IS NOT NULL
            AND (generation_status IS NULL OR generation_status NOT IN ('failed', 'cancelled', 'completed', 'complete', 'succeeded'))
          )
        )
      RETURNING id
    ` as Array<{ id: number }>

    if (updated.length > 0) {
      console.log(`[MARK FAILED] ✅ Post ${postId} marked as failed (polling timeout)`)
      return NextResponse.json({ success: true })
    }

    // Do not reveal whether another user's post exists. A missing, completed, or already-terminal
    // row is a safe idempotent no-op for the polling client.
    return NextResponse.json({ success: true, message: 'Post already has a final status' })
  } catch (error) {
    console.error('[MARK FAILED] ❌ Error:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
