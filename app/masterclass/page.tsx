import type { Metadata } from "next"
import { MasterclassPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Selfie Branding Masterclass",
  description:
    "Build phone-first visibility with strategy, content systems, and Sandra's full SSELFIE method.",
  alternates: {
    canonical: "https://www.sselfie.ai/masterclass",
  },
  openGraph: {
    title: "Selfie Branding Masterclass",
    description: "Build phone-first visibility with strategy, content systems, and Sandra's full SSELFIE method.",
    url: "https://www.sselfie.ai/masterclass",
    images: ["/og-image.png"],
  },
}

export default function MasterclassPage() {
  return <MasterclassPageContent />
}
