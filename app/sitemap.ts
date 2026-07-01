import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sselfie.ai"
  const now = new Date()

  const marketingPages: Array<{
    path: string
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
    priority: number
  }> = [
    // Core funnel - highest priority
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/selfie-guide", changeFrequency: "weekly", priority: 0.95 },
    { path: "/starter-kit", changeFrequency: "weekly", priority: 0.95 },
    { path: "/masterclass", changeFrequency: "weekly", priority: 0.92 },
    { path: "/join/studio", changeFrequency: "weekly", priority: 0.9 },
    { path: "/work-with-me", changeFrequency: "weekly", priority: 0.85 },

    // Studio education
    { path: "/why-studio", changeFrequency: "weekly", priority: 0.6 },

    // Legal
    { path: "/privacy", changeFrequency: "monthly", priority: 0.3 },
    { path: "/terms", changeFrequency: "monthly", priority: 0.3 },
  ]

  return marketingPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }))
}
