import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

type QueryValue = string | string[] | undefined

export default async function CheckoutUpgradePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, QueryValue>>
}) {
  const params = await searchParams
  const qs = new URLSearchParams()

  for (const [key, value] of Object.entries(params || {})) {
    if (typeof value === "string" && value) {
      qs.set(key, value)
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item) {
          qs.append(key, item)
        }
      }
    }
  }

  const query = qs.toString() ? `?${qs.toString()}` : ""

  redirect(`/checkout/membership${query}`)
}
