import { NextResponse } from "next/server"
import { getAuthenticatedUserWithRetry } from "@/lib/auth-helper"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getDb } from "@/lib/db"
import { getReplicateClient } from "@/lib/replicate-client"

export async function POST(
  request: Request,
  { params }: { params: Promise<{ postId: string }> }
) {
  try {
    const { user, error: authError } = await getAuthenticatedUserWithRetry()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    const { postId: postIdStr } = await params
    const postId = Number.parseInt(postIdStr, 10)
    if (Number.isNaN(postId)) {
      return NextResponse.json({ error: "Invalid post ID" }, { status: 400 })
    }

    const sql = getDb()

    const [post] = await sql`
      SELECT id, user_id, prediction_id, image_url, generation_status
      FROM feed_posts
      WHERE id = ${postId}
      LIMIT 1
    ` as any[]

    if (!post) {
      return NextResponse.json({ error: "Post not found" }, { status: 404 })
    }

    if (post.user_id !== neonUser.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    if (post.image_url) {
      return NextResponse.json(
        { error: "Image already completed", status: "completed" },
        { status: 409 }
      )
    }

    if (!post.prediction_id) {
      return NextResponse.json({ error: "No active generation found" }, { status: 400 })
    }

    const predictionId = String(post.prediction_id)
    const replicate = getReplicateClient()

    try {
      const prediction = await replicate.predictions.get(predictionId)
      if (prediction?.status === "succeeded") {
        return NextResponse.json(
          { error: "Generation already completed", status: "completed" },
          { status: 409 }
        )
      }
    } catch (statusError) {
      console.warn("[CANCEL] Unable to fetch prediction status:", statusError)
    }

    try {
      await replicate.predictions.cancel(predictionId)
      console.log("[CANCEL] ✅ Replicate prediction canceled:", predictionId)
    } catch (cancelError) {
      console.warn("[CANCEL] ⚠️ Replicate cancel failed:", cancelError)
    }

    await sql`
      UPDATE feed_posts
      SET 
        generation_status = 'failed',
        prediction_id = NULL,
        updated_at = NOW()
      WHERE id = ${postId}
    `

    let refunded = false
    let refundAmount = 0
    let newBalance: number | null = null

    const [existingRefund] = await sql`
      SELECT id
      FROM credit_transactions
      WHERE reference_id = ${predictionId}
        AND transaction_type = 'refund'
      LIMIT 1
    `

    if (!existingRefund) {
      const [charge] = await sql`
        SELECT amount
        FROM credit_transactions
        WHERE reference_id = ${predictionId}
          AND transaction_type = 'image'
        ORDER BY created_at DESC
        LIMIT 1
      `

      if (charge?.amount) {
        refundAmount = Math.abs(Number(charge.amount))

        const [balanceRow] = await sql`
          UPDATE user_credits
          SET 
            balance = balance + ${refundAmount},
            total_used = GREATEST(total_used - ${refundAmount}, 0),
            updated_at = NOW()
          WHERE user_id = ${neonUser.id}
          RETURNING balance
        `

        newBalance = balanceRow?.balance ?? null

        await sql`
          INSERT INTO credit_transactions (
            user_id, amount, transaction_type, description,
            reference_id, balance_after
          ) VALUES (
            ${neonUser.id}, ${refundAmount}, 'refund',
            ${`Refund: generation stopped (post ${postId})`},
            ${predictionId}, ${newBalance}
          )
        `

        try {
          const { invalidateCreditCache } = await import("@/lib/credits-cached")
          await invalidateCreditCache(neonUser.id.toString())
        } catch (cacheError) {
          console.warn("[CANCEL] ⚠️ Failed to invalidate credit cache:", cacheError)
        }

        refunded = true
      }
    }

    return NextResponse.json({
      success: true,
      canceled: true,
      refunded,
      refundAmount,
      newBalance,
    })
  } catch (error) {
    console.error("[CANCEL] ❌ Error stopping generation:", error)
    return NextResponse.json({ error: "Failed to stop generation" }, { status: 500 })
  }
}
