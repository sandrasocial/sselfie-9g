"use client"

import { useState } from "react"
import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MembershipHomeCardProps {
  creditsReady: number
  lastSessionTitle?: string | null
  monthlyDropName?: string | null
  onContinue: () => void
  onGeneratePhoto: () => void
  onBrowseStyles: () => void
  onUploadAssets?: () => void
  onExploreMonthlyDrop?: () => void
}

export default function MembershipHomeCard({
  creditsReady,
  lastSessionTitle,
  monthlyDropName,
  onContinue,
  onGeneratePhoto,
  onBrowseStyles,
  onUploadAssets,
  onExploreMonthlyDrop,
}: MembershipHomeCardProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const normalizedCredits = Math.max(0, Math.round(creditsReady))
  const safeLastSessionTitle =
    typeof lastSessionTitle === "string" && lastSessionTitle.trim().length > 0
      ? lastSessionTitle.trim()
      : "Your last Maya chat"
  const hasMonthlyDrop = typeof monthlyDropName === "string" && monthlyDropName.trim().length > 0

  return (
    <div className="w-full max-w-xl">
      <MayaInlineCard
        eyebrow="Studio"
        title="Pick up where you left off"
        subtitle="One clear action below. Everything else stays one tap away."
        surface="plain"
        actionsLayout="column"
        aside={<MayaInlinePill tone="muted">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actions={
          <>
            <MayaInlineAction onClick={onGeneratePhoto} variant="primary" className="w-full">
              Create a post
            </MayaInlineAction>
            <div className="w-full max-w-md border-t border-[rgba(195,190,182,0.12)] pt-4 mt-2">
              <button
                type="button"
                onClick={() => setMoreOpen((o) => !o)}
                className="flex w-full items-center justify-between py-2 text-left text-[11px] uppercase tracking-[0.16em] text-[color:var(--color-smoke)] hover:text-[color:var(--color-porcelain)] transition-colors"
                aria-expanded={moreOpen}
              >
                <span>{moreOpen ? "Hide" : "More options"}</span>
                <span className="text-[#8a8780] tabular-nums">{moreOpen ? "−" : "+"}</span>
              </button>
              {moreOpen ? (
                <div className="mt-1 flex flex-col border-t border-[rgba(195,190,182,0.08)]">
                  <MayaInlineAction onClick={onBrowseStyles} variant="ghost">
                    Browse styles
                  </MayaInlineAction>
                  {onUploadAssets ? (
                    <MayaInlineAction onClick={onUploadAssets} variant="ghost">
                      Upload brand assets
                    </MayaInlineAction>
                  ) : null}
                </div>
              ) : null}
            </div>
          </>
        }
      >
        <div className="space-y-0 border-t border-[rgba(195,190,182,0.12)] pt-6">
          <div className="flex flex-col gap-4 border-b border-[rgba(195,190,182,0.1)] pb-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
            <div className="min-w-0 flex-1">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">Continue</div>
              <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-porcelain)]">{safeLastSessionTitle}</p>
            </div>
            <MayaInlineAction onClick={onContinue} variant="secondary" className="shrink-0 w-full sm:w-auto">
              Open chat
            </MayaInlineAction>
          </div>

          {hasMonthlyDrop ? (
            <div className="flex flex-col gap-4 border-b border-[rgba(195,190,182,0.1)] py-5 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)]">This month</div>
                <p className="mt-2 text-sm leading-relaxed text-[color:var(--color-porcelain)]">{monthlyDropName}</p>
              </div>
              <MayaInlineAction
                onClick={onExploreMonthlyDrop ?? onBrowseStyles}
                variant="secondary"
                className="shrink-0 w-full sm:w-auto"
              >
                Open in Academy
              </MayaInlineAction>
            </div>
          ) : null}

          <div className="pt-5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[color:var(--color-smoke)] mb-3">How it works</div>
            <ol className="space-y-0 text-sm leading-relaxed text-[color:var(--text-accent)]">
              {[
                "You ask for what you need in the bar below.",
                "I draft it here so you can review in one place.",
                "Save or share when it feels right.",
              ].map((line, i) => (
                <li
                  key={line}
                  className="border-b border-[rgba(195,190,182,0.08)] py-3 first:pt-0 flex gap-3"
                >
                  <span className="w-5 shrink-0 text-[color:var(--color-smoke)] tabular-nums">{i + 1}.</span>
                  <span className="text-[color:var(--color-porcelain)]">{line}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
