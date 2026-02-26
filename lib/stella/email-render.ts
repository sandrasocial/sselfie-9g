/**
 * Renders email template by type for north-email (bridge action email_render_template).
 */

import { generateWinBackDay3Email } from "@/lib/email/templates/win-back-day3"
import { generateWinBackDay7Email } from "@/lib/email/templates/win-back-day7"
import { generateWinBackDay14Email } from "@/lib/email/templates/win-back-day14"
import { generateSubscriptionEndingSoonEmail } from "@/lib/email/templates/subscription-ending-soon"
import { generateMonthlyUsageRecapEmail } from "@/lib/email/templates/monthly-usage-recap"
import {
  generateWelcomeDay0,
  generateWelcomeDay3,
  generateWelcomeDay7,
  generateWelcomeDay14,
  generateWelcomeDay21,
  generateWelcomeDay28,
} from "@/lib/email/templates/welcome-sequence"

export interface RenderParams {
  firstName?: string | null
  recipientEmail?: string
  email?: string
  periodEndDate?: string
  manageBillingUrl?: string
  creditsRemaining?: number
  creditsUsed?: number
  photosGenerated?: number
  offerCode?: string
  [key: string]: unknown
}

export function renderEmailTemplate(
  emailType: string,
  params: RenderParams
): { html: string; text: string; subject: string } {
  const email = params.recipientEmail || params.email || ""
  const firstName = params.firstName ?? undefined

  switch (emailType) {
    case "win-back-day3":
      return generateWinBackDay3Email({ firstName: firstName ?? undefined, recipientEmail: email })
    case "win-back-day7":
      return generateWinBackDay7Email({
        firstName: firstName ?? undefined,
        recipientEmail: email,
        offerCode: params.offerCode as string | undefined,
      })
    case "win-back-day14":
      return generateWinBackDay14Email({ firstName: firstName ?? undefined, recipientEmail: email })
    case "subscription-ending-soon-1":
    case "subscription-ending-soon-3":
    case "subscription-ending-soon-7": {
      const out = generateSubscriptionEndingSoonEmail({
        firstName: firstName ?? undefined,
        recipientEmail: email,
        periodEndDate: String(params.periodEndDate ?? ""),
        manageBillingUrl: String(params.manageBillingUrl ?? ""),
      })
      const subject =
        emailType === "subscription-ending-soon-1"
          ? "Last day to keep your Studio access"
          : emailType === "subscription-ending-soon-3"
            ? "3 days left to keep your Studio access"
            : "Your Studio access is ending soon"
      return { ...out, subject }
    }
    case "monthly-usage-recap":
      return generateMonthlyUsageRecapEmail({
        firstName: firstName ?? undefined,
        creditsRemaining: Number(params.creditsRemaining ?? 0),
        creditsUsed: Number(params.creditsUsed ?? 0),
        photosGenerated: Number(params.photosGenerated ?? 0),
      })
    case "welcome-day-0":
      return generateWelcomeDay0({ firstName: firstName ?? "friend", campaignId: 0 })
    case "welcome-day-3":
      return generateWelcomeDay3({ firstName: firstName ?? "friend", campaignId: 0 })
    case "welcome-day-7":
      return generateWelcomeDay7({ firstName: firstName ?? "friend", campaignId: 0 })
    case "welcome-day-14":
      return generateWelcomeDay14({ firstName: firstName ?? "friend", campaignId: 0 })
    case "welcome-day-21":
      return generateWelcomeDay21({ firstName: firstName ?? "friend", campaignId: 0 })
    case "welcome-day-28":
      return generateWelcomeDay28({ firstName: firstName ?? "friend", campaignId: 0 })
    default:
      throw new Error("Unknown emailType: " + emailType)
  }
}
