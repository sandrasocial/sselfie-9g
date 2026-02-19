import type { MetadataRoute } from "next"

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL || "https://sselfie.ai").replace(/\/$/, "")

  const routes = [
    "/",
    "/brand-engine",
    "/brand-engine/vip",
    "/apply/brand-engine",
    "/auth/login",
  ]

  const now = new Date()

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: now,
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: route === "/" ? 1 : route.startsWith("/brand-engine") ? 0.9 : 0.7,
  }))
}
