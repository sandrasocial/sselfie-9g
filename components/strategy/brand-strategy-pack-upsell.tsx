"use client"

import { useEffect } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

type BrandStrategyPackUpsellProps = {
  strategyToken: string
}

export default function BrandStrategyPackUpsell({ strategyToken }: BrandStrategyPackUpsellProps) {
  const checkoutHref = `/checkout/brand-strategy-pack?strategyToken=${encodeURIComponent(strategyToken)}`

  useEffect(() => {
    trackAnalyticsEvent({
      event: "brand_strategy_pack_upsell_view",
      properties: {
        source: "freebie_strategy_page",
      },
    })
  }, [])

  const handleCheckoutClick = () => {
    trackAnalyticsEvent({
      event: "brand_strategy_pack_checkout_start",
      properties: {
        source: "freebie_strategy_page",
      },
    })
  }

  return (
    <div className="upsell-buttons">
      <a href={checkoutHref} className="btn-primary" onClick={handleCheckoutClick}>
        Get your Brand Strategy Pack instantly — $19
      </a>
      <a href="https://sselfie.ai/auth/sign-up?checkout=studio_membership" className="btn-secondary">
        Join Studio — €97/month
      </a>
    </div>
  )
}
