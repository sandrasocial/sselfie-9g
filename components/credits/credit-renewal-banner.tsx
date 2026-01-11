"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { X, Gift } from "lucide-react"
import { DesignClasses } from "@/lib/design-tokens"
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
    router.push("/studio")
  }

  if (isDismissed || !shouldShow || error) {
    return null
  }

  const creditsGranted = data?.history?.[0]?.amount || 200

  return (
    <div className="relative bg-stone-900 text-white border-b border-stone-800 px-4 py-4 sm:py-5">
      <div className={`${DesignClasses.container} flex items-center justify-between gap-4`}>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="flex-shrink-0 w-10 h-10 bg-stone-800 rounded-xl flex items-center justify-center">
            <Gift size={20} className="text-stone-200" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={`${DesignClasses.typography.body.medium} text-stone-50`}>
              Your monthly <strong className="font-medium">{creditsGranted} credits</strong> have been added! 🎉
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={handleStartCreating}
            className={`px-4 py-2 ${DesignClasses.radius.sm} bg-white text-stone-900 ${DesignClasses.typography.label.normal} hover:bg-stone-100 transition-all duration-200 whitespace-nowrap`}
          >
            Start creating
          </button>
          <button
            onClick={handleDismiss}
            className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
            aria-label="Dismiss banner"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}
