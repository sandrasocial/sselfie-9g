"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Inter } from "next/font/google"

import { resolveSameOriginAcademyPurchaseUrl } from "@/lib/academy-checkout-navigation"

const inter = Inter({ subsets: ["latin"], weight: ["300", "500", "600"] })

export default function PurchaseButton({ productId, price }: { productId: string; price: number }) {
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
        const purchaseUrl = resolveSameOriginAcademyPurchaseUrl(
          data.purchaseUrl,
          window.location.origin
        )
        if (purchaseUrl) {
          window.location.assign(purchaseUrl)
          return
        }
        if (res.status === 401) {
          router.push(
            `/auth/login?returnTo=${encodeURIComponent(`/academy/products/${productId}`)}`
          )
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
    <div>
      <button
        type="button"
        onClick={handleBuy}
        disabled={loading}
        className={`${inter.className} px-8 py-[13px] text-[10px] uppercase tracking-[0.22em] transition-opacity hover:opacity-90 disabled:opacity-40`}
        style={{
          background: "#EDE9E2",
          color: "#0F0D0B",
          fontWeight: 600,
          border: "1px solid transparent",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -2px 0 rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {loading ? "Opening checkout..." : `Get it · ${price} EUR`}
      </button>
      {error ? (
        <p
          className={`${inter.className} mt-3 text-[12px]`}
          style={{ color: "#E57373", fontWeight: 300 }}
        >
          {error}
        </p>
      ) : null}
    </div>
  )
}
