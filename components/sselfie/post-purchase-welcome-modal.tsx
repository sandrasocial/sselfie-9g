"use client"

import { useEffect, useState } from "react"

const PRODUCT_COPY: Record<string, { heading: string; body: string; cta: string }> = {
  sselfie_studio_membership: {
    heading: "Welcome to The Studio.",
    body: "Your 200 credits are ready. Tell Maya what to create — she already knows your brand.",
    cta: "Let's make my first photo",
  },
  paid_blueprint: {
    heading: "Your Feed Planner is ready.",
    body: "60 credits loaded. Ready to build your first 9-post grid? It takes 2 minutes.",
    cta: "Generate my first feed",
  },
  selfie_guide: {
    heading: "Your Selfie Guide is here.",
    body: "Start with Day 1 — five minutes that will change how you show up on camera.",
    cta: "Open my guide",
  },
  selfie_guide_bundle: {
    heading: "Your Selfie Guide Bundle is ready.",
    body: "Everything's unlocked. Start with the guide or jump straight into the exercises.",
    cta: "Open my bundle",
  },
  brand_strategy_pack: {
    heading: "Your Brand Strategy is generating.",
    body: "Maya's working on it now. You'll get your full strategy in a few minutes.",
    cta: "See my strategy",
  },
  one_time_session: {
    heading: "Your credits are loaded.",
    body: "Ready when you are. Tell Maya what brand photo you want to create today.",
    cta: "Start creating",
  },
}

interface PostPurchaseWelcomeModalProps {
  productType: string
  onDismiss: () => void
}

export function PostPurchaseWelcomeModal({ productType, onDismiss }: PostPurchaseWelcomeModalProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // Slight delay so the app is fully loaded before the modal appears
    const t = setTimeout(() => setVisible(true), 600)
    return () => clearTimeout(t)
  }, [])

  const copy = PRODUCT_COPY[productType] ?? {
    heading: "You\u2019re in.",
    body: "Your purchase is confirmed and your access is ready.",
    cta: "Get started",
  }

  const handleDismiss = async () => {
    try {
      await fetch("/api/user/pending-welcome", { method: "DELETE" })
    } catch {
      // non-critical — flag will persist until next clear
    }
    onDismiss()
  }

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[rgba(13,12,11,0.85)] backdrop-blur-sm p-4 animate-fade-in">
      <div className="relative w-full max-w-sm bg-[rgba(28,27,25,0.97)] border border-[rgba(195,190,182,0.25)] backdrop-blur-[70px] rounded-2xl p-6 sm:p-8">
        {/* Subtle accent */}
        <div className="w-8 h-[1px] bg-[rgba(195,190,182,0.5)] mb-6" />

        <h2 className="font-['Cormorant_Garamond'] font-light text-2xl sm:text-3xl tracking-[0.15em] uppercase text-[#f0ede8] mb-3">
          {copy.heading}
        </h2>

        <p className="text-[#8a8780] font-['Inter'] text-sm leading-relaxed mb-8">
          {copy.body}
        </p>

        <div className="space-y-3">
          <button
            onClick={handleDismiss}
            className="w-full bg-[#c8c4bb] text-[#0d0c0b] px-6 py-3 rounded-full font-['Inter'] text-xs font-medium uppercase tracking-[0.15em] hover:bg-[#f0ede8] transition-all"
          >
            {copy.cta}
          </button>
          <button
            onClick={handleDismiss}
            className="w-full text-[#8a8780] hover:text-[#f0ede8] px-6 py-3 font-['Inter'] text-xs font-light tracking-[0.15em] uppercase transition-colors"
          >
            I\u2019ll explore on my own
          </button>
        </div>
      </div>
    </div>
  )
}
