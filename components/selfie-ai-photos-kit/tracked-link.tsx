"use client"

import Link from "next/link"
import type React from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

export function SelfieAiKitTrackedLink({
  href,
  event,
  className,
  children,
}: {
  href: string
  event: "selfie_ai_photos_kit_vault_upgrade_click" | "selfie_ai_photos_kit_suite_click"
  className?: string
  children: React.ReactNode
}) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        trackAnalyticsEvent({
          event,
          properties: { source: "selfie-ai-photos-kit-access", href },
        })
      }}
    >
      {children}
    </Link>
  )
}
