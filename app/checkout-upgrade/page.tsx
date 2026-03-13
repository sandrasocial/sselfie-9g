import { redirect } from "next/navigation"

export default async function CheckoutUpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ promo?: string }>
}) {
  const params = await searchParams
  const query = params.promo ? `?promo=${encodeURIComponent(params.promo)}` : ""
  redirect(`/checkout/membership${query}`)
}
