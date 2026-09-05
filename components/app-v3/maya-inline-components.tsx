"use client"

import { useState } from "react"
import Image from "next/image"
import type { Aesthetic, AestheticShot, ShotDirectorMode } from "./types"

export function InlineProjectStart({
  disabled,
  onStart,
}: {
  disabled?: boolean
  onStart: () => void
}) {
  return (
    <div className="min-w-0 overflow-hidden rounded-[12px] border border-[#AEB9C1]/70 bg-[#FCFDFD] shadow-[0_16px_40px_rgba(37,44,49,0.08)]">
      <div className="border-b border-[#E3E8EB] bg-[#F4F7F8] px-5 py-3.5">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#5D6A73]">Your next post</p>
      </div>
      <div className="p-5">
        <p className="font-serif text-[25px] font-light leading-[1.05] text-[color:var(--ss-night)]">
          Start with one real idea.
        </p>
        <p className="mt-2 max-w-md text-[14px] leading-relaxed text-[color:var(--ss-davy)]">
          Maya recommends one format. You confirm it, then she creates the visual and helps you
          finish the words.
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={onStart}
          className="mt-4 min-h-12 w-full rounded-[7px] bg-[color:var(--ss-night)] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-white transition-colors hover:bg-[color:var(--ss-raisin)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ss-night)] focus-visible:ring-offset-2 disabled:opacity-45"
        >
          Create my next post
        </button>
        <p className="mt-3 text-[12px] leading-relaxed text-[#5D6A73]">
          Already know what you want? Tell Maya in your own words.
        </p>
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
      {/* The trust line lives AT the button, not in copy she scrolled past: handing over her
          face is the app's biggest ask (No-Fake doctrine - identity safety at the moment of fear). */}
      <p className="mt-2 text-[12px] leading-relaxed text-[#6D6E70]">
        Your selfie stays yours. Maya only uses it to keep your real face in every photo.
      </p>
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
                Get Maya&apos;s recommendation
              </span>
              <span className="mt-1 block text-[11px] leading-relaxed text-[color:var(--ss-davy)]">
                Maya recommends the strongest SSELFIE look for what you&apos;re making.
              </span>
            </button>
          )}
        </div>
      )}
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {visibleAesthetics.map(aesthetic => (
          <button
            key={aesthetic.id}
            type="button"
            disabled={disabled}
            onClick={() => onPick(aesthetic)}
            className="group overflow-hidden rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] text-left disabled:opacity-45"
          >
            <div className="relative aspect-[3/4] bg-[#E9EAEB]">
              {aesthetic.coverImage && (
                <Image
                  src={aesthetic.coverImage}
                  alt=""
                  fill
                  sizes="(max-width: 640px) 30vw, 120px"
                  className="object-contain"
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
          className="mt-3 min-h-11 text-[11px] uppercase tracking-[0.16em] text-[color:var(--ss-davy)] underline underline-offset-4 transition-colors hover:text-[color:var(--ss-night)]"
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
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#6D6E70]">Choose the shot</p>
      <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
        {shots.slice(0, 8).map((shot, index) => (
          <button
            key={shot.id || `${shot.title}-${index}`}
            type="button"
            disabled={disabled}
            onClick={() => onPick(shot)}
            className="group overflow-hidden rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] text-left disabled:opacity-45"
          >
            <div className="relative aspect-[3/4] bg-[#E9EAEB]">
              <Image
                src={shot.image}
                alt=""
                fill
                sizes="(max-width: 640px) 30vw, 120px"
                className="object-contain"
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

export function InlineShotDirectorCard({
  aestheticName,
  shot,
  disabled,
  onBack,
  onPick,
}: {
  aestheticName: string
  shot: AestheticShot
  disabled?: boolean
  onBack: () => void
  onPick: (mode: ShotDirectorMode, requestedShotCount: 6 | 8 | 9) => void
}) {
  const [shootMode, setShootMode] =
    useState<Extract<ShotDirectorMode, "collection-shoot" | "new-shoot">>("collection-shoot")
  const [shotCount, setShotCount] = useState<6 | 8 | 9>(6)
  const counts: Array<6 | 8 | 9> = [6, 8, 9]

  return (
    <div className="min-w-0 rounded-[8px] border border-[#C5C6C8]/60 bg-white p-4 [overflow-x:clip]">
      <p className="text-[10px] uppercase tracking-[0.22em] text-[#6D6E70]">Choose the next step</p>
      <div className="mt-3 flex gap-3">
        <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-[6px] bg-[#E9EAEB]">
          <Image src={shot.image} alt="" fill sizes="80px" className="object-contain" />
        </div>
        <div className="min-w-0">
          <p className="font-serif text-[20px] font-light leading-tight text-[#0D0E10]">
            {shot.title}
          </p>
          <p className="mt-1 text-[12px] leading-relaxed text-[#6D6E70]">
            {aestheticName}. Maya can recreate it, pull more angles, or turn it into a full shoot.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-2">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick("recreate-shot", 6)}
          className="min-h-14 rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] px-3.5 py-3 text-left transition-colors hover:border-[#0D0E10] disabled:opacity-45"
        >
          <span className="block text-[13px] font-medium text-[#0D0E10]">Recreate this shot</span>
          <span className="mt-1 block text-[12px] leading-relaxed text-[#6D6E70]">
            One close version with your selfie. 1 credit.
          </span>
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick("more-angles", 6)}
          className="min-h-14 rounded-[6px] border border-[#C5C6C8]/70 bg-[#F8FAFA] px-3.5 py-3 text-left transition-colors hover:border-[#0D0E10] disabled:opacity-45"
        >
          <span className="block text-[13px] font-medium text-[#0D0E10]">
            More angles of this look
          </span>
          <span className="mt-1 block text-[12px] leading-relaxed text-[#6D6E70]">
            Three options with the same styling, but different pose and crop. 3 credits if you make
            all three.
          </span>
        </button>
      </div>

      <div className="mt-4 rounded-[6px] border border-[#C5C6C8]/60 bg-[#F8FAFA] p-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-[#6D6E70]">Full shoot</p>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {[
            {
              mode: "collection-shoot" as const,
              label: "Recreate this collection",
              note: "Use the full Vault shoot as the map.",
            },
            {
              mode: "new-shoot" as const,
              label: "New shoot in this style",
              note: "Keep the style, change the scenes and angles.",
            },
          ].map(option => {
            const selected = shootMode === option.mode
            return (
              <button
                key={option.mode}
                type="button"
                disabled={disabled}
                onClick={() => setShootMode(option.mode)}
                className={`min-h-16 rounded-[5px] border px-3 py-2.5 text-left transition-colors disabled:opacity-45 ${
                  selected
                    ? "border-[#0D0E10] bg-white text-[#0D0E10]"
                    : "border-[#C5C6C8]/70 bg-[#F1F2F2] text-[#4F5052] hover:border-[#0D0E10]/40"
                }`}
              >
                <span className="block text-[12px] font-medium">{option.label}</span>
                <span className="mt-1 block text-[11px] leading-relaxed text-[#6D6E70]">
                  {option.note}
                </span>
              </button>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {counts.map(count => {
            const selected = shotCount === count
            return (
              <button
                key={count}
                type="button"
                disabled={disabled}
                onClick={() => setShotCount(count)}
                className={`min-h-11 rounded-full border px-3.5 text-[11px] uppercase tracking-[0.14em] transition-colors disabled:opacity-45 ${
                  selected
                    ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                    : "border-[#C5C6C8]/70 bg-white text-[#4F5052] hover:border-[#0D0E10]/40"
                }`}
              >
                {count} shots · {count} credits
              </button>
            )
          })}
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={() => onPick(shootMode, shotCount)}
          className="mt-3 min-h-11 rounded-[4px] bg-[#0D0E10] px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-white disabled:opacity-45"
        >
          Plan full shoot
        </button>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="mt-3 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#6D6E70] underline underline-offset-2 hover:text-[#0D0E10]"
      >
        Choose another shot
      </button>
    </div>
  )
}

export function InlineResultActions({ onRefine }: { onRefine: () => void }) {
  return (
    <button
      type="button"
      onClick={onRefine}
      className="group min-h-12 w-full border border-[#0D0E10] bg-white px-4 py-3 text-left transition-colors hover:bg-[#0D0E10] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--ss-night)]"
    >
      <span className="flex items-center justify-between gap-4 text-[11px] uppercase tracking-[0.14em] text-[color:var(--ss-night)] group-hover:text-white">
        Make it more like me <span aria-hidden>→</span>
      </span>
      <span className="mt-1 block text-[12px] leading-relaxed text-[#5D6A73] group-hover:text-white/70">
        Tell Maya what feels off or exactly what you want to change.
      </span>
    </button>
  )
}
