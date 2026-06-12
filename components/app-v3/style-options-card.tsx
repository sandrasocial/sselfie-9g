"use client"

// SSELFIE Studio 3.0 — inline text style picker (SUITE-UX-02 slice 6).
// When Maya calls show_style_options, the member sees the overlay styles / carousel design
// systems as visual example cards and taps one instead of imagining them from names.
// Example images are admin-curated (app_v3_style_examples); a style with no example yet
// renders a quiet typographic placeholder so the picker always works.

import type { StyleOption } from "@/lib/app-v3/maya/style-example-store"

interface StyleOptionsCardProps {
  kind: "overlay" | "carousel"
  options: StyleOption[]
  onPick: (option: StyleOption) => void
  disabled?: boolean
}

export function StyleOptionsCard({ kind, options, onPick, disabled }: StyleOptionsCardProps) {
  if (options.length === 0) return null
  return (
    <div className="space-y-2">
      <p className="text-[11px] uppercase tracking-[0.2em] text-[#818283]">
        {kind === "carousel" ? "Tap a carousel style" : "Tap a text style"}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((o) => (
          <button
            key={o.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o)}
            className="group overflow-hidden rounded-[8px] border border-[#C5C6C8]/60 bg-white text-left transition-colors hover:border-[#0D0E10] disabled:opacity-40"
          >
            {o.exampleImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={o.exampleImageUrl}
                alt={`${o.name} example`}
                className="aspect-[4/5] w-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#F5F5F5] px-3">
                <span className="text-center font-serif text-[17px] font-light leading-snug text-[#282728]">
                  {o.name}
                </span>
              </div>
            )}
            <div className="p-2.5">
              <p className="text-[12px] font-medium text-[#0D0E10]">{o.name}</p>
              <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-[#818283]">{o.when}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
