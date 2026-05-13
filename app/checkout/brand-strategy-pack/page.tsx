import { redirect } from "next/navigation"

/**
 * Brand Strategy Pack checkout is archived.
 * Redirect new visitors to the Masterclass checkout.
 * Existing buyers access their strategy at /strategy/[token].
 */
export default function BrandStrategyPackCheckoutPage() {
  redirect("/checkout/masterclass")
}
