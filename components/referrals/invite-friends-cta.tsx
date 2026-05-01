"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { ReferralDashboard } from "./referral-dashboard"

export function InviteFriendsCTA() {
  const [showDashboard, setShowDashboard] = useState(false)

  if (showDashboard) {
    return (
      <div className="app-light-panel-text">
        <ReferralDashboard />
        <button
          onClick={() => setShowDashboard(false)}
          className="mt-4 w-full rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 py-3 text-[11px] font-medium uppercase tracking-[0.2em] text-[color:var(--app-text-secondary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] hover:text-[color:var(--app-text-primary)]"
        >
          Back
        </button>
      </div>
    )
  }

  return (
    <div className="rounded-[16px] border border-[color:var(--app-glass-border)] bg-[rgba(255,255,255,0.74)] px-5 py-4 shadow-[0_18px_50px_rgba(61,56,48,0.08)] backdrop-blur-[18px]">
      <div className="flex-1">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.3em] text-[color:var(--app-text-secondary)]">Referrals</p>
        <h3 className="mb-2 font-['Cormorant_Garamond'] text-2xl font-light text-[color:var(--app-text-primary)]">
          Share with a friend
        </h3>
        <p className="mb-4 text-sm leading-relaxed text-[color:var(--app-text-secondary)]">
          You get 50 credits. They get 25 when they join.
        </p>
        <button
          onClick={() => setShowDashboard(true)}
          className="inline-flex h-10 items-center gap-2 rounded-[6px] border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] px-4 text-[11px] font-medium uppercase tracking-[0.16em] text-[color:var(--app-text-primary)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)]"
        >
          Invite friends
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
