"use client"

import type { ReactNode } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

type TrackedCourseLinkProps = {
  href: string
  className?: string
  download?: boolean
  event: string
  properties?: Record<string, any>
  children: ReactNode
}

export function TrackedCourseLink({
  href,
  className,
  download,
  event,
  properties,
  children,
}: TrackedCourseLinkProps) {
  return (
    <a
      href={href}
      className={className}
      download={download}
      onClick={() => {
        trackAnalyticsEvent({
          event,
          properties: {
            product_id: "selfie_to_brand_shoot_system",
            ...properties,
          },
        })
      }}
    >
      {children}
    </a>
  )
}
