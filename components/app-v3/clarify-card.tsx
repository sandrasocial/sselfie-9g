"use client"

// SSELFIE Studio 3.0 - inline clarify card (MAYA-REBUILD-05 Phase G).
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
  const [firstOption, ...otherOptions] = clarify.options
  const isFormatRecommendation = clarify.kind === "format"
  return (
    <div className="rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4">
      {isFormatRecommendation && (
        <div className="mb-3 border-b border-[#C5C6C8]/45 pb-3">
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#6D6E70]">Maya recommends</p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
            You choose before Maya creates anything.
          </p>
        </div>
      )}
      <p className="text-[15px] leading-relaxed text-[#282728]">{clarify.question}</p>
      {firstOption && (
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick(firstOption)}
          className="mt-3 min-h-11 w-full rounded-[8px] bg-[#0D0E10] px-4 py-3 text-left text-[13px] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {firstOption}
        </button>
      )}
      {isFormatRecommendation && otherOptions.length > 0 ? (
        <div className="mt-2 grid gap-2">
          {otherOptions.map(o => (
            <button
              key={o}
              type="button"
              disabled={disabled}
              onClick={() => onPick(o)}
              className="min-h-11 w-full rounded-[8px] border border-[#C5C6C8]/70 bg-white px-4 py-3 text-left text-[13px] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10] disabled:opacity-40"
            >
              {o}
            </button>
          ))}
        </div>
      ) : otherOptions.length > 0 ? (
        <details className="mt-2 rounded-[8px] border border-[#C5C6C8]/60 bg-[#F8FAFA]">
          <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between px-3.5 text-[12px] text-[#4F5052] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0D0E10]">
            Other options
            <span aria-hidden>+</span>
          </summary>
          <div className="flex flex-wrap gap-2 border-t border-[#C5C6C8]/50 p-3">
            {otherOptions.map(o => (
              <button
                key={o}
                type="button"
                disabled={disabled}
                onClick={() => onPick(o)}
                className="min-h-11 rounded-full border border-[#C5C6C8]/70 bg-white px-3.5 py-2 text-[13px] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10] disabled:opacity-40"
              >
                {o}
              </button>
            ))}
          </div>
        </details>
      ) : null}
      {clarify.allowFreeText && onFreeText && (
        <button
          type="button"
          onClick={onFreeText}
          className="mt-3 inline-flex min-h-11 items-center text-[12px] text-[#6D6E70] underline underline-offset-2 hover:text-[#4F5052]"
        >
          {isFormatRecommendation
            ? "Tell Maya the format you want"
            : "Or tell me in your own words"}
        </button>
      )}
    </div>
  )
}
