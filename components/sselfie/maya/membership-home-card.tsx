"use client"

interface MembershipHomeCardProps {
  creditsReady: number
  lastSessionTitle?: string | null
  monthlyDropName?: string | null
  onContinue: () => void
  onGeneratePhoto: () => void
  onPlanFeed: () => void
  onBrowseStyles: () => void
  onCreateLandingPage?: () => void
  onCreateCalendar?: () => void
  onUploadAssets?: () => void
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
  onCreateLandingPage,
  onCreateCalendar,
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
    <div className="w-full max-w-2xl mx-auto px-4 sm:px-6">
      <div className="rounded-[20px] border border-[rgba(255,255,255,0.12)] bg-[rgba(255,255,255,0.05)] backdrop-blur-[20px] p-4 sm:p-5 space-y-4">
        <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3.5 sm:p-4">
          <p
            className="text-[10px] tracking-[0.24em] uppercase text-[#e5e5e5]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Your Credits
          </p>
          <p className="mt-2 text-2xl sm:text-[28px] leading-none text-[#ffffff] font-medium tracking-[0.03em]">
            {normalizedCredits.toLocaleString()} ready
          </p>
        </section>

        <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3.5 sm:p-4">
          <p
            className="text-[10px] tracking-[0.24em] uppercase text-[#e5e5e5]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Continue
          </p>
          <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-[#f5f5f5]">
            {safeLastSessionTitle}
          </p>
          <button
            type="button"
            onClick={onContinue}
            className="mt-3 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#ffffff] hover:text-[#f5f5f5] transition-colors"
          >
            Pick up where you left off →
          </button>
        </section>

        {hasMonthlyDrop && (
          <section className="rounded-2xl border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] p-3.5 sm:p-4">
            <p
              className="text-[10px] tracking-[0.24em] uppercase text-[#e5e5e5]"
              style={{ fontFamily: "var(--font-display)" }}
            >
              This Month
            </p>
            <p className="mt-2 text-sm sm:text-[15px] leading-relaxed text-[#f5f5f5]">
              {monthlyDropName}
            </p>
            <button
              type="button"
              onClick={onExploreMonthlyDrop ?? onBrowseStyles}
              className="mt-3 text-[11px] sm:text-xs uppercase tracking-[0.18em] text-[#ffffff] hover:text-[#f5f5f5] transition-colors"
            >
              Explore →
            </button>
          </section>
        )}

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
          <button
            type="button"
            onClick={onGeneratePhoto}
            className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            Generate a photo →
          </button>
          <button
            type="button"
            onClick={onPlanFeed}
            className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            Plan my feed →
          </button>
          <button
            type="button"
            onClick={onBrowseStyles}
            className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
          >
            Browse styles →
          </button>
        </section>

        {(onCreateLandingPage || onCreateCalendar || onUploadAssets) && (
          <section className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
            {onCreateLandingPage && (
              <button
                type="button"
                onClick={onCreateLandingPage}
                className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Build landing page →
              </button>
            )}
            {onCreateCalendar && (
              <button
                type="button"
                onClick={onCreateCalendar}
                className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Create calendar →
              </button>
            )}
            {onUploadAssets && (
              <button
                type="button"
                onClick={onUploadAssets}
                className="rounded-xl border border-[rgba(255,255,255,0.15)] bg-[rgba(255,255,255,0.06)] px-3 py-3 text-[11px] uppercase tracking-[0.16em] text-[#ffffff] hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Upload assets →
              </button>
            )}
          </section>
        )}
      </div>
    </div>
  )
}
