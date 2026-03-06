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
      <div className="w-full max-w-3xl bg-[rgba(175,170,162,0.10)] backdrop-blur-[50px] border border-[rgba(195,190,182,0.25)] rounded-2xl p-8 sm:p-12 text-center">
        <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">Quick Start</p>
        <h1 className="mt-4 font-['Cormorant_Garamond'] text-2xl sm:text-3xl md:text-4xl font-light tracking-[0.2em] uppercase text-[#f0ede8]">
          Create your first 9-post feed in 2 clicks
        </h1>
        <p className="mt-4 text-sm sm:text-base text-[#8a8780] font-light">
          See what&apos;s possible with AI-generated captions &amp; images.
        </p>

        <div className="mt-8 grid grid-cols-3 gap-3 sm:gap-4">
          {previewItems.map((item) => (
            <div
              key={item.title}
              className="rounded-xl border border-[rgba(195,190,182,0.15)] bg-[rgba(175,170,162,0.08)] p-3 sm:p-4 text-left"
            >
              <p className="font-['Inter'] text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">Preview</p>
              <p className="mt-2 text-sm font-medium text-[#f0ede8]">{item.title}</p>
              <p className="mt-1 text-xs text-[#8a8780] font-light">{item.subtitle}</p>
            </div>
          ))}
        </div>

        {hintCopy && (
          <p className="mt-6 text-xs sm:text-sm text-[#8a8780] font-light">
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
          className="mt-8 bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors inline-flex items-center justify-center gap-2"
        >
          Start Now
        </button>
      </div>
    </div>
  )
}
