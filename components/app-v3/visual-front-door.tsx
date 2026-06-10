"use client"

// SSELFIE Studio 3.0 — Visual Front Door.
// A quiet, editorial grid of Prompt Vault aesthetics. Click a vibe to start (this is the
// decision-fatigue remover). Picking a tile hands off to Maya with the vibe preloaded.
// Design system: light luxury editorial — Seasalt surfaces, Night for contrast, Cormorant
// display, generous spacing, no icons/emojis, no gradients/color.

import { memo } from "react"
import Image from "next/image"
import { AESTHETICS } from "./aesthetics"
import { useConcierge } from "./concierge-context"
import type { Aesthetic } from "./types"

// Memoized + receives onOpen as a STABLE prop, so opening the concierge (which changes the
// concierge context value) does NOT re-render every image tile. Subscribing each tile to the
// context made all tiles re-render on open, a long synchronous commit that tripped INP.
const AestheticTile = memo(function AestheticTile({
  aesthetic,
  index,
  onOpen,
}: {
  aesthetic: Aesthetic
  index: number
  onOpen: (a: Aesthetic) => void
}) {
  // Vary tile height slightly for an editorial, non-uniform masonry rhythm.
  const tall = index % 3 === 0
  return (
    <button
      type="button"
      onClick={() => onOpen(aesthetic)}
      className="group relative block w-full overflow-hidden rounded-[2px] bg-[#FFFFFF] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0D0E10]"
      aria-label={`Start a shoot in the ${aesthetic.name} look`}
    >
      <div className={`relative w-full ${tall ? "aspect-[3/4]" : "aspect-[4/5]"}`}>
        <Image
          src={aesthetic.coverImage}
          alt={aesthetic.name}
          fill
          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0D0E10]/55 via-transparent to-transparent opacity-90" />
        <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5">
          <p className="font-serif text-[18px] sm:text-[20px] font-light leading-tight text-white">
            {aesthetic.name}
          </p>
          <p className="mt-1 text-[12px] leading-snug text-white/80">{aesthetic.blurb}</p>
        </div>
      </div>
    </button>
  )
})

export function VisualFrontDoor() {
  // Subscribe to the context ONCE here, not in every tile. openWithAesthetic is a stable
  // useCallback, so the memoized tiles below never re-render when the concierge opens.
  const { openWithAesthetic } = useConcierge()
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-10 sm:px-8 sm:py-16">
      <header className="mb-8 sm:mb-12">
        <p className="text-[10px] uppercase tracking-[0.34em] text-[#818283]">SSELFIE Studio</p>
        <h1 className="mt-3 font-serif text-[34px] sm:text-[46px] font-light leading-[1.05] text-[#0D0E10]">
          Pick a vibe to begin.
        </h1>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-[#4F5052]">
          Choose the look you want. Maya takes it from there: one selfie becomes a full brand shoot.
        </p>
        <p className="mt-4 max-w-xl text-[12px] leading-relaxed text-[#818283]">
          Included in SSELFIE SUITE: monthly credits · AI brand shoots · Maya guidance · gallery · feed planning
        </p>
      </header>

      {/* Editorial masonry: CSS columns for an organic, Pinterest-style flow. */}
      <div className="[column-fill:_balance] columns-2 gap-3 sm:columns-3 sm:gap-4 lg:columns-4">
        {AESTHETICS.map((aesthetic, i) => (
          <div key={aesthetic.id} className="mb-3 break-inside-avoid sm:mb-4">
            <AestheticTile aesthetic={aesthetic} index={i} onOpen={openWithAesthetic} />
          </div>
        ))}
      </div>
    </section>
  )
}
