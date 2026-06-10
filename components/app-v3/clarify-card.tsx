"use client"

// SSELFIE Studio 3.0 — inline clarify card (MAYA-REBUILD-05 Phase G).
// The Content Requirements Engine surface: when Maya is missing one required detail (e.g. the
// reel topic), she asks here with tappable options instead of generating something generic or
// dropping the user into a form. Tapping an option answers Maya and she continues to concepts.

import type { ClarifyPrompt } from "@/lib/app-v3/maya/concept-types"

interface ClarifyCardProps {
  clarify: ClarifyPrompt
  onPick: (answer: string) => void
  onFreeText?: () => void
  disabled?: boolean
}

export function ClarifyCard({ clarify, onPick, onFreeText, disabled }: ClarifyCardProps) {
  return (
    <div className="rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4">
      <p className="text-[15px] leading-relaxed text-[#282728]">{clarify.question}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {clarify.options.map((o) => (
          <button
            key={o}
            type="button"
            disabled={disabled}
            onClick={() => onPick(o)}
            className="rounded-full border border-[#C5C6C8]/70 bg-white px-3.5 py-2 text-[13px] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10] disabled:opacity-40"
          >
            {o}
          </button>
        ))}
      </div>
      {clarify.allowFreeText && onFreeText && (
        <button
          type="button"
          onClick={onFreeText}
          className="mt-3 text-[12px] text-[#818283] underline underline-offset-2 hover:text-[#4F5052]"
        >
          Or tell me in your own words
        </button>
      )}
    </div>
  )
}
