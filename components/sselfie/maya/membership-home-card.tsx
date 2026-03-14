"use client"

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
  const normalizedCredits = Math.max(0, Math.round(creditsReady))
  const safeLastSessionTitle =
    typeof lastSessionTitle === "string" && lastSessionTitle.trim().length > 0
      ? lastSessionTitle.trim()
      : "Open your latest Maya session"
  const hasMonthlyDrop = typeof monthlyDropName === "string" && monthlyDropName.trim().length > 0

  return (
    <div className="w-full max-w-3xl">
      <MayaInlineCard
        eyebrow="My Studio"
        title="Your studio lives here"
        subtitle="Tell me what you need — I'll build it right here."
        aside={<MayaInlinePill tone="strong">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actions={
          <>
            <MayaInlineAction onClick={onGeneratePhoto} variant="primary">
              Create a post
            </MayaInlineAction>
            <MayaInlineAction onClick={onBrowseStyles}>Browse styles</MayaInlineAction>
          </>
        }
      >
        <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-3">
            <div className="stone-inset-panel rounded-[22px] px-4 py-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Continue</div>
                  <div className="mt-2 text-sm leading-relaxed text-[color:var(--color-porcelain)]">
                    {safeLastSessionTitle}
                  </div>
                </div>
                <MayaInlineAction onClick={onContinue}>Open</MayaInlineAction>
              </div>
            </div>

            {hasMonthlyDrop ? (
              <div className="stone-inset-panel rounded-[22px] px-4 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">This Month</div>
                    <div className="mt-2 text-sm leading-relaxed text-[color:var(--color-porcelain)]">
                      {monthlyDropName}
                    </div>
                  </div>
                  <MayaInlineAction onClick={onExploreMonthlyDrop ?? onBrowseStyles}>Explore</MayaInlineAction>
                </div>
              </div>
            ) : null}

            {/* [STABILIZATION] Calendar panel hidden — content calendar feature not stable */}
            {(onUploadAssets) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {onUploadAssets ? (
                  <div className="stone-inset-panel rounded-[22px] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Assets</div>
                    <div className="mt-2 text-sm text-[color:var(--color-porcelain)]">
                      Drop in product photos or references and I&apos;ll use them in new drafts.
                    </div>
                    <div className="mt-3">
                      <MayaInlineAction onClick={onUploadAssets}>Upload assets</MayaInlineAction>
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="stone-inset-panel rounded-[24px] px-4 py-4">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">How we work</div>
              <MayaInlinePill tone="muted">In chat</MayaInlinePill>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Ask for what you need right now.",
                "Review it right here and tweak fast.",
                "Save or publish when it feels right.",
              ].map((step, index) => (
                <div key={step} className="rounded-[20px] border border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.08)] px-3.5 py-3">
                  <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">
                    0{index + 1}
                  </div>
                  <div className="mt-1 text-sm leading-relaxed text-[color:var(--color-porcelain)]">{step}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </MayaInlineCard>
    </div>
  )
}
