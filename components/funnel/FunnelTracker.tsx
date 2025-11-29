"use client"

import { useEffect, useRef } from "react"

// Get or create session ID from cookie
function getSessionId(): string {
  if (typeof window === "undefined") return ""

  const cookieName = "sselfie_session_id"
  const cookie = document.cookie.split("; ").find((row) => row.startsWith(`${cookieName}=`))

  if (cookie) {
    return cookie.split("=")[1]
  }

  // Generate simple session ID (timestamp + random)
  const newSessionId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  document.cookie = `${cookieName}=${newSessionId}; path=/; max-age=${60 * 60 * 24 * 30}` // 30 days
  return newSessionId
}

export function FunnelTracker() {
  const hasTrackedPageView = useRef(false)

  useEffect(() => {
    const sessionId = getSessionId()

    // Track page view once
    if (!hasTrackedPageView.current) {
      trackEvent({
        event_type: "page_view",
        event_name: "page_viewed",
        url: window.location.pathname,
        session_id: sessionId,
      })
      hasTrackedPageView.current = true
    }

    // Track scroll depth
    let maxScroll = 0
    const handleScroll = () => {
      const scrollPercent = Math.round(
        (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100,
      )

      if (scrollPercent > maxScroll && scrollPercent > 0) {
        maxScroll = scrollPercent

        // Track at 25%, 50%, 75%, 100%
        if (scrollPercent >= 25 && scrollPercent < 50 && maxScroll < 50) {
          trackScrollDepth(25, sessionId)
        } else if (scrollPercent >= 50 && scrollPercent < 75 && maxScroll < 75) {
          trackScrollDepth(50, sessionId)
        } else if (scrollPercent >= 75 && scrollPercent < 100 && maxScroll < 100) {
          trackScrollDepth(75, sessionId)
        } else if (scrollPercent >= 100) {
          trackScrollDepth(100, sessionId)
        }
      }
    }

    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  return null
}

function trackEvent(data: any) {
  if (typeof window === "undefined") return

  fetch("/api/funnel/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  }).catch((err) => console.error("[FunnelTracker] Failed to track event:", err))
}

function trackScrollDepth(depth: number, sessionId: string) {
  trackEvent({
    event_type: "scroll_depth",
    event_name: `scrolled_${depth}`,
    url: window.location.pathname,
    metadata: { depth },
    session_id: sessionId,
  })
}
