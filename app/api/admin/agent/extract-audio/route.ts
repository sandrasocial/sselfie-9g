export const runtime = 'nodejs'
export const maxDuration = 60

import { put } from '@vercel/blob'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('video') as File

    if (!file) {
      return NextResponse.json({ error: 'No video file provided' }, { status: 400 })
    }

    console.log('[v0] Extracting audio from video:', {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Convert video file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // For now, upload the video file as-is and let the client handle it
    // In production, you would use ffmpeg to extract audio here
    // This is a placeholder that uploads the video for later processing
    const blob = await put(`videos/${file.name}`, buffer, {
      access: 'public',
      contentType: file.type,
    })

    console.log('[v0] Video uploaded successfully:', blob.url)

    return NextResponse.json({
      success: true,
      videoUrl: blob.url,
      message: 'Video uploaded. For files over 25MB, please use a video URL (YouTube, Instagram, TikTok) or upload a smaller audio file.',
    })
  } catch (error) {
    console.error('[v0] Audio extraction error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Audio extraction failed' },
      { status: 500 }
    )
  }
}
</parameter>
