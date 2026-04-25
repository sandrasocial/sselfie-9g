import type { Metadata } from "next"
import { MasterclassPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Masterclass | SSELFIE",
  description:
    "Build income-ready visibility with Brand Strategy Pack access, content systems, and Sandra's full SSELFIE method.",
}

export default function MasterclassPage() {
  return <MasterclassPageContent />
}
