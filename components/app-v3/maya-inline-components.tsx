"use client"

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
    description: "A connected set in one visual world.",
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
}: {
  aesthetics: Aesthetic[]
  disabled?: boolean
  onPick: (aesthetic: Aesthetic) => void
}) {
  return (
    <div className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#818283]">Choose a visual world</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {aesthetics.slice(0, 6).map(aesthetic => (
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

function nextActionsForFormat(format: OutputFormat): { format: OutputFormat; label: string }[] {
  if (format === "video") {
    return [{ format: "photo", label: "Make another photo" }]
  }
  if (format === "carousel") {
    return [
      { format: "story-sequence", label: "Make stories from this" },
      { format: "reel-cover", label: "Make a cover" },
    ]
  }
  if (format === "reel-cover") {
    return [
      { format: "story-sequence", label: "Make a story from this" },
      { format: "carousel", label: "Make a carousel" },
    ]
  }
  if (format === "story-slide" || format === "story-sequence") {
    return [
      { format: "reel-cover", label: "Make a cover" },
      { format: "carousel", label: "Make a carousel" },
    ]
  }
  return [
    { format: "reel-cover", label: "Turn this into a cover" },
    { format: "story-sequence", label: "Make stories from this" },
    { format: "video", label: "Make it move" },
  ]
}

export function InlineResultActions({
  format,
  onNextFormat,
}: {
  format: OutputFormat
  onNextFormat: (format: OutputFormat, kind: InlineActionKind) => void
}) {
  const actions = nextActionsForFormat(format)
  return (
    <div className="rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#818283]">Next step</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {actions.map(action => (
          <button
            key={action.format}
            type="button"
            onClick={() => onNextFormat(action.format, "next_action")}
            className="min-h-10 rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 py-2 text-[11px] uppercase tracking-[0.12em] text-[#4F5052] transition-colors hover:border-[#0D0E10] hover:text-[#0D0E10]"
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
