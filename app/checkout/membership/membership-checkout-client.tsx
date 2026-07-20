"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

interface Props {
  promoCode?: string
  bonus?: string
}

export default function MembershipCheckoutClient({ promoCode, bonus }: Props) {
  const [interval, setInterval] = useState<"month" | "year">("month")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleContinue = () => {
    setLoading(true)
    const params = new URLSearchParams()
    params.set("interval", interval)
    if (promoCode) params.set("promo", promoCode)
    if (bonus) params.set("bonus", bonus)
    router.push(`/checkout/membership?${params.toString()}`)
  }

  const monthlyPrice = "€97"
  const annualPrice = "€970"
  const annualMonthly = "€80.83"
  const annualSaving = "€194"

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo / Brand */}
        <p className="text-center font-['Cormorant_Garamond'] text-xs tracking-[0.35em] uppercase text-[#666666] mb-12">
          SSELFIE SUITE
        </p>

        <h1 className="font-['Cormorant_Garamond'] font-light text-3xl tracking-[0.15em] uppercase text-[#f0ede8] text-center mb-2">
          Choose your plan
        </h1>
        <p className="text-center text-[#666666] font-['Inter'] text-sm mb-10">
          100 credits / month. Cancel anytime.
        </p>

        {/* Billing toggle */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setInterval("month")}
            className={`flex-1 rounded-full border py-3 font-['Inter'] text-xs tracking-[0.15em] uppercase transition-all ${
              interval === "month"
                ? "border-[#c8c4bb] bg-[#c8c4bb] text-[#0a0a0a]"
                : "border-[rgba(195,190,182,0.25)] bg-transparent text-[#8a8780] hover:border-[rgba(195,190,182,0.5)]"
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval("year")}
            className={`flex-1 rounded-full border py-3 font-['Inter'] text-xs tracking-[0.15em] uppercase transition-all relative ${
              interval === "year"
                ? "border-[#c8c4bb] bg-[#c8c4bb] text-[#0a0a0a]"
                : "border-[rgba(195,190,182,0.25)] bg-transparent text-[#8a8780] hover:border-[rgba(195,190,182,0.5)]"
            }`}
          >
            Annual
            <span className="ml-1.5 text-[10px] opacity-70">−17%</span>
          </button>
        </div>

        {/* Price display */}
        <div className="rounded-2xl border border-[rgba(195,190,182,0.15)] bg-[rgba(28,27,25,0.60)] p-6 mb-8 text-center">
          {interval === "month" ? (
            <>
              <p className="font-['Cormorant_Garamond'] text-4xl font-light text-[#f0ede8]">{monthlyPrice}</p>
              <p className="text-[#666666] font-['Inter'] text-xs tracking-[0.1em] mt-1">per month</p>
            </>
          ) : (
            <>
              <p className="font-['Cormorant_Garamond'] text-4xl font-light text-[#f0ede8]">{annualPrice}</p>
              <p className="text-[#666666] font-['Inter'] text-xs tracking-[0.1em] mt-1">
                per year · {annualMonthly}/mo
              </p>
              <p className="text-[#c8c4bb] font-['Inter'] text-xs tracking-[0.1em] mt-2">
                Save {annualSaving} vs monthly
              </p>
            </>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleContinue}
          disabled={loading}
          className="w-full bg-[#c8c4bb] text-[#0d0c0b] px-6 py-4 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.2em] hover:bg-[#f0ede8] transition-all disabled:opacity-50"
        >
          {loading ? "Loading..." : "Continue to checkout"}
        </button>

        <p className="text-center text-[#666666] font-['Inter'] text-xs mt-4">
          Secure checkout via Stripe
        </p>
      </div>
    </div>
  )
}
