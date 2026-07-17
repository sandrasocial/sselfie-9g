import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/selfie-guide/access/",
          "/brand-strategy/setup/",
          "/strategy/",
          "/admin/",
        ],
      },
    ],
    sitemap: "https://www.sselfie.ai/sitemap.xml",
    host: "https://www.sselfie.ai",
  }
}
