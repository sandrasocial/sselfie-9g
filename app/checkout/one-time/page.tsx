import { redirect } from "next/navigation"

export default function OneTimeCheckoutRedirectPage() {
  redirect("/checkout/membership")
}
