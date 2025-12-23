import { NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { neon } from "@neondatabase/serverless"

const ADMIN_EMAIL = "ssa@ssasocial.com"
const sql = neon(process.env.DATABASE_URL!)

export async function GET(request: Request) {
  try {
    // Verify admin access
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const neonUser = await getUserByAuthId(user.id)
    if (!neonUser || neonUser.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const testResultId = searchParams.get("test_result_id")

    if (!testResultId) {
      return NextResponse.json({ error: "test_result_id is required" }, { status: 400 })
    }

    // Get test images for this test result
    const testImages = await sql`
      SELECT 
        id,
        test_result_id,
        prompt,
        prompt_settings,
        image_url,
        generation_params,
        created_at,
        comparison_rank,
        rating,
        notes,
        generation_time_ms,
        replicate_prediction_id
      FROM maya_test_images
      WHERE test_result_id = ${parseInt(testResultId)}
      ORDER BY created_at DESC
    `

    // Also get training images if this is a training test
    const testResult = await sql`
      SELECT test_type, results
      FROM maya_test_results
      WHERE id = ${parseInt(testResultId)}
      LIMIT 1
    `

    let trainingImages: any[] = []
    if (testResult.length > 0 && testResult[0].test_type === 'training') {
      const testTraining = await sql`
        SELECT training_images_urls
        FROM maya_test_trainings
        WHERE test_result_id = ${parseInt(testResultId)}
        LIMIT 1
      `
      
      if (testTraining.length > 0 && testTraining[0].training_images_urls) {
        trainingImages = (testTraining[0].training_images_urls as string[]).map((url: string, idx: number) => ({
          id: `training-${idx}`,
          url,
          type: 'training',
        }))
      }
    }

    return NextResponse.json({
      success: true,
      test_images: testImages.map((img: any) => ({
        id: img.id,
        test_result_id: img.test_result_id,
        prompt: img.prompt,
        prompt_settings: img.prompt_settings,
        image_url: img.image_url,
        generation_params: img.generation_params,
        created_at: img.created_at,
        comparison_rank: img.comparison_rank,
        rating: img.rating,
        notes: img.notes,
        generation_time_ms: img.generation_time_ms,
      })),
      training_images: trainingImages,
    })
  } catch (error: any) {
    console.error("[v0] Error getting test images:", error)
    return NextResponse.json(
      { error: error.message || "Failed to get test images" },
      { status: 500 }
    )
  }
}
























