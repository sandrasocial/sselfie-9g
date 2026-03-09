import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/studio",
          "/studio/",
          "/checkout/",
          "/selfie-guide/access/",
          "/brand-strategy/setup/",
          "/strategy/",
          "/auth/",
          "/admin/",
        ],
      },
    ],
    sitemap: "https://sselfie.ai/sitemap.xml",
  }
}
