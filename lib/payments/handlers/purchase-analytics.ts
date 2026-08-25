import "server-only"

import type { AnalyticsEventName } from "@/lib/analytics/event-contract"
import { logAnalyticsEvent } from "@/lib/analytics/events"

export function schedulePurchaseObservation(input: {
  eventName: AnalyticsEventName
  userId?: string | null
  source?: string | null
  productType: string
  amountCents: number
  currency?: string | null
  sessionId: string
  paymentId: string
  isTestMode: boolean
  path?: string | null
  properties?: Record<string, string | number | boolean | null | undefined>
}): void {
  void logAnalyticsEvent({
    eventName: input.eventName,
    userId: input.userId || null,
    path: input.path,
    properties: {
      ...(input.properties ?? {}),
      source: input.source || "landing_page",
      product_type: input.productType,
      value: input.amountCents / 100,
      currency: input.currency || "usd",
      stripe_session_id: input.sessionId,
      stripe_payment_id: input.paymentId,
      is_test_mode: input.isTestMode,
    },
  })
}
