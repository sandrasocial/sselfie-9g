import type React from "react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "SSELFIE Brand Blueprint - Free Personal Brand Strategy",
  description:
    "Build your personal brand strategy in 10 minutes. Get a custom 30-day content calendar, caption templates, and your brand style guide - completely free.",
  openGraph: {
    title: "SSELFIE Brand Blueprint - Free Personal Brand Strategy",
    description:
      "Build your personal brand strategy in 10 minutes. Get a custom 30-day content calendar, caption templates, and your brand style guide.",
    type: "website",
    url: "https://sselfie.ai/blueprint",
    images: [
      {
        url: "/images/2-20-281-29.png",
        width: 1200,
        height: 630,
        alt: "SSELFIE Brand Blueprint",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SSELFIE Brand Blueprint - Free Personal Brand Strategy",
    description:
      "Build your personal brand strategy in 10 minutes. Get a custom 30-day content calendar, caption templates, and your brand style guide.",
    images: ["/images/2-20-281-29.png"],
  },
}

export default function BlueprintLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
