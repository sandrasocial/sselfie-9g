"use client"

import Image from "next/image"

import type { FeedVisualDirectionMode } from "@/lib/feed-planner/visual-direction"

const MAYA_PREVIEW_TONES = [
  "bg-[color:var(--calendar-stone-3)]",
  "bg-[color:var(--ss-seasalt)]",
  "bg-[color:var(--ss-gray)]",
  "bg-[color:var(--calendar-stone-1)]",
  "bg-[color:var(--ss-silver)]",
  "bg-[color:var(--ss-davy)]",
] as const

export interface CalendarDirectionOption {
  mode: FeedVisualDirectionMode
  label: string
  help?: string
}

interface CalendarDirectionOptionsProps {
  options: readonly CalendarDirectionOption[]
  selectedMode?: FeedVisualDirectionMode | null
  onSelect: (mode: FeedVisualDirectionMode) => void
  curatedPreviewUrl?: string | null
  inspirationImageUrl?: string | null
  compact?: boolean
}

function DirectionPreview({
  mode,
  curatedPreviewUrl,
  inspirationImageUrl,
}: {
  mode: FeedVisualDirectionMode
  curatedPreviewUrl?: string | null
  inspirationImageUrl?: string | null
}) {
  if (mode === "curated" && curatedPreviewUrl) {
    return (
      <Image
        src={curatedPreviewUrl}
        alt=""
        fill
        sizes="320px"
        className="object-cover object-top"
      />
    )
  }

  if (mode === "inspiration" && inspirationImageUrl) {
    return (
      <Image
        src={inspirationImageUrl}
        alt=""
        fill
        sizes="320px"
        className="object-cover object-top"
      />
    )
  }

  if (mode === "maya") {
    return (
      <span className="grid h-full grid-cols-3 gap-1 p-2" aria-hidden>
        {MAYA_PREVIEW_TONES.map((tone, index) => (
          <span
            key={tone}
            className={`relative overflow-hidden rounded-[4px] ${tone} ${
              index === 0 || index === 4 ? "row-span-2" : ""
            }`}
          >
            {index === 0 || index === 4 ? (
              <>
                <span className="absolute left-1/2 top-[20%] h-3 w-3 -translate-x-1/2 rounded-full bg-white/75" />
                <span className="absolute bottom-0 left-1/2 h-7 w-7 -translate-x-1/2 rounded-t-full bg-white/60" />
              </>
            ) : null}
          </span>
        ))}
      </span>
    )
  }

  if (mode === "curated") {
    return (
      <span className="grid h-full grid-cols-3 gap-1 p-2" aria-hidden>
        <span className="rounded-[4px] bg-[color:var(--ss-night)]" />
        <span className="rounded-[4px] bg-[color:var(--calendar-stone-3)]" />
        <span className="rounded-[4px] bg-[color:var(--ss-seasalt)]" />
        <span className="rounded-[4px] bg-[color:var(--calendar-stone-4)]" />
        <span className="rounded-[4px] bg-[color:var(--ss-davy)]" />
        <span className="rounded-[4px] bg-[color:var(--app-glass-border)]" />
      </span>
    )
  }

  if (mode === "inspiration") {
    return (
      <span className="relative block h-full overflow-hidden p-2" aria-hidden>
        <span className="absolute left-[12%] top-[18%] h-[58%] w-[38%] -rotate-6 rounded-[5px] border border-[color:var(--ss-silver)] bg-white shadow-sm" />
        <span className="absolute right-[12%] top-[10%] h-[62%] w-[42%] rotate-3 rounded-[5px] bg-[color:var(--calendar-stone-4)] shadow-sm" />
        <span className="absolute bottom-[10%] left-[31%] h-[45%] w-[38%] rounded-[5px] bg-[color:var(--ss-davy)] shadow-sm" />
      </span>
    )
  }

  return (
    <span className="flex h-full items-center gap-3 px-4" aria-hidden>
      <span className="font-serif text-[34px] font-light leading-none text-[color:var(--ss-night)]">
        Aa
      </span>
      <span className="min-w-0 flex-1 space-y-2">
        <span className="block h-px w-full bg-[color:var(--ss-davy)]" />
        <span className="block h-px w-4/5 bg-[color:var(--ss-gray)]" />
        <span className="flex gap-1.5 pt-1">
          <span className="h-3 w-3 rounded-full bg-[color:var(--ss-night)]" />
          <span className="h-3 w-3 rounded-full bg-[color:var(--ss-silver)]" />
          <span className="h-3 w-3 rounded-full border border-[color:var(--ss-silver)] bg-white" />
        </span>
      </span>
    </span>
  )
}

export function CalendarDirectionOptions({
  options,
  selectedMode = null,
  onSelect,
  curatedPreviewUrl = null,
  inspirationImageUrl = null,
  compact = false,
}: CalendarDirectionOptionsProps) {
  return (
    <div className={`grid gap-2 ${compact ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-2"}`}>
      {options.map(option => {
        const selected = selectedMode === option.mode
        return (
          <button
            key={option.mode}
            type="button"
            aria-pressed={selected}
            onClick={() => onSelect(option.mode)}
            className={`group overflow-hidden rounded-[14px] border text-left transition-[border-color,background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] focus-visible:ring-offset-2 ${
              selected
                ? "border-[color:var(--ss-night)] bg-white shadow-[0_10px_24px_rgba(13,14,16,0.08)]"
                : "border-[color:var(--ss-silver)] bg-white/75 hover:border-[color:var(--ss-gray)]"
            }`}
          >
            <span
              data-direction-preview
              className={`relative block overflow-hidden border-b border-[color:var(--ss-silver)] bg-[color:var(--calendar-stone-1)] ${
                compact ? "h-16" : "h-24"
              }`}
            >
              <DirectionPreview
                mode={option.mode}
                curatedPreviewUrl={curatedPreviewUrl}
                inspirationImageUrl={inspirationImageUrl}
              />
            </span>
            <span className={`block ${compact ? "p-2.5" : "p-3.5"}`}>
              <span
                className={`block font-medium text-[color:var(--ss-night)] ${
                  compact ? "text-[11px] leading-snug" : "text-[14px]"
                }`}
              >
                {option.label}
              </span>
              {option.help ? (
                <span className="mt-1.5 block text-[11px] leading-relaxed text-[color:var(--app-text-secondary)]">
                  {option.help}
                </span>
              ) : null}
            </span>
          </button>
        )
      })}
    </div>
  )
}
