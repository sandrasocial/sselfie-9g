import { type NextRequest, NextResponse } from "next/server"
import { getReplicateClient } from "@/lib/replicate-client"

export async function POST(req: NextRequest) {
  try {
    const { prompt, aspectRatio = "1:1" } = await req.json()

    console.log("[v0] Generating concept image with FLUX.1 Dev:", { prompt, aspectRatio })

    const replicate = getReplicateClient()

    const prediction = await replicate.predictions.create({
      model: "black-forest-labs/flux-dev",
      input: {
        prompt: prompt, // Use the full detailed prompt as-is
        aspect_ratio: aspectRatio,
        num_outputs: 1,
        guidance: 3.5, // Optimal for FLUX Dev
        num_inference_steps: 28, // High quality setting
        output_format: "png",
        output_quality: 100, // Maximum quality
      },
    })

    console.log("[v0] FLUX.1 Dev prediction created:", prediction.id, prediction.status)

    return NextResponse.json({
      success: true,
      predictionId: prediction.id,
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error generating image:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate image" },
      { status: 500 },
    )
  }
}
