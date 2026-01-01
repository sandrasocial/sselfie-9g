"use client"

import type { GalleryImage } from "@/lib/data/images"

export function categorizeImage(image: GalleryImage): string {
  if (image.category) {
    const cat = image.category.toLowerCase()
    if (cat.includes("close") || cat.includes("portrait")) return "close-up"
    if (cat.includes("half") || cat.includes("waist")) return "half-body"
    if (cat.includes("full")) return "full-body"
    if (cat.includes("scenery") || cat.includes("landscape")) return "scenery"
    if (cat.includes("flat")) return "flatlay"
  }

  const prompt = image.prompt?.toLowerCase() || ""
  if (prompt.includes("close") || prompt.includes("portrait") || prompt.includes("face")) return "close-up"
  if (prompt.includes("half") || prompt.includes("waist")) return "half-body"
  if (prompt.includes("full") && !prompt.includes("scenery")) return "full-body"
  if (prompt.includes("scenery") || prompt.includes("landscape")) return "scenery"
  if (prompt.includes("flat") || prompt.includes("overhead")) return "flatlay"

  return "close-up"
}

