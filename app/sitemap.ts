import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.sselfie.ai"

  const marketingPages = [
    { path: "/" },
    { path: "/selfie-guide" },
    { path: "/starter-kit" },
    { path: "/masterclass" },
    { path: "/join/studio" },
    { path: "/ai-prompts" },
    { path: "/prompt-vault" },
  ]

  return marketingPages.map((page) => ({
    url: `${baseUrl}${page.path}`,
  }))
}
