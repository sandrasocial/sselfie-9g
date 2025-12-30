import { put } from "@vercel/blob"
import JSZip from "jszip"

export async function uploadTrainingImages(userId: string, images: File[]): Promise<string[]> {
  const uploadedUrls: string[] = []

  for (const image of images) {
    const filename = `training/${userId}/${Date.now()}-${image.name}`
    const blob = await put(filename, image, {
      access: "public",
    })
    uploadedUrls.push(blob.url)
  }

  return uploadedUrls
}

export async function createTrainingZip(imageUrls: string[]): Promise<string> {
  try {
    console.log("[v0] Creating training ZIP from", imageUrls.length, "images")

    const zip = new JSZip()

    // Download and add each image to the ZIP
    for (let i = 0; i < imageUrls.length; i++) {
      const imageUrl = imageUrls[i]
      console.log(`[v0] Fetching image ${i + 1}/${imageUrls.length}:`, imageUrl)

      try {
        const response = await fetch(imageUrl)
        if (!response.ok) {
          throw new Error(`Failed to fetch image: ${response.statusText}`)
        }

        const imageBlob = await response.blob()
        const arrayBuffer = await imageBlob.arrayBuffer()

        // Extract filename from URL or use index
        const filename = imageUrl.split("/").pop() || `image_${i + 1}.jpg`
        zip.file(filename, arrayBuffer)

        console.log(`[v0] Added ${filename} to ZIP`)
      } catch (error) {
        console.error(`[v0] Error fetching image ${i + 1}:`, error)
        throw error
      }
    }

    // Generate ZIP file
    console.log("[v0] Generating ZIP file...")
    const zipBlob = await zip.generateAsync({ type: "blob" })

    // Upload ZIP to Vercel Blob
    const timestamp = Date.now()
    const zipFilename = `training-datasets/dataset-${timestamp}.zip`

    console.log("[v0] Uploading ZIP to blob storage:", zipFilename)
    const uploadedZip = await put(zipFilename, zipBlob, {
      access: "public",
      contentType: "application/zip",
    })

    console.log("[v0] ZIP uploaded successfully:", uploadedZip.url)
    return uploadedZip.url
  } catch (error) {
    console.error("[v0] Error creating training ZIP:", error)
    throw new Error(`Failed to create training ZIP: ${error}`)
  }
}
