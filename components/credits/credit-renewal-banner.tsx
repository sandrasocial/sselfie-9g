"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { X, Gift } from "lucide-react"
import { useRouter } from "next/navigation"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const STORAGE_KEY = "hideCreditRenewalBanner"

export function CreditRenewalBanner() {
  const [isDismissed, setIsDismissed] = useState(false)
  const [shouldShow, setShouldShow] = useState(false)
  const router = useRouter()

  const { data, error } = useSWR("/api/user/credits", fetcher, {
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
    if (data?.history && Array.isArray(data.history) && data.history.length > 0) {
      const latestTransaction = data.history[0]

      // Check if it's a monthly renewal (subscription_grant with "Monthly" in description)
      const isMonthlyRenewal =
        latestTransaction.transaction_type === "subscription_grant" &&
        latestTransaction.description?.toLowerCase().startsWith("monthly")

      if (isMonthlyRenewal && latestTransaction.created_at) {
        // Check if transaction was created in the last 24 hours
        const transactionDate = new Date(latestTransaction.created_at)
        const now = new Date()
        const hoursSinceTransaction = (now.getTime() - transactionDate.getTime()) / (1000 * 60 * 60)

        if (hoursSinceTransaction < 24) {
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

  const handleStartCreating = () => {
    router.push("/app")
  }

  if (isDismissed || !shouldShow || error) {
    return null
  }

  const creditsGranted = data?.history?.[0]?.amount || 200

  return (
    <div className="relative bg-[#1c1b19] text-[#f0ede8] border-b border-[rgba(195,190,182,0.25)] px-4 py-4 sm:py-5">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-[rgba(175,170,162,0.12)] border border-[rgba(195,190,182,0.25)] rounded-xl flex items-center justify-center">
            <Gift size={20} className="text-[#a8a49c]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-['Inter'] text-sm text-[#f0ede8]">
              Your monthly <strong className="font-medium">{creditsGranted} credits</strong> have been added!
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleStartCreating}
            className="px-4 py-2 rounded-full bg-[#c8c4bb] text-[#0d0c0b] font-['Inter'] font-medium text-xs tracking-[0.15em] uppercase hover:bg-[#f0ede8] transition-all duration-200 whitespace-nowrap"
          >
            Start creating
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-[#8a8780] hover:text-[#f0ede8] transition-colors"
            aria-label="Dismiss banner"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
