"use client"

import { useEffect, useMemo } from "react"
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
      <div className="w-full max-w-3xl border border-white/15 bg-white/[0.04] backdrop-blur-[20px] p-8 sm:p-12 text-center rounded-[24px]">
        <p className="text-xs tracking-[0.4em] uppercase text-white/55">Quick Start</p>
        <h1 className="mt-4 font-serif text-2xl sm:text-3xl md:text-4xl font-extralight tracking-[0.2em] uppercase text-white">
          Create your first 9-post feed in 2 clicks
        </h1>
        <p className="mt-4 text-sm sm:text-base text-white/65 font-light">
          See what&apos;s possible with AI-generated captions &amp; images.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {previewItems.map((item) => (
            <div
              key={item.title}
              className="rounded-lg border border-white/15 bg-white/[0.04] p-3 sm:p-4 text-left"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-white/50">Preview</p>
              <p className="mt-2 text-sm font-medium text-white">{item.title}</p>
              <p className="mt-1 text-xs text-white/55 font-light">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {hintCopy && (
          <p className="mt-6 text-xs sm:text-sm text-white/55 font-light">
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
          className="mt-8 inline-flex items-center justify-center gap-2 px-8 py-4 bg-white/10 border border-white/20 text-white text-sm uppercase tracking-[0.3em] font-medium hover:bg-white/15 transition-all"
        >
          Start Now
          <span className="text-[10px] uppercase tracking-[0.2em]">Next</span>
        </button>
      </div>
    </div>
  )
}
