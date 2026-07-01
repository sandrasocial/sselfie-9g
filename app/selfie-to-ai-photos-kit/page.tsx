import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Selfie To AI Photos Kit | SSELFIE",
  description:
    "The Selfie To AI Photos Kit belongs to the AI prompts funnel. Start with the free AI prompts while the dedicated kit path is prepared.",
}

export default function SelfieToAiPhotosKitPage() {
  redirect(
    "/ai-prompts?source=selfie_to_ai_photos_kit&funnel=prompt&offer_status=planned",
  )
}
