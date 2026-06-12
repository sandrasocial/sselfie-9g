// SUITE-UX-02 slice 6 — admin manager for the member style picker examples.
// One example image per text-overlay style / carousel design system (app_v3_style_examples).
// Sandra uploads an image OR has Maya generate one (no people, typography demo only, so the
// no-fake doctrine can't be touched). Members read these via show_style_options in Maya chat.

import { type NextRequest, NextResponse } from "next/server"
import { put } from "@vercel/blob"
import OpenAI from "openai"
import { createServerClient } from "@/lib/supabase/server"
import { isAdminEmail } from "@/lib/admin-feature-flags"
import {
  listStyleOptions,
  setStyleExample,
  deleteStyleExample,
  isKnownStyleId,
  buildStyleExamplePrompt,
} from "@/lib/app-v3/maya/style-example-store"

export const dynamic = "force-dynamic"
export const maxDuration = 120 // generation can take a while

const MAX_BYTES = 8 * 1024 * 1024
const OPENAI_IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2"

async function requireAdmin(): Promise<boolean> {
  const supabase = await createServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return isAdminEmail(user?.email)
}

export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const options = await listStyleOptions()
  return NextResponse.json({ options })
}

export async function POST(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  try {
    const contentType = request.headers.get("content-type") ?? ""

    // JSON body = "Maya example": generate the style demo with the production image model.
    if (contentType.includes("application/json")) {
      const body = (await request.json().catch(() => null)) as { styleId?: string } | null
      const styleId = body?.styleId ?? ""
      if (!isKnownStyleId(styleId)) {
        return NextResponse.json({ error: "Unknown style" }, { status: 400 })
      }
      const prompt = buildStyleExamplePrompt(styleId)
      if (!prompt) return NextResponse.json({ error: "Unknown style" }, { status: 400 })
      const apiKey = process.env.OPENAI_API_KEY
      if (!apiKey) {
        return NextResponse.json({ error: "Image generation is not configured" }, { status: 500 })
      }
      const openai = new OpenAI({ apiKey })
      const response = await openai.images.generate({
        model: OPENAI_IMAGE_MODEL,
        prompt,
        n: 1,
        size: "1024x1536",
        quality: "high",
        output_format: "png",
      } as any)
      const b64 = response.data?.[0]?.b64_json
      if (!b64) throw new Error("No image data returned from OpenAI")
      const blob = await put(`app-v3/style-examples/${styleId}-${Date.now()}.png`, Buffer.from(b64, "base64"), {
        access: "public",
        contentType: "image/png",
      })
      await setStyleExample(styleId, blob.url, "maya")
      return NextResponse.json({ styleId, imageUrl: blob.url })
    }

    // Multipart = direct upload.
    const form = await request.formData()
    const styleId = String(form.get("styleId") ?? "")
    const file = form.get("file")
    if (!isKnownStyleId(styleId)) {
      return NextResponse.json({ error: "Unknown style" }, { status: 400 })
    }
    if (!(file instanceof File) || !file.type.startsWith("image/")) {
      return NextResponse.json({ error: "Attach an image file" }, { status: 400 })
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "Image is too large (max 8MB)" }, { status: 400 })
    }
    const ext = file.type.includes("png") ? "png" : file.type.includes("webp") ? "webp" : "jpg"
    const blob = await put(
      `app-v3/style-examples/${styleId}-${Date.now()}.${ext}`,
      Buffer.from(await file.arrayBuffer()),
      { access: "public", contentType: file.type },
    )
    await setStyleExample(styleId, blob.url, "upload")
    return NextResponse.json({ styleId, imageUrl: blob.url })
  } catch (error: any) {
    console.error("[admin style-examples] save failed:", error)
    return NextResponse.json({ error: error?.message || "Save failed" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const styleId = request.nextUrl.searchParams.get("styleId") ?? ""
  if (!isKnownStyleId(styleId)) {
    return NextResponse.json({ error: "Unknown style" }, { status: 400 })
  }
  try {
    await deleteStyleExample(styleId)
    return NextResponse.json({ ok: true })
  } catch (error: any) {
    console.error("[admin style-examples] delete failed:", error)
    return NextResponse.json({ error: "Delete failed" }, { status: 500 })
  }
}
