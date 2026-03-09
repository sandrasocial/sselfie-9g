// Retired 2026-03-09 — Selfie Guide is a paid product
// Legacy route redirects to paid landing page
import { redirect } from "next/navigation"

export default function LegacyFreebieSelfieGuidePage() {
  redirect("/selfie-guide")
}
