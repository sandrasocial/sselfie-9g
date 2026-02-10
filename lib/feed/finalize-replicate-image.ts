import "server-only"

import { put } from "@vercel/blob"

async function applyTextOverlay(imageUrl: string, text: string): Promise<string> {
  try {
    const response = await fetch(imageUrl)
    const imageBlob = await response.blob()
    const imageBuffer = await imageBlob.arrayBuffer()

    const { createCanvas, loadImage } = await import("canvas")
    const image = await loadImage(Buffer.from(imageBuffer))

    const canvas = createCanvas(image.width, image.height)
    const ctx = canvas.getContext("2d")

    ctx.drawImage(image, 0, 0)

    ctx.fillStyle = "rgba(0, 0, 0, 0.3)"
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    const fontSize = Math.floor(canvas.width / 15)
    ctx.font = `bold ${fontSize}px "Playfair Display", serif`
    ctx.fillStyle = "#FFFFFF"
    ctx.textAlign = "center"
    ctx.textBaseline = "middle"

    const maxWidth = canvas.width * 0.8
    const words = String(text || "").split(" ").filter(Boolean)
    const lines: string[] = []
    let currentLine = words[0] || ""

    for (let i = 1; i < words.length; i++) {
      const testLine = currentLine + " " + words[i]
      const metrics = ctx.measureText(testLine)
      if (metrics.width > maxWidth) {
        lines.push(currentLine)
        currentLine = words[i]
      } else {
        currentLine = testLine
      }
    }
    if (currentLine) lines.push(currentLine)

    const lineHeight = fontSize * 1.4
    const startY = canvas.height / 2 - ((lines.length - 1) * lineHeight) / 2

    lines.forEach((line, index) => {
      ctx.fillText(line, canvas.width / 2, startY + index * lineHeight)
    })

    const buffer = canvas.toBuffer("image/jpeg", { quality: 0.9 })
    const blob = await put(`feed-images/${Date.now()}-overlay.jpg`, buffer, {
      access: "public",
      contentType: "image/jpeg",
      addRandomSuffix: true,
    })

    return blob.url
  } catch (error) {
    console.error("[v0] Error applying text overlay:", error)
    return imageUrl
  }
}

export async function finalizeReplicateImageToBlob(input: {
  imageUrl: string
  blobPath: string
  textOverlay?: string | null
}): Promise<{ finalUrl: string; usedFallback: boolean }> {
  const imageUrl = String(input.imageUrl || "").trim()
  if (!imageUrl) return { finalUrl: imageUrl, usedFallback: true }

  try {
    if (input.textOverlay && String(input.textOverlay).trim().length > 0) {
      const overlaid = await applyTextOverlay(imageUrl, String(input.textOverlay))
      return { finalUrl: overlaid, usedFallback: overlaid === imageUrl }
    }

    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      return { finalUrl: imageUrl, usedFallback: true }
    }

    const imageBlob = await imageResponse.blob()
    const blob = await put(input.blobPath, imageBlob, {
      access: "public",
      contentType: "image/png",
      addRandomSuffix: true,
    })
    return { finalUrl: blob.url, usedFallback: false }
  } catch (error) {
    console.error("[v0] Failed to upload to Blob, using source URL:", error)
    return { finalUrl: imageUrl, usedFallback: true }
  }
}

