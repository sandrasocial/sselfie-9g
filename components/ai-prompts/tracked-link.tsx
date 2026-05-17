"use client"

import Link from "next/link"
import type { ComponentProps, MouseEvent } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

interface TrackedLinkProps extends ComponentProps<typeof Link> {
  trackEvent: string
  trackProperties?: Record<string, string>
}

/**
 * Drop-in replacement for next/link that fires a fire-and-forget analytics
 * event on click. Tracking failures never block navigation.
 */
export function TrackedLink({
  trackEvent,
  trackProperties,
  onClick,
  ...props
}: TrackedLinkProps) {
  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    try {
      trackAnalyticsEvent({ event: trackEvent, properties: trackProperties })
    } catch {
      // never block navigation
    }
    onClick?.(e)
  }

  return <Link {...props} onClick={handleClick} />
}
