"use client"

import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"
import type { MethodDepth } from "@/lib/maya/sselfie-method-content"
import { WEEKLY_THEMES } from "@/lib/maya/sselfie-method-content"

interface MayaWeekPlanCardProps {
  themeId: string
  photoDirection: string
  captionAngles: string[]
  nextAction: string
  methodDepth: MethodDepth
  /** Called when user taps a photo direction to pre-fill the chat input */
  onPhotoDirectionTap?: (direction: string) => void
  /** Called when user taps a caption angle to pre-fill the chat input */
  onCaptionTap?: (captionAngle: string) => void
  /** Called when user wants to start a new weekly plan */
  onReplan?: () => void
}

export function MayaWeekPlanCard({
  themeId,
  photoDirection,
  captionAngles,
  nextAction,
  methodDepth,
  onPhotoDirectionTap,
  onCaptionTap,
  onReplan,
}: MayaWeekPlanCardProps) {
  const theme = WEEKLY_THEMES.find((t) => t.id === themeId)
  const themeLabel = theme?.label ?? themeId.replace(/_/g, " ")
  const methodInsight = theme?.methodInsight

  const showMethodInsight = methodDepth !== "teaser" && !!methodInsight
  const showUpsell = methodDepth === "teaser"

  return (
    <MayaInlineCard
      eyebrow="Weekly Plan"
      title={themeLabel}
      subtitle={theme?.description}
    >
      {/* Photo direction */}
      <div className="space-y-3">
        <p className="label-small text-[color:var(--color-smoke)]">Photo direction</p>
        <button
          type="button"
          onClick={() => onPhotoDirectionTap?.(photoDirection)}
          className="w-full text-left rounded-lg border border-[rgba(195,190,182,0.18)] bg-[rgba(175,170,162,0.06)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--text-accent)] transition-colors hover:bg-[rgba(175,170,162,0.12)] hover:text-[color:var(--color-porcelain)]"
        >
          {photoDirection}
          {onPhotoDirectionTap && (
            <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-smoke)] opacity-60">
              → create
            </span>
          )}
        </button>
      </div>

      {/* Caption angles */}
      {captionAngles.length > 0 && (
        <div className="mt-5 space-y-3">
          <p className="label-small text-[color:var(--color-smoke)]">Caption angles</p>
          <div className="space-y-2">
            {captionAngles.map((angle, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onCaptionTap?.(angle)}
                className="w-full text-left rounded-lg border border-[rgba(195,190,182,0.18)] bg-[rgba(175,170,162,0.06)] px-4 py-3 text-[14px] leading-relaxed text-[color:var(--text-accent)] transition-colors hover:bg-[rgba(175,170,162,0.12)] hover:text-[color:var(--color-porcelain)]"
              >
                {angle}
                {onCaptionTap && (
                  <span className="ml-2 text-[10px] uppercase tracking-[0.14em] text-[color:var(--color-smoke)] opacity-60">
                    → write
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Next action */}
      {nextAction && (
        <div className="mt-5 border-l-2 border-[rgba(195,190,182,0.28)] pl-4">
          <p className="label-small text-[color:var(--color-smoke)]">Next action</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-[color:var(--color-porcelain)]">
            {nextAction}
          </p>
        </div>
      )}

      {/* Method insight (full / full_plus_execution) */}
      {showMethodInsight && (
        <blockquote className="mt-6 border-l-2 border-[rgba(195,190,182,0.20)] pl-4 italic">
          <p className="text-[13px] leading-relaxed text-[color:var(--text-accent)] opacity-80">
            {methodInsight}
          </p>
        </blockquote>
      )}

      {/* Teaser upsell for free / Starter Kit users */}
      {showUpsell && (
        <div className="mt-6 flex items-center gap-3">
          <MayaInlinePill tone="muted">Method insight locked</MayaInlinePill>
          <a
            href="/masterclass"
            className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-smoke)] underline underline-offset-2 hover:text-[color:var(--color-porcelain)] transition-colors"
          >
            Unlock with Masterclass →
          </a>
        </div>
      )}

      {/* Replan action */}
      {onReplan && (
        <div className="mt-6 flex flex-wrap gap-2.5">
          <MayaInlineAction variant="ghost" onClick={onReplan}>
            Plan this week differently
          </MayaInlineAction>
        </div>
      )}
    </MayaInlineCard>
  )
}
