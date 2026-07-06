"use client"

import { useState } from "react"
import Image from "next/image"
import type { Aesthetic, AestheticShot, InlineActionKind, OutputFormat } from "./types"

export type InlineFormatOption = {
  format: OutputFormat
  label: string
  description: string
}

export const SIMPLE_FORMAT_OPTIONS: InlineFormatOption[] = [
  {
    format: "photo",
    label: "A photo",
    description: "One image you can use for your profile, post, or page.",
  },
  {
    format: "photoshoot",
    label: "A full shoot",
    description: "A connected set with the same style.",
  },
  {
    format: "reel-cover",
    label: "A reel cover",
    description: "A clear cover image for one idea.",
  },
  {
    format: "carousel",
    label: "A carousel",
    description: "Turn one idea into a simple slide flow.",
  },
  {
    format: "story-sequence",
    label: "Stories",
    description: "A short sequence for a thought, offer, or moment.",
  },
  {
    format: "video",
    label: "Motion",
    description: "Make one finished photo move.",
  },
]

export function InlineFormatChoice({
  options = SIMPLE_FORMAT_OPTIONS,
  disabled,
  onPick,
}: {
  options?: InlineFormatOption[]
  disabled?: boolean
  onPick: (format: OutputFormat) => void
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Choose one path</p>
      <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
        Pick what you need. Maya will only ask for the next detail.
      </p>
      <div className="mt-3 grid grid-cols-1 gap-2">
        {options.map(option => (
          <button
            key={option.format}
            type="button"
            disabled={disabled}
            onClick={() => onPick(option.format)}
            className="min-h-14 rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] px-3.5 py-3 text-left transition-colors hover:border-[#0D0E10] disabled:opacity-45"
          >
            <span className="block text-[13px] font-medium text-[#0D0E10]">{option.label}</span>
            <span className="mt-1 block text-[12px] leading-relaxed text-[#6D6E70]">
              {option.description}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}

export function InlineSelfieUpload({
  title = "Add one clear selfie",
  description = "Maya needs one real photo of you so the result still looks like you.",
  uploading,
  onUpload,
  onUseExisting,
}: {
  title?: string
  description?: string
  uploading?: boolean
  onUpload: () => void
  onUseExisting?: () => void
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#0D0E10]/20 bg-[#0D0E10]/[0.03] p-4 [overflow-x:clip]">
      <p className="font-serif text-[18px] font-light leading-tight text-[#0D0E10]">{title}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">{description}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onUpload}
          disabled={uploading}
          className="min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-60"
        >
          {uploading ? "Uploading..." : "Upload selfie"}
        </button>
        {onUseExisting && (
          <button
            type="button"
            onClick={onUseExisting}
            className="min-h-11 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:border-[#0D0E10]/40"
          >
            Use existing
          </button>
        )}
      </div>
    </div>
  )
}

export function InlineVibePicker({
  aesthetics,
  disabled,
  onPick,
  onUseInspiration,
  onLetMayaDecide,
}: {
  aesthetics: Aesthetic[]
  disabled?: boolean
  onPick: (aesthetic: Aesthetic) => void
  onUseInspiration?: () => void
  onLetMayaDecide?: () => void
}) {
  const [showAllStyles, setShowAllStyles] = useState(false)
  const visibleAesthetics = showAllStyles ? aesthetics : aesthetics.slice(0, 6)
  const hasMoreStyles = aesthetics.length > 6

  return (
    <div className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[color:var(--ss-gray)]">
        Choose your style
      </p>
      <p className="mt-2 text-[12px] leading-relaxed text-[color:var(--ss-davy)]">
        Pick the look you want Maya to follow. You can also add an inspiration image if you want her
        to use a pose, light, or vibe.
      </p>
      {(onUseInspiration || onLetMayaDecide) && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {onUseInspiration && (
            <button
              type="button"
              disabled={disabled}
              onClick={onUseInspiration}
              className="min-h-16 rounded-[6px] border border-[color:var(--ss-silver)]/70 bg-[color:var(--ss-seasalt)] px-3 py-3 text-left transition-colors hover:border-[color:var(--ss-night)] disabled:opacity-45"
            >
              <span className="block text-[12px] font-medium text-[color:var(--ss-night)]">
                Use my inspiration
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-[color:var(--ss-davy)]">
                Add a photo for pose, light, styling, or mood.
              </span>
            </button>
          )}
          {onLetMayaDecide && (
            <button
              type="button"
              disabled={disabled}
              onClick={onLetMayaDecide}
              className="min-h-16 rounded-[6px] border border-[color:var(--ss-night)]/30 bg-white px-3 py-3 text-left transition-colors hover:border-[color:var(--ss-night)] disabled:opacity-45"
            >
              <span className="block text-[12px] font-medium text-[color:var(--ss-night)]">
                Let Maya decide
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-[color:var(--ss-davy)]">
                Maya will pull 2-3 strong style options from your profile.
              </span>
            </button>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {visibleAesthetics.map(aesthetic => (
          <button
            key={aesthetic.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(aesthetic)}
            className="group overflow-hidden rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] text-left disabled:opacity-45"
          >
            <div className="relative aspect-[4/5] bg-[#E9EAEB]">
              {aesthetic.coverImage && (
                <Image
                  src={aesthetic.coverImage}
                  alt=""
                  fill
                  sizes="160px"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
              )}
            </div>
            <p className="truncate px-2.5 py-2 text-[12px] text-[#0D0E10]">{aesthetic.name}</p>
          </button>
        ))}
      </div>
      {hasMoreStyles && (
        <button
          type="button"
          onClick={() => setShowAllStyles(v => !v)}
          className="mt-3 min-h-10 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ss-davy)] underline underline-offset-4 transition-colors hover:text-[color:var(--ss-night)]"
        >
          {showAllStyles ? "Show fewer styles" : `Show all ${aesthetics.length} styles`}
        </button>
      )}
    </div>
  )
}

export function InlineShotPicker({
  shots,
  disabled,
  onPick,
}: {
  shots: AestheticShot[]
  disabled?: boolean
  onPick: (shot: AestheticShot) => void
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Choose the shot</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {shots.slice(0, 8).map((shot, index) => (
          <button
            key={shot.id || `${shot.title}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(shot)}
            className="group overflow-hidden rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] text-left disabled:opacity-45"
          >
            <div className="relative aspect-[4/5] bg-[#E9EAEB]">
              <Image
                src={shot.image}
                alt=""
                fill
                sizes="160px"
                className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
            <p className="line-clamp-2 px-2.5 py-2 text-[12px] leading-snug text-[#0D0E10]">
              {shot.title}
            </p>
          </button>
        ))}
      </div>
    </div>
  )
}

const NEXT_FORMAT_LABELS: Record<OutputFormat, string> = {
  photo: "Photo",
  photoshoot: "Full shoot",
  "reel-cover": "Reel cover",
  carousel: "Carousel",
  "story-slide": "Story",
  "story-sequence": "Stories",
  video: "Motion",
}

export function InlineResultActions({
  format,
  onNextFormat,
}: {
  format: OutputFormat
  onNextFormat: (format: OutputFormat, kind: InlineActionKind) => void
}) {
  const actions = SIMPLE_FORMAT_OPTIONS.map(option => ({
    format: option.format,
    label:
      option.format === format
        ? `Another ${NEXT_FORMAT_LABELS[option.format].toLowerCase()}`
        : NEXT_FORMAT_LABELS[option.format],
  }))

  return (
    <div className="rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--ss-gray)]">
        Keep this style going
      </p>
      <p className="mt-1 text-[12px] leading-relaxed text-[color:var(--ss-davy)]">
        Choose what to make next. Maya will use this result as the style reference and change the
        pose, location, or angle so it does not feel repeated.
      </p>
      <div className="-mx-1 mt-2 flex gap-2 overflow-x-auto px-1 pb-1">
        {actions.map(action => (
          <button
            key={action.format}
            type="button"
            onClick={() => onNextFormat(action.format, "next_action")}
            className="min-h-10 shrink-0 rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
