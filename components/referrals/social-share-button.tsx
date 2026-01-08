"use client"

import { useState, useEffect } from "react"
import { Share2, Check, Copy } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
import useSWR from "swr"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface SocialShareButtonProps {
  imageUrl?: string
  className?: string
}

export function SocialShareButton({ imageUrl, className = "" }: SocialShareButtonProps) {
  const { data: referralData } = useSWR<{ success: boolean; referralLink?: string; referralCode?: string }>(
    "/api/referrals/stats",
    fetcher,
  )
  const [copied, setCopied] = useState(false)
  const [showShareMenu, setShowShareMenu] = useState(false)

  const referralLink = referralData?.referralLink || ""
  const referralCode = referralData?.referralCode || ""

  // Generate caption template
  const captionTemplate = `Built this in 10 min with @sselfie_ai — use my link to get 25 free credits: ${referralLink}`

  const handleShare = async () => {
    if (!referralLink) {
      // Generate referral code if missing
      try {
        const response = await fetch("/api/referrals/generate-code")
        const data = await response.json()
        if (data.referralLink) {
          // Retry share with new link
          await shareWithLink(data.referralLink)
        }
      } catch (error) {
        console.error("Failed to generate referral code:", error)
      }
      return
    }

    await shareWithLink(referralLink)
  }

  const shareWithLink = async (link: string) => {
    const shareData: ShareData = {
      title: "Check out my SSELFIE",
      text: captionTemplate,
      url: link,
    }

    if (imageUrl) {
      try {
        // Fetch image as blob for sharing
        const imageResponse = await fetch(imageUrl)
        const blob = await imageResponse.blob()
        const file = new File([blob], "sselfie.jpg", { type: blob.type })
        shareData.files = [file]
      } catch (error) {
        console.error("Failed to load image for sharing:", error)
      }
    }

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        // Fallback: copy to clipboard
        await navigator.clipboard.writeText(captionTemplate)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        // User cancelled - that's fine
        // Otherwise, fallback to copy
        await navigator.clipboard.writeText(captionTemplate)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    }
  }

  const handleCopyCaption = async () => {
    await navigator.clipboard.writeText(captionTemplate)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (!referralLink && !referralCode) {
    return null // Don't show if no referral code
  }

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleShare}
        className={`inline-flex items-center gap-2 ${DesignClasses.spacing.padding.xs} ${DesignClasses.radius.sm} ${DesignClasses.background.tertiary} ${DesignClasses.text.primary} hover:bg-white/80 transition-colors`}
        aria-label="Share your SSELFIE"
      >
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        <span className={DesignClasses.typography.label.small}>
          {copied ? "Copied!" : "Share"}
        </span>
      </button>
    </div>
  )
}
