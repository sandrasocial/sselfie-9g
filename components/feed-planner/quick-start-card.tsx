"use client"

import { useEffect, useMemo } from "react"
import { ArrowRight } from "lucide-react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

interface QuickStartCardProps {
  onStartNow: () => void
  productHint?: string | null
}

const previewItems = [
  {
    title: "Confident intro",
    subtitle: "Hook + caption idea",
  },
  {
    title: "Behind the scenes",
    subtitle: "Build trust",
  },
  {
    title: "Offer spotlight",
    subtitle: "Soft sell",
  },
]

export default function QuickStartCard({ onStartNow, productHint }: QuickStartCardProps) {
  useEffect(() => {
    trackAnalyticsEvent({
      event: "feed_planner_quick_start_viewed",
      properties: {
        product_hint: productHint || null,
      },
    }).catch(() => {})
  }, [productHint])

  const hintCopy = useMemo(() => {
    if (!productHint) return null
    return `Use your ${productHint} captions here.`
  }, [productHint])

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-3xl border border-stone-200 bg-white/90 shadow-xl shadow-stone-900/10 p-8 sm:p-12 text-center">
        <p className="text-xs tracking-[0.4em] uppercase text-stone-500">Quick Start</p>
        <h1 className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase text-stone-950">
          Create your first 9-post feed in 2 clicks
        </h1>
        <p className="mt-4 text-sm sm:text-base text-stone-600 font-light">
          See what&apos;s possible with AI-generated captions &amp; images.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {previewItems.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-stone-200 bg-gradient-to-br from-stone-50 via-white to-stone-100 p-3 sm:p-4 text-left"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-stone-500">Preview</p>
              <p className="mt-2 text-sm font-medium text-stone-900">{item.title}</p>
              <p className="mt-1 text-xs text-stone-500 font-light">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {hintCopy && (
          <p className="mt-6 text-xs sm:text-sm text-stone-500 font-light">
            {hintCopy}
          </p>
        )}

        <button
          onClick={() => {
            trackAnalyticsEvent({
              event: "feed_planner_quick_start_clicked",
              properties: {
                product_hint: productHint || null,
              },
            }).catch(() => {})
            onStartNow()
          }}
          className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 bg-stone-950 text-white text-sm uppercase tracking-[0.3em] font-medium hover:bg-stone-800 transition-all"
        >
          Start Now
          <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}
