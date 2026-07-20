"use client"

// SSELFIE Studio 3.0 - trial-cap conversion moment (TRIAL-CAP-01).
// When a TRIAL user is blocked (trial credits used up, or the trial expired mid-session),
// this replaces the dead credits error with the membership offer at the moment of maximum
// demonstrated value. Her own generated photos are the proof ("look what you made this
// week"); the CTA carries trial_cap attribution. Styling mirrors credit-modal.tsx
// (light editorial, rounded, App v3 palette).

import { useEffect, useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"
import { useAccessibleModal } from "./use-accessible-modal"

export const TRIAL_CAP_CHECKOUT_URL =
  "/checkout/membership?interval=month&checkout_source=trial_cap&utm_source=app&utm_medium=in_app&utm_campaign=trial_cap_upgrade"

interface TrialCapOfferProps {
  open: boolean
  onClose: () => void
}

export function TrialCapOffer({ open, onClose }: TrialCapOfferProps) {
  // Her most recent generated photos: the proof the offer stands on.
  const [images, setImages] = useState<string[]>([])
  const { dialogRef, initialFocusRef } = useAccessibleModal(open, onClose)

  useEffect(() => {
    if (!open) return
    void trackAnalyticsEvent({
      event: "trial_cap_offer_shown",
      properties: { source: "maya_concierge" },
    })
    fetch("/api/app-v3/gallery")
      .then(r => r.json())
      .then((d: { images?: string[] } | null) => {
        if (Array.isArray(d?.images)) setImages(d.images.filter(Boolean).slice(0, 4))
      })
      .catch(() => {
        // Proof grid is best-effort; the offer still reads without it.
      })
  }, [open])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="trial-cap-title"
        className="w-full max-w-sm rounded-[10px] bg-[#F8FAFA] p-5 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none sm:p-7"
      >
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">SSELFIE Suite</p>
        <h3 id="trial-cap-title" className="mt-3 font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
          Look what you made this week
        </h3>
        {images.length > 0 && (
          <div className="mt-4 grid grid-cols-4 gap-1.5">
            {images.map(url => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={url}
                src={url}
                alt=""
                loading="lazy"
                className="aspect-[3/4] w-full rounded-[6px] object-cover"
              />
            ))}
          </div>
        )}
        <p className="mt-4 text-[14px] leading-relaxed text-[#4F5052]">
          That was your trial. Every photo started from your selfie, and it&apos;s still you.
          Members get 100 credits a month, so Maya keeps creating with you. Cancel anytime.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href={TRIAL_CAP_CHECKOUT_URL}
            onClick={() =>
              void trackAnalyticsEvent({
                event: "trial_cap_offer_cta_click",
                properties: { source: "maya_concierge" },
              })
            }
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-[#0D0E10] px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-white"
          >
            Keep creating with Maya
          </a>
          <button
            ref={initialFocusRef}
            type="button"
            onClick={onClose}
            className="min-h-11 px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Not now
          </button>
        </div>
      </div>
    </div>
  )
}
