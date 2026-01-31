import { NextRequest, NextResponse } from "next/server"
import { experimental_transcribe as transcribe } from "ai"
import { openai } from "@ai-sdk/openai"
import { put } from "@vercel/blob"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"

const ADMIN_EMAIL = "ssa@ssasocial.com"

export const maxDuration = 60

async function fetchVideoContent(url: string) {
  try {
    let platform = "unknown"
    let contentType = "video"
    
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      platform = "youtube"
    } else if (url.includes("instagram.com")) {
      platform = "instagram"
      contentType = "post"
    } else if (url.includes("tiktok.com")) {
      platform = "tiktok"
    } else if (url.includes("twitter.com") || url.includes("x.com")) {
      platform = "twitter"
      contentType = "post"
    }

    return {
      transcription: `[Content from ${platform} - URL: ${url}]\n\nPlease analyze this ${contentType} and recreate it matching Sandra's brand voice, audience, and storytelling style.`,
      contentType: `${platform} ${contentType}`,
      platform
    }
  } catch (error) {
    throw new Error("Failed to fetch content from URL")
  }
}

async function transcribeFile(file: File) {
  try {
    const MAX_WHISPER_SIZE = 25 * 1024 * 1024 // 25MB
    
    if (file.size > MAX_WHISPER_SIZE) {
      console.log("[v0] File too large for Whisper API:", file.size, "bytes. Returning placeholder.")
      return `[Large ${file.type.includes('video') ? 'video' : 'audio'} file: ${file.name}]\n\nThis file is ${(file.size / (1024 * 1024)).toFixed(2)}MB, which exceeds the Whisper API limit of 25MB.\n\nPlease provide a brief description of the content, or upload a smaller file segment for transcription.`
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    console.log("[v0] Calling Whisper API for transcription...")
    
    const result = await transcribe({
      model: openai.transcription("whisper-1"),
      audio: buffer,
    })

    console.log("[v0] Whisper API response received")
    return result.text
  } catch (error: any) {
    console.error("[v0] Transcription error:", error)
    
    const errorMessage = error?.message || String(error)
    
    if (errorMessage.includes("size")) {
      throw new Error("File too large for transcription. Please use a file smaller than 25MB.")
    }
    
    if (errorMessage.includes("format") || errorMessage.includes("unsupported")) {
      throw new Error("Unsupported file format. Please use MP4, MOV, MP3, or WAV.")
    }
    
    throw new Error(`Transcription failed: ${errorMessage}`)
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerClient()
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser()

    if (!authUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const user = await getUserByAuthId(authUser.id)
    if (!user || user.email !== ADMIN_EMAIL) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 })
    }

    let isFormData = false
    let formData: FormData | null = null
    
    try {
      formData = await req.formData()
      isFormData = true
      console.log("[v0] Successfully parsed as FormData")
    } catch (e) {
      console.log("[v0] Not FormData, will try JSON")
    }

    if (isFormData && formData) {
      const file = formData.get("file") as File

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 })
      }

      console.log("[v0] Processing file upload:", file.name, file.type, file.size)
      
      try {
        const blob = await put(file.name, file, {
          access: "public",
          addRandomSuffix: true,
        })

        console.log("[v0] File uploaded to blob:", blob.url)

        console.log("[v0] Starting transcription...")
        const transcription = await transcribeFile(file)
        
        console.log("[v0] Transcription complete, length:", transcription.length)

        return NextResponse.json({
          transcription,
          contentType: file.type.includes("video") ? "uploaded video" : "uploaded audio",
          fileUrl: blob.url,
        })
      } catch (transcriptionError: any) {
        console.error("[v0] Transcription failed, but blob upload succeeded")
        
        return NextResponse.json({
          transcription: `[${file.type.includes('video') ? 'Video' : 'Audio'} file uploaded: ${file.name}]\n\n${transcriptionError.message}\n\nThe file has been uploaded successfully. You can still analyze the visual content or provide a manual description.`,
          contentType: file.type.includes("video") ? "uploaded video (transcription unavailable)" : "uploaded audio (transcription unavailable)",
          fileUrl: blob.url,
          warning: transcriptionError.message
        })
      }
    } else {
      console.log("[v0] Parsing JSON for URL submission")
      const body = await req.json()
      const { url } = body

      if (!url) {
        return NextResponse.json({ error: "URL is required" }, { status: 400 })
      }

      console.log("[v0] Processing URL:", url)

      const result = await fetchVideoContent(url)

      return NextResponse.json({
        transcription: result.transcription,
        contentType: result.contentType,
        platform: result.platform,
      })
    }
  } catch (error: any) {
    console.error("[v0] Content analysis error:", error)
    
    const errorMessage = error?.message || "Failed to analyze content"
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
