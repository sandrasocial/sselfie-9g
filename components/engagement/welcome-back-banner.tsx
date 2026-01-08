"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { X } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STORAGE_KEY = "hideWelcomeBackBanner"

export function WelcomeBackBanner() {
  const [isDismissed, setIsDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const [daysSinceLogin, setDaysSinceLogin] = useState<number | null>(null)
  const [userName, setUserName] = useState<string>("")

  const { data, error } = useSWR("/api/profile/info", fetcher, {
    revalidateOnFocus: false,
    revalidateOnReconnect: false,
  })

  useEffect(() => {
    // Check if banner was dismissed
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem(STORAGE_KEY)
      if (dismissed === "true") {
        setIsDismissed(true)
        return
      }
    }

    // Check if we should show the banner
    if (data?.last_login_at) {
      const lastLogin = new Date(data.last_login_at)
      const now = new Date()
      const daysSince = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24))

      // Show if last login was at least 1 day ago
      if (daysSince >= 1) {
        setDaysSinceLogin(daysSince)
        setUserName(data.name || "there")
        setShouldShow(true)
      }
    } else if (data && !data.last_login_at) {
      // If user has no last_login_at, they might be a new user or returning after a long time
      // Don't show banner for new users (created_at is recent)
      if (data.memberSince) {
        const memberSince = new Date(data.memberSince)
        const now = new Date()
        const daysSinceMember = Math.floor((now.getTime() - memberSince.getTime()) / (1000 * 60 * 60 * 24))

        // Only show if they've been a member for a while but have no login record
        if (daysSinceMember > 7) {
          setDaysSinceLogin(null) // Unknown, but welcome back anyway
          setUserName(data.name || "there")
          setShouldShow(true)
        }
      }
    }
  }, [data])

  const handleDismiss = () => {
    setIsDismissed(true)
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, "true")
    }
  }

  if (isDismissed || !shouldShow || error) {
    return null
  }

  const getMessage = () => {
    if (daysSinceLogin === null) {
      return `Welcome back, ${userName}! Ready to create something new?`
    } else if (daysSinceLogin === 1) {
      return `Welcome back, ${userName}! It's been a day — ready to create something new?`
    } else {
      return `Welcome back, ${userName}! It's been ${daysSinceLogin} days — ready to create something new?`
    }
  }

  return (
    <div className="relative bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white border-b border-stone-700 px-4 py-4 sm:py-5">
      <div className={`${DesignClasses.container} flex items-center justify-between gap-4`}>
        <div className="flex-1 min-w-0">
          <p className={`${DesignClasses.typography.body.medium} text-stone-50`}>{getMessage()}</p>
        </div>
        <button
          onClick={handleDismiss}
          className="p-2 text-stone-400 hover:text-stone-200 transition-colors flex-shrink-0"
          aria-label="Dismiss banner"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  )
}
