"use client"

import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MembershipHomeCardProps {
  creditsReady: number
  lastSessionTitle?: string | null
  monthlyDropName?: string | null
  onContinue: () => void
  onGeneratePhoto: () => void
  onPlanFeed: () => void
  onBrowseStyles: () => void
  onCreateCalendar?: () => void
  onUploadAssets?: () => void
  onBuildPage?: () => void
  onExploreMonthlyDrop?: () => void
}

export default function MembershipHomeCard({
  creditsReady,
  lastSessionTitle,
  monthlyDropName,
  onContinue,
  onGeneratePhoto,
  onPlanFeed,
  onBrowseStyles,
  onCreateCalendar,
  onUploadAssets,
  onBuildPage,
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
        title="Everything stays with Maya"
        subtitle="Create photos, plan the week, draft your calendar, and open your latest work from one premium workspace."
        aside={<MayaInlinePill tone="strong">{normalizedCredits.toLocaleString()} credits</MayaInlinePill>}
        actions={
          <>
            <MayaInlineAction onClick={onGeneratePhoto} variant="primary">
              Create a post
            </MayaInlineAction>
            <MayaInlineAction onClick={onPlanFeed}>Plan my week</MayaInlineAction>
            <MayaInlineAction onClick={onBrowseStyles}>Browse styles</MayaInlineAction>
            {onBuildPage ? <MayaInlineAction onClick={onBuildPage}>Build a page</MayaInlineAction> : null}
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

            {(onCreateCalendar || onUploadAssets) ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {onCreateCalendar ? (
                  <div className="stone-inset-panel rounded-[22px] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Calendar</div>
                    <div className="mt-2 text-sm text-[color:var(--color-porcelain)]">
                      Build this week&apos;s plan inline with Maya.
                    </div>
                    <div className="mt-3">
                      <MayaInlineAction onClick={onCreateCalendar}>Create calendar</MayaInlineAction>
                    </div>
                  </div>
                ) : null}
                {onUploadAssets ? (
                  <div className="stone-inset-panel rounded-[22px] px-4 py-4">
                    <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Assets</div>
                    <div className="mt-2 text-sm text-[color:var(--color-porcelain)]">
                      Upload product photos and references for new drafts.
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
              <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-smoke)]">Inline Workflow</div>
              <MayaInlinePill tone="muted">Maya-first</MayaInlinePill>
            </div>
            <div className="mt-4 space-y-3">
              {[
                "Ask Maya for a post, week plan, or draft.",
                "Review the result card inline in chat.",
                "Refine, save, or publish without leaving the thread.",
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
