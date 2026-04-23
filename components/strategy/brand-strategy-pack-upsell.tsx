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
      <a href="/private-shoot" className="btn-secondary">
        Book the Private Offer
      </a>
    </div>
  )
}
