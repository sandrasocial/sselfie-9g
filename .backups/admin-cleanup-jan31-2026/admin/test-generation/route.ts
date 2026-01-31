import { NextResponse } from "next/server"
import { put } from "@vercel/blob"
import { requireAdmin } from "@/lib/admin-feature-flags"
import { generateWithNanoBanana } from "@/lib/nano-banana-client"

export async function POST(request: Request) {
  const adminCheck = await requireAdmin()
  if (!adminCheck.isAdmin) {
    return NextResponse.json(
      { error: adminCheck.error || "Admin access required" },
      { status: adminCheck.error === "Not authenticated" ? 401 : 403 },
    )
  }

  const formData = await request.formData()
  const prompt = formData.get("prompt") as string
  const type = (formData.get("type") as string) || "single_scene"
  const files = formData.getAll("images") as File[]

  if (!prompt) {
    return NextResponse.json({ error: "Prompt is required." }, { status: 400 })
  }

  if (!files || files.length === 0) {
    return NextResponse.json({ error: "At least one reference image is required." }, { status: 400 })
  }

  const uploadedUrls: string[] = []
  for (const file of files) {
    const blob = await put(`maya-test-${Date.now()}-${file.name}`, file, { access: "public" })
    uploadedUrls.push(blob.url)
  }

  const result = await generateWithNanoBanana({
    prompt,
    image_input: uploadedUrls,
    aspect_ratio: type === "preview" ? "9:16" : "4:5",
    resolution: "2K",
    output_format: "png",
    safety_filter_level: "block_only_high",
  })

  return NextResponse.json({
    image_url: result.output || null,
    generation_id: result.predictionId,
    status: result.status,
    reference_images: uploadedUrls,
  })
}
