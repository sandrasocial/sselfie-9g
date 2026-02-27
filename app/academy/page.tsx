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
  description: string
  price: number
}[] = [
  {
    id: "what_to_say",
    name: "What To Say",
    description: "Know exactly what to post without staring at a blank screen.",
    price: 17,
  },
  {
    id: "show_up",
    name: "Show Up",
    description: "Build your 30-day content rhythm so visibility compounds weekly.",
    price: 27,
  },
  {
    id: "get_paid",
    name: "Get Paid",
    description: "Turn your audience attention into your first consistent online income.",
    price: 47,
  },
  {
    id: "ai_photo_prompts",
    name: "AI Photo Prompt Pack",
    description: "Generate stronger brand photos from your phone with guided prompts.",
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
          router.push("/auth/login?redirect=/academy")
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
    <div className="mt-5">
      <button
        onClick={handleBuy}
        disabled={loading}
        className={`${inter.className} text-[11px] uppercase tracking-[0.22em] text-[#ffffff] hover:text-[#f5f5f5] disabled:opacity-50`}
        style={{ fontWeight: 500 }}
      >
        {loading ? "Opening checkout" : `Get it -> ${price} EUR`}
      </button>
      {error && <p className={`${inter.className} mt-2 text-xs text-red-400`}>{error}</p>}
    </div>
  )
}

export default function AcademyPage() {
  return (
    <main className="min-h-screen min-w-[375px] bg-[#0a0a0a] text-[#ffffff]">
      <section className="px-6 py-16 md:px-20 md:py-20 border-b border-[rgba(255,255,255,0.08)]">
        <p className={`${inter.className} text-[11px] uppercase tracking-[0.5em] text-[#666666]`} style={{ fontWeight: 500 }}>
          SSELFIE Academy
        </p>
        <h1
          className={`${cormorant.className} mt-6 uppercase text-[#ffffff] text-5xl md:text-7xl`}
          style={{ fontWeight: 200, lineHeight: 0.95 }}
        >
          From 12 EUR
          <br />
          To A Live App
          <br />
          In 8 Months.
        </h1>
      </section>

      <section className="px-6 py-10 md:px-20 md:py-14">
        <ol className="space-y-0 border-t border-[rgba(255,255,255,0.08)]">
          {PRODUCTS.map((product, index) => (
            <li
              key={product.id}
              className="grid grid-cols-[80px_1fr] gap-4 border-b border-[rgba(255,255,255,0.08)] py-8 md:grid-cols-[120px_1fr] md:gap-6"
            >
              <p
                className={`${cormorant.className} text-4xl md:text-5xl text-[#f5f5f5]`}
                style={{ fontWeight: 300, lineHeight: 1 }}
              >
                {String(index + 1).padStart(2, "0")}
              </p>

              <div>
                <p
                  className={`${inter.className} text-[11px] uppercase tracking-[0.38em] text-[#ffffff]`}
                  style={{ fontWeight: 500 }}
                >
                  {product.name}
                </p>
                <p className={`${inter.className} mt-3 text-sm text-[#666666] max-w-xl`} style={{ fontWeight: 300, lineHeight: 1.8 }}>
                  {product.description}
                </p>
                <p className={`${inter.className} mt-4 text-[11px] uppercase tracking-[0.22em] text-[#ffffff]`} style={{ fontWeight: 500 }}>
                  {product.price} EUR
                </p>
                <BuyButton productId={product.id} price={product.price} />
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-6 pb-16 md:px-20 md:pb-20">
        <div className="grid grid-cols-3 gap-3 border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] p-5 md:gap-6 md:p-8">
          <div>
            <p className={`${cormorant.className} text-3xl md:text-5xl text-[#ffffff]`} style={{ fontWeight: 200 }}>180K+</p>
            <p className={`${inter.className} mt-1 text-[11px] uppercase tracking-[0.22em] text-[#666666]`} style={{ fontWeight: 300 }}>
              Audience
            </p>
          </div>
          <div>
            <p className={`${cormorant.className} text-3xl md:text-5xl text-[#ffffff]`} style={{ fontWeight: 200 }}>12 EUR</p>
            <p className={`${inter.className} mt-1 text-[11px] uppercase tracking-[0.22em] text-[#666666]`} style={{ fontWeight: 300 }}>
              Starting Point
            </p>
          </div>
          <div>
            <p className={`${cormorant.className} text-3xl md:text-5xl text-[#ffffff]`} style={{ fontWeight: 200 }}>8 Months</p>
            <p className={`${inter.className} mt-1 text-[11px] uppercase tracking-[0.22em] text-[#666666]`} style={{ fontWeight: 300 }}>
              Build Window
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
