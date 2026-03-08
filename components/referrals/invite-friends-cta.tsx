"use client"

import { useState } from "react"
import { Gift, Users, ArrowRight } from "lucide-react"
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
    <div className={`stone-panel ${DesignClasses.radius.md} ${DesignClasses.spacing.padding.md}`}>
      <div className="flex items-start gap-4">
        <div className={`stone-chip p-2 ${DesignClasses.radius.sm}`}>
          <Gift size={20} className={DesignClasses.text.primary} />
        </div>
        <div className="flex-1">
          <h3 className={`${DesignClasses.typography.heading.small} ${DesignClasses.text.primary} mb-2`}>
            Love your new photos?
          </h3>
          <p className={`${DesignClasses.typography.body.small} ${DesignClasses.text.secondary} mb-4`}>
            Invite a friend → get 50 credits. They get 25 credits when they sign up.
          </p>
          <button
            onClick={() => setShowDashboard(true)}
            className={`inline-flex items-center gap-2 ${DesignClasses.buttonPrimary} ${DesignClasses.typography.label.button}`}
          >
            <Users size={16} />
            Invite Friends
            <ArrowRight size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
