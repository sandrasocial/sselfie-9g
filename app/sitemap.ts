import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://sselfie.ai"
  const now = new Date()

  const marketingPages: Array<{
    path: string
    changeFrequency: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never"
    priority: number
  }> = [
    // Core conversion pages — highest priority
    { path: "/", changeFrequency: "daily", priority: 1.0 },
    { path: "/quiz/post-to-paid", changeFrequency: "weekly", priority: 0.95 },
    { path: "/visibility-suite", changeFrequency: "weekly", priority: 0.95 },
    { path: "/what-to-say", changeFrequency: "weekly", priority: 0.9 },
    { path: "/show-up", changeFrequency: "weekly", priority: 0.9 },
    { path: "/get-paid", changeFrequency: "weekly", priority: 0.9 },
    { path: "/brand-strategy", changeFrequency: "weekly", priority: 0.9 },
    { path: "/checkout/membership", changeFrequency: "weekly", priority: 0.9 },

    // Product & feature pages
    { path: "/selfie-guide", changeFrequency: "weekly", priority: 0.65 },
    { path: "/why-studio", changeFrequency: "weekly", priority: 0.8 },
    { path: "/blueprint", changeFrequency: "weekly", priority: 0.7 },
    { path: "/whats-new", changeFrequency: "weekly", priority: 0.7 },

    // AI SEO content pages — citability targets for ChatGPT, Perplexity, Google AI Overviews
    { path: "/ai-brand-photos", changeFrequency: "monthly", priority: 0.7 },
    // Content / educational pages
    { path: "/academy", changeFrequency: "weekly", priority: 0.6 },

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
