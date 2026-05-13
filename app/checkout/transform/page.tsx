import { redirect } from "next/navigation"

export default function TransformCheckoutRedirectPage() {
  redirect("/checkout/membership")
}
