// Retired 2026-03-09 — Brand Strategy is now a $19 paid product
// Legacy route redirects to paid landing page
import { redirect } from "next/navigation"

export default function LegacyFreebieBrandStrategyPage() {
  redirect("/brand-strategy")
}
