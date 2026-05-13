import type { Metadata } from "next"
import { MasterclassPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Masterclass | SSELFIE",
  description:
    "Build phone-first visibility with strategy, content systems, and Sandra's full SSELFIE method.",
}

export default function MasterclassPage() {
  return <MasterclassPageContent />
}
