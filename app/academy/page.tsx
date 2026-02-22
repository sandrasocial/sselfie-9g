"use client"

import { useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"
import { useRouter } from "next/navigation"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

type ProductId = "what_to_say" | "show_up" | "get_paid" | "ai_photo_prompts"

const PRODUCTS: {
  id: ProductId
  name: string
  tagline: string
  description: string
  price: number
  badge?: string
}[] = [
  {
    id: "what_to_say",
    name: "What To Say",
    tagline: "Find Your Message In One Hour",
    description: "Stop staring at a blank screen. Know exactly what to post — starting today.",
    price: 17,
  },
  {
    id: "show_up",
    name: "Show Up",
    tagline: "30 Days of Content That Gets You Noticed",
    description: "Have your entire month of content planned, written, and ready — by Sunday.",
    price: 27,
    badge: "Most popular",
  },
  {
    id: "get_paid",
    name: "Get Paid",
    tagline: "Turn Your Visibility Into Your First €500 Online",
    description: "You're showing up. Now let's make sure the right people notice — and pay you.",
    price: 47,
  },
  {
    id: "ai_photo_prompts",
    name: "AI Photo Prompt Pack",
    tagline: "Turn Selfies Into Brand Photos — No Photographer Needed",
    description: "50 done-for-you AI prompts across 10 brand scenarios. Your phone is enough.",
    price: 17,
  },
]

function BuyButton({
  productId,
  price,
}: {
  productId: ProductId
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
          router.push("/login?redirect=/academy")
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
        onClick={handleBuy}
        disabled={loading}
        className={`${inter.className} mt-6 w-full bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80 disabled:opacity-50`}
        style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
      >
        {loading ? "Opening checkout…" : `Get it — €${price}`}
      </button>
      {error && (
        <p className={`${inter.className} mt-2 text-xs text-red-500`}>{error}</p>
      )}
    </div>
  )
}

export default function AcademyPage() {
  return (
    <main className="min-h-screen min-w-[375px] bg-[#ffffff]">
      {/* Header */}
      <div className="border-b border-[#e5e5e5] px-8 py-16 md:px-16">
        <p
          className={`${inter.className} mb-4 text-xs uppercase tracking-[0.5em] text-[#666666]`}
          style={{ fontWeight: 500 }}
        >
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} text-5xl uppercase text-[#0a0a0a] md:text-6xl`}
          style={{ fontWeight: 300, lineHeight: 1.0, letterSpacing: "-0.01em" }}
        >
          Start here.
          <br />
          Build from there.
        </h1>
        <p
          className={`${inter.className} mt-6 max-w-md text-base text-[#666666]`}
          style={{ fontWeight: 300, lineHeight: 1.8 }}
        >
          Each mini-product solves one real problem. Pick the one that matches where you&apos;re stuck right now.
        </p>
      </div>

      {/* Products grid */}
      <div className="px-8 py-16 md:px-16">
        <div className="grid gap-px bg-[#e5e5e5] md:grid-cols-2">
          {PRODUCTS.map((product) => (
            <div key={product.id} className="relative bg-[#ffffff] p-10">
              {product.badge && (
                <span
                  className={`${inter.className} mb-4 inline-block bg-[#0a0a0a] px-3 py-1 text-[10px] uppercase tracking-[0.5em] text-white`}
                  style={{ fontWeight: 500 }}
                >
                  {product.badge}
                </span>
              )}

              <p
                className={`${inter.className} text-xs uppercase tracking-[0.5em] text-[#666666]`}
                style={{ fontWeight: 500 }}
              >
                €{product.price}
              </p>

              <h2
                className={`${cormorant.className} mt-3 text-3xl uppercase text-[#0a0a0a]`}
                style={{ fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.01em" }}
              >
                {product.name}
              </h2>

              <p
                className={`${inter.className} mt-2 text-sm text-[#0a0a0a]`}
                style={{ fontWeight: 300 }}
              >
                {product.tagline}
              </p>

              <p
                className={`${inter.className} mt-4 text-sm text-[#666666]`}
                style={{ fontWeight: 300, lineHeight: 1.8 }}
              >
                {product.description}
              </p>

              <BuyButton productId={product.id} price={product.price} />
            </div>
          ))}
        </div>
      </div>

      {/* Membership upsell */}
      <div className="border-t border-[#e5e5e5] bg-[#f5f5f5] px-8 py-16 md:px-16">
        <div className="max-w-2xl">
          <p
            className={`${inter.className} mb-4 text-xs uppercase tracking-[0.5em] text-[#666666]`}
            style={{ fontWeight: 500 }}
          >
            Or go all in
          </p>
          <h2
            className={`${cormorant.className} text-4xl uppercase text-[#0a0a0a]`}
            style={{ fontWeight: 300, lineHeight: 1.1, letterSpacing: "-0.01em" }}
          >
            Creator Studio
            <br />
            €97 / month
          </h2>
          <p
            className={`${inter.className} mt-4 text-base text-[#666666]`}
            style={{ fontWeight: 300, lineHeight: 1.8 }}
          >
            Your complete AI content team. 200 credits/month. Everything above — plus photos, feed planning, and your brand built on autopilot.
          </p>
          <a
            href="/pricing"
            className={`${inter.className} mt-6 inline-flex bg-[#0a0a0a] px-8 py-3 text-white transition-opacity hover:opacity-80`}
            style={{ fontWeight: 500, fontSize: "13px", letterSpacing: "0.1em", textTransform: "uppercase" }}
          >
            See what&apos;s included
          </a>
        </div>
      </div>
    </main>
  )
}
