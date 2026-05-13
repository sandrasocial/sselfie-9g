import { redirect } from "next/navigation"

/**
 * Brand Strategy Pack is archived as a standalone product.
 * Existing buyers access their strategy at /strategy/[token].
 * New visitors are redirected to the Masterclass.
 */
export default function BrandStrategyPage() {
  redirect("/masterclass")
}
