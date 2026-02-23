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
        className={`${inter.className} w-full bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80 disabled:opacity-50`}
        style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
      >
        {loading ? "Opening checkout…" : `Get it — €${price}`}
      </button>
      {error ? <p className={`${inter.className} mt-2 text-xs text-red-500`}>{error}</p> : null}
    </div>
  )
}
