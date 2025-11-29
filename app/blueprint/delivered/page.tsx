"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import { FunnelTracker } from "@/components/funnel/FunnelTracker"

export default function BlueprintDeliveredPage() {
  const searchParams = useSearchParams()
  const email = searchParams.get("email")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Simulate loading for smooth UX
    const timer = setTimeout(() => setLoading(false), 800)
    return () => clearTimeout(timer)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-stone-900 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <>
      <FunnelTracker />
      <div className="min-h-screen bg-gradient-to-b from-stone-50 to-stone-100 flex items-center justify-center p-6">
        <div className="max-w-2xl mx-auto text-center">
          {/* Large serif headline */}
          <h1 className="font-serif text-5xl md:text-6xl font-light tracking-wide text-stone-950 mb-6">
            YOUR BLUEPRINT
            <br />
            IS ON THE WAY
          </h1>

          {/* One-paragraph confirmation */}
          <p className="text-stone-600 text-lg leading-relaxed mb-8 max-w-xl mx-auto">
            Your personal Brand Blueprint has been generated and sent to{" "}
            <strong className="text-stone-900">{email || "your email"}</strong>. Check your inbox for your complete
            strategy, concept cards, caption templates, and 30-day content calendar.
          </p>

          {/* CTA Button */}
          <a
            href={`mailto:${email || ""}`}
            className="inline-block bg-white text-stone-900 border-2 border-stone-900 px-8 py-4 rounded-md font-serif text-sm tracking-widest uppercase hover:bg-stone-900 hover:text-white transition-all duration-200"
          >
            Open Your Email
          </a>

          {/* Subtext */}
          <p className="mt-8 text-sm text-stone-500">
            Over the next 2 days, you'll receive follow-up emails showing you how to implement your Blueprint with
            SSELFIE Studio.
          </p>

          {/* Secondary CTA */}
          <div className="mt-12 pt-8 border-t border-stone-200">
            <p className="text-stone-600 mb-4">Ready to bring your Blueprint to life now?</p>
            <a
              href="/beta"
              className="inline-block text-stone-900 underline underline-offset-4 hover:text-stone-600 transition-colors"
            >
              Explore SSELFIE Studio →
            </a>
          </div>
        </div>
      </div>
    </>
  )
}
