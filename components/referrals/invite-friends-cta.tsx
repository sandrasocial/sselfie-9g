"use client"

import { useState } from "react"
import { ArrowRight } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
import { ReferralDashboard } from "./referral-dashboard"

export function InviteFriendsCTA() {
  const [showDashboard, setShowDashboard] = useState(false)

  if (showDashboard) {
    return (
      <div className={DesignClasses.spacing.paddingX.md}>
        <ReferralDashboard />
        <button
          onClick={() => setShowDashboard(false)}
          className={`mt-4 w-full ${DesignClasses.typography.label.button} ${DesignClasses.text.tertiary} hover:${DesignClasses.text.primary} transition-colors`}
        >
          ← Back
        </button>
      </div>
    )
  }

  return (
    <div className={`stone-panel ${DesignClasses.radius.md} px-5 py-4`}>
      <div className="flex-1">
        <p className={`${DesignClasses.typography.label.uppercase} ${DesignClasses.text.tertiary} mb-2`}>Referrals</p>
        <h3 className={`${DesignClasses.typography.heading.small} ${DesignClasses.text.primary} mb-2`}>
          Share with a friend
        </h3>
        <p className={`${DesignClasses.typography.body.small} ${DesignClasses.text.secondary} mb-4`}>
          You get 50 credits. They get 25 when they join.
        </p>
        <button
          onClick={() => setShowDashboard(true)}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.1)] px-4 text-[11px] uppercase tracking-[0.16em] text-[#f0ede8] transition-colors hover:bg-[rgba(175,170,162,0.18)]"
        >
          Invite friends
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  )
}
