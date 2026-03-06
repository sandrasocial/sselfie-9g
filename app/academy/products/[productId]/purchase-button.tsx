"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

export default function PurchaseButton({
  productId,
  price,
}: {
  productId: string
  price: number
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleBuy() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/academy/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/auth/login?redirect=${encodeURIComponent(`/academy/products/${productId}`)}`)
          return
        }
        throw new Error(data.error || "Something went wrong")
      }
      window.location.href = data.url
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
      setLoading(false)
    }
  }

  return (
    <div className="mt-6">
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`${inter.className} w-full rounded-[20px] border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] px-6 py-3 text-[11px] uppercase tracking-[0.22em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.20)] disabled:opacity-50`}
        style={{ fontWeight: 500 }}
      >
        {loading ? "Opening checkout" : `Get it -> ${price} EUR`}
      </button>
      {error ? <p className={`${inter.className} mt-2 text-xs text-red-400`}>{error}</p> : null}
    </div>
  )
}
