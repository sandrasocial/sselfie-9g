import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sselfie.ai"
  const now = new Date()

  const marketingPages: Array<{ path: string; changeFrequency: "daily" | "weekly"; priority: number }> = [
    { path: "/", changeFrequency: "daily", priority: 1 },
    { path: "/selfie-guide", changeFrequency: "weekly", priority: 0.9 },
    { path: "/brand-strategy", changeFrequency: "weekly", priority: 0.9 },
    { path: "/why-studio", changeFrequency: "weekly", priority: 0.8 },
  ]

  return marketingPages.map((page) => ({
    url: `${baseUrl}${page.path === "/" ? "" : page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
