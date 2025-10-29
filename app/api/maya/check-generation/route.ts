import { type NextRequest, NextResponse } from "next/server"
import { createServerClient } from "@/lib/supabase/server"
import { neon } from "@neondatabase/serverless"
import Replicate from "replicate"
import { put } from "@vercel/blob"

const sql = neon(process.env.DATABASE_URL || "")

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const predictionId = searchParams.get("predictionId")
    const generationId = searchParams.get("generationId")
    const addTextOverlay = searchParams.get("addTextOverlay") === "true"
    const overlayText = searchParams.get("overlayText")

    if (!predictionId || !generationId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 })
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    })

    const prediction = await replicate.predictions.get(predictionId)

    console.log("[v0] Prediction status:", prediction.status)

    if (prediction.status === "succeeded" && prediction.output) {
      const imageUrl = Array.isArray(prediction.output) ? prediction.output[0] : prediction.output

      let finalImageBlob: Blob

      if (addTextOverlay && overlayText) {
        console.log("[v0] Adding text overlay to highlight cover:", overlayText)

        // Fetch the generated image
        const imageResponse = await fetch(imageUrl)
        const imageBlob = await imageResponse.blob()

        // Convert blob to base64 for canvas processing
        const arrayBuffer = await imageBlob.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        const base64Image = buffer.toString("base64")

        // Create canvas and add text overlay
        const { createCanvas, loadImage } = await import("canvas")
        const image = await loadImage(`data:image/png;base64,${base64Image}`)

        const canvas = createCanvas(image.width, image.height)
        const ctx = canvas.getContext("2d")

        // Draw the background image
        ctx.drawImage(image, 0, 0)

        // Add semi-transparent overlay for better text readability
        ctx.fillStyle = "rgba(0, 0, 0, 0.2)"
        ctx.fillRect(0, 0, canvas.width, canvas.height)

        // Configure text styling - elegant serif font
        const fontSize = Math.floor(canvas.width * 0.15) // 15% of image width
        ctx.font = `${fontSize}px "Playfair Display", serif`
        ctx.fillStyle = "#FFFFFF"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"

        // Add text shadow for depth
        ctx.shadowColor = "rgba(0, 0, 0, 0.5)"
        ctx.shadowBlur = 10
        ctx.shadowOffsetX = 2
        ctx.shadowOffsetY = 2

        // Draw the text in the center
        ctx.fillText(overlayText, canvas.width / 2, canvas.height / 2)

        // Convert canvas to blob
        const canvasBuffer = canvas.toBuffer("image/png")
        finalImageBlob = new Blob([canvasBuffer], { type: "image/png" })

        console.log("[v0] Text overlay added successfully")
      } else {
        // No text overlay needed, use original image
        const imageResponse = await fetch(imageUrl)
        finalImageBlob = await imageResponse.blob()
      }

      const blob = await put(`maya-generations/${generationId}.png`, finalImageBlob, {
        access: "public",
        contentType: "image/png",
        addRandomSuffix: true,
      })

      await sql`
        UPDATE generated_images
        SET 
          image_urls = ${blob.url},
          selected_url = ${blob.url},
          saved = true
        WHERE id = ${Number.parseInt(generationId)}
      `

      return NextResponse.json({
        status: "succeeded",
        imageUrl: blob.url,
      })
    } else if (prediction.status === "failed") {
      return NextResponse.json({
        status: "failed",
        error: prediction.error || "Generation failed",
      })
    }

    return NextResponse.json({
      status: prediction.status,
    })
  } catch (error) {
    console.error("[v0] Error checking generation:", error)
    return NextResponse.json({ error: "Failed to check generation status" }, { status: 500 })
  }
}
