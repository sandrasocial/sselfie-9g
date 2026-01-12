import { getDb } from '@/lib/db'
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

    // Verify post belongs to user
    const [post] = await sql`
      SELECT id, user_id, generation_status, prediction_id
      FROM feed_posts
      WHERE id = ${postId}
      LIMIT 1
    ` as any[]

    if (!post) {
      return NextResponse.json({ error: 'Post not found' }, { status: 404 })
    }

    if (post.user_id !== neonUser.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only mark as failed if still in generating state
    if (post.generation_status === 'generating' || (post.prediction_id && !post.image_url)) {
      await sql`
        UPDATE feed_posts
        SET 
          generation_status = 'failed',
          updated_at = NOW()
        WHERE id = ${postId}
      `

      console.log(`[MARK FAILED] ✅ Post ${postId} marked as failed (polling timeout)`)
      return NextResponse.json({ success: true })
    } else {
      // Post already has a final status, no need to update
      console.log(`[MARK FAILED] ⚠️ Post ${postId} already has status: ${post.generation_status}`)
      return NextResponse.json({ success: true, message: 'Post already has final status' })
    }
  } catch (error) {
    console.error('[MARK FAILED] ❌ Error:', error)
    return NextResponse.json({ error: 'Failed to update post' }, { status: 500 })
  }
}
