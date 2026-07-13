"use client"

import Link from "next/link"
import type { ReactNode } from "react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"

type BuyerHomeLinkProps = {
  href: string
  assetId: string
  children: ReactNode
  className?: string
  eventName?:
    | "selfie_visibility_bundle_asset_opened"
    | "selfie_visibility_bundle_annual_upsell_clicked"
}

export function BuyerHomeLink({
  href,
  assetId,
  children,
  className,
  eventName = "selfie_visibility_bundle_asset_opened",
}: BuyerHomeLinkProps) {
  return (
    <Link
      href={href}
      className={className}
      onClick={() => {
        void trackAnalyticsEvent({
          event: eventName,
          properties: {
            asset_id: assetId,
            source: "one_selfie_buyer_home",
            product_type: "selfie_visibility_bundle",
          },
        })
      }}
    >
      {children}
    </Link>
  )
}
