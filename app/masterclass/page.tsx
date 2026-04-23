import type { Metadata } from "next"
import { MasterclassPageContent } from "@/components/sselfie/public-marketing"

export const metadata: Metadata = {
  title: "Masterclass | SSELFIE",
  description: "The full selfie method for light, pose, edit, post, and repeat.",
}

export default function MasterclassPage() {
  return <MasterclassPageContent />
}
