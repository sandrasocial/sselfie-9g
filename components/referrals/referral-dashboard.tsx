"use client"

import { useState, useEffect } from "react"
import { Copy, Check, Share2, Gift } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ReferralStats {
  referralCode: string | null
  referralLink: string | null
  stats: {
    pending: number
    completed: number
    totalCreditsEarned: number
  }
}

export function ReferralDashboard() {
  const { data, error, isLoading, mutate } = useSWR<{ success: boolean; referralCode?: string; referralLink?: string; stats?: ReferralStats["stats"] }>("/api/referrals/stats", fetcher, {
    refreshInterval: 30000, // Refresh every 30 seconds
  })

  const [copied, setCopied] = useState(false)
  const [generating, setGenerating] = useState(false)

  // Generate referral code if user doesn't have one
  useEffect(() => {
    if (!isLoading && data && !data.referralCode && !generating) {
      setGenerating(true)
      fetch("/api/referrals/generate-code")
        .then((res) => res.json())
        .then(() => {
          mutate()
          setGenerating(false)
        })
        .catch(() => {
          setGenerating(false)
        })
    }
  }, [data, isLoading, generating, mutate])

  const handleCopy = async () => {
    if (!data?.referralLink) return

    try {
      await navigator.clipboard.writeText(data.referralLink)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error("Failed to copy:", err)
    }
  }

  const handleShare = async () => {
    if (!data?.referralLink) return

    const shareData = {
      title: "Join SSELFIE Studio",
      text: "Get 25 free credits when you sign up with my referral link!",
      url: data.referralLink,
    }

    try {
      if (navigator.share) {
        await navigator.share(shareData)
      } else {
        // Fallback to copy
        await navigator.clipboard.writeText(data.referralLink)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (err) {
      // User cancelled or error
      console.log("Share cancelled or failed:", err)
    }
  }

  if (isLoading || generating) {
    return (
      <div className={`${DesignClasses.background.primary} ${DesignClasses.border.medium} ${DesignClasses.radius.md} ${DesignClasses.spacing.padding.md} animate-pulse`}>
        <div className="h-6 bg-stone-200 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-stone-200 rounded w-2/3 mb-2"></div>
        <div className="h-4 bg-stone-200 rounded w-1/2"></div>
      </div>
    )
  }

  if (error || !data?.success) {
    return null // Fail silently
  }

  const stats = data.stats || { pending: 0, completed: 0, totalCreditsEarned: 0 }
  const referralLink = data.referralLink || ""
  const referralCode = data.referralCode || ""

  return (
    <div className={`${DesignClasses.background.primary} ${DesignClasses.border.medium} ${DesignClasses.radius.md} ${DesignClasses.spacing.padding.md} space-y-4`}>
      <div className="flex items-center gap-2">
        <Gift size={20} className={DesignClasses.text.primary} />
        <h3 className={`${DesignClasses.typography.heading.small} ${DesignClasses.text.primary}`}>
          Invite Friends
        </h3>
      </div>

      <p className={`${DesignClasses.typography.body.small} ${DesignClasses.text.secondary}`}>
        Share your link — they get 25 credits, you get 50!
      </p>

      {referralLink && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={referralLink}
              className={`flex-1 ${DesignClasses.typography.body.small} ${DesignClasses.background.tertiary} ${DesignClasses.border.medium} ${DesignClasses.radius.sm} ${DesignClasses.spacing.padding.xs} ${DesignClasses.text.primary}`}
            />
            <button
              onClick={handleCopy}
              className={`${DesignClasses.spacing.padding.xs} ${DesignClasses.radius.sm} ${DesignClasses.background.tertiary} ${DesignClasses.text.primary} hover:bg-white/80 transition-colors`}
              aria-label="Copy referral link"
            >
              {copied ? <Check size={16} /> : <Copy size={16} />}
            </button>
            <button
              onClick={handleShare}
              className={`${DesignClasses.spacing.padding.xs} ${DesignClasses.radius.sm} ${DesignClasses.background.tertiary} ${DesignClasses.text.primary} hover:bg-white/80 transition-colors`}
              aria-label="Share referral link"
            >
              <Share2 size={16} />
            </button>
          </div>

          {referralCode && (
            <p className={`${DesignClasses.typography.body.xsmall} ${DesignClasses.text.tertiary} text-center`}>
              Your code: <span className={DesignClasses.text.primary}>{referralCode}</span>
            </p>
          )}
        </div>
      )}

      <div className={`${DesignClasses.border.medium} ${DesignClasses.spacing.padding.sm} ${DesignClasses.radius.sm} ${DesignClasses.background.tertiary} grid grid-cols-3 gap-4`}>
        <div className="text-center">
          <div className={`${DesignClasses.typography.heading.medium} ${DesignClasses.text.primary} mb-1`}>
            {stats.completed}
          </div>
          <div className={`${DesignClasses.typography.body.xsmall} ${DesignClasses.text.tertiary} uppercase tracking-wider`}>
            Completed
          </div>
        </div>
        <div className="text-center">
          <div className={`${DesignClasses.typography.heading.medium} ${DesignClasses.text.primary} mb-1`}>
            {stats.pending}
          </div>
          <div className={`${DesignClasses.typography.body.xsmall} ${DesignClasses.text.tertiary} uppercase tracking-wider`}>
            Pending
          </div>
        </div>
        <div className="text-center">
          <div className={`${DesignClasses.typography.heading.medium} ${DesignClasses.text.primary} mb-1`}>
            {stats.totalCreditsEarned}
          </div>
          <div className={`${DesignClasses.typography.body.xsmall} ${DesignClasses.text.tertiary} uppercase tracking-wider`}>
            Credits Earned
          </div>
        </div>
      </div>
    </div>
  )
}
