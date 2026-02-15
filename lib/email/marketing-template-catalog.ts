import {
  generateWelcomeDay0,
  generateWelcomeDay3,
  generateWelcomeDay7,
  generateWelcomeDay14,
  generateWelcomeDay21,
  generateWelcomeDay28,
} from "@/lib/email/templates/welcome-sequence"
import { generateNurtureDay1Email } from "@/lib/email/templates/nurture-day-1"
import { generateNurtureDay3Email } from "@/lib/email/templates/nurture-day-3"
import { generateNurtureDay7Email } from "@/lib/email/templates/nurture-day-7"
import { generateNurtureDay10 } from "@/lib/email/templates/nurture-sequence"
import { generateOnboardingDay0Email } from "@/lib/email/templates/onboarding-day-0"
import { generateOnboardingDay2Email } from "@/lib/email/templates/onboarding-day-2"
import { generateOnboardingDay7Email } from "@/lib/email/templates/onboarding-day-7"
import { generateBlueprintFollowupDay3Email } from "@/lib/email/templates/blueprint-followup-day-3"
import { generateBlueprintFollowupDay7Email } from "@/lib/email/templates/blueprint-followup-day-7"
import { generateBlueprintFollowupDay14Email } from "@/lib/email/templates/blueprint-followup-day-14"
import { generateBlueprintDiscovery1Email } from "@/lib/email/templates/blueprint-discovery-1"
import { generateBlueprintDiscovery2Email } from "@/lib/email/templates/blueprint-discovery-2"
import { generateBlueprintDiscovery3Email } from "@/lib/email/templates/blueprint-discovery-3"
import { generateBlueprintDiscovery4Email } from "@/lib/email/templates/blueprint-discovery-4"
import { generateBlueprintDiscovery5Email } from "@/lib/email/templates/blueprint-discovery-5"
import { generateColdEduDay1Email } from "@/lib/email/templates/cold-edu-day-1"
import { generateColdEduDay3Email } from "@/lib/email/templates/cold-edu-day-3"
import { generateColdEduDay7Email } from "@/lib/email/templates/cold-edu-day-7"
import {
  generateReengagementDay0,
  generateReengagementDay7,
  generateReengagementDay14,
} from "@/lib/email/templates/reengagement-sequence"
import {
  generateReactivationDay0Email,
  generateReactivationDay2Email,
  generateReactivationDay5Email,
  generateReactivationDay7Email,
  generateReactivationDay10Email,
  generateReactivationDay14Email,
  generateReactivationDay20Email,
  generateReactivationDay25Email,
} from "@/lib/email/templates/reactivation-sequence"
import { generateUpsellDay10Email } from "@/lib/email/templates/upsell-day-10"
import { generateUpsellFreebieMembershipEmail } from "@/lib/email/templates/upsell-freebie-membership"
import { generateWinBackOfferEmail } from "@/lib/email/templates/win-back-offer"
import { generateMonthlyUsageRecapEmail } from "@/lib/email/templates/monthly-usage-recap"
import { 
  generatePreviewReadyEmail,
  generateEngagementCheckEmail,
  generateUrgencyConversionEmail
} from "@/lib/email/templates/enhanced-conversion-sequence"
import {
  generateLaurieStoryEmail,
  generateTransformationEmail
} from "@/lib/email/templates/social-proof-sequence"
import {
  generatePaymentUpdateEmail,
  generateWeMissYouEmail
} from "@/lib/email/templates/payment-recovery"

const FIRST_NAME_PLACEHOLDER = "{{{FIRST_NAME|friend}}}"
const EMAIL_PLACEHOLDER = "{{{EMAIL}}}"

export interface MarketingTemplateDefinition {
  emailType: string
  label: string
  description?: string
  getDefault: () => { subject?: string; html: string; text: string }
}

export const MARKETING_TEMPLATE_CATALOG: MarketingTemplateDefinition[] = [
  {
    emailType: "welcome-day-0",
    label: "Welcome Day 0",
    description: "New user welcome (day 0)",
    getDefault: () => generateWelcomeDay0({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "welcome-day-3",
    label: "Welcome Day 3",
    description: "New user follow-up (day 3)",
    getDefault: () => generateWelcomeDay3({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "welcome-day-7",
    label: "Welcome Day 7",
    description: "New user follow-up (day 7)",
    getDefault: () => generateWelcomeDay7({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "welcome-day-14",
    label: "Welcome Day 14",
    description: "New user follow-up (day 14)",
    getDefault: () => generateWelcomeDay14({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "welcome-day-21",
    label: "Welcome Day 21",
    description: "New user follow-up (day 21)",
    getDefault: () => generateWelcomeDay21({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "welcome-day-28",
    label: "Welcome Day 28",
    description: "New user follow-up (day 28)",
    getDefault: () => generateWelcomeDay28({ firstName: FIRST_NAME_PLACEHOLDER, campaignId: 0 }),
  },
  {
    emailType: "monthly-usage-recap",
    label: "Monthly Usage Recap",
    description: "Active member monthly usage summary",
    getDefault: () => generateMonthlyUsageRecapEmail({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "nurture-day-1",
    label: "Nurture Day 1",
    description: "Freebie nurture (day 1)",
    getDefault: () =>
      generateNurtureDay1Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "nurture-day-3",
    label: "Nurture Day 3",
    description: "Freebie nurture (day 3)",
    getDefault: () =>
      generateNurtureDay3Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "nurture-day-7",
    label: "Nurture Day 7",
    description: "Freebie nurture (day 7)",
    getDefault: () =>
      generateNurtureDay7Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "nurture-day-10",
    label: "Nurture Day 10",
    description: "Freebie nurture (day 10)",
    getDefault: () =>
      generateNurtureDay10({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "onboarding-day-0",
    label: "Onboarding Day 0",
    description: "Member onboarding (day 0)",
    getDefault: () => generateOnboardingDay0Email({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "onboarding-day-2",
    label: "Onboarding Day 2",
    description: "Member onboarding (day 2)",
    getDefault: () => generateOnboardingDay2Email({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "onboarding-day-7",
    label: "Onboarding Day 7",
    description: "Member onboarding (day 7)",
    getDefault: () => generateOnboardingDay7Email({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-followup-day-3",
    label: "Blueprint Follow-up Day 3",
    description: "Blueprint follow-up (day 3)",
    getDefault: () => generateBlueprintFollowupDay3Email({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-followup-day-7",
    label: "Blueprint Follow-up Day 7",
    description: "Blueprint follow-up (day 7)",
    getDefault: () => generateBlueprintFollowupDay7Email({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-followup-day-14",
    label: "Blueprint Follow-up Day 14",
    description: "Blueprint follow-up (day 14)",
    getDefault: () => generateBlueprintFollowupDay14Email({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-discovery-1",
    label: "Blueprint Discovery 1",
    description: "Discovery funnel (email 1)",
    getDefault: () =>
      generateBlueprintDiscovery1Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-discovery-2",
    label: "Blueprint Discovery 2",
    description: "Discovery funnel (email 2)",
    getDefault: () =>
      generateBlueprintDiscovery2Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-discovery-3",
    label: "Blueprint Discovery 3",
    description: "Discovery funnel (email 3)",
    getDefault: () =>
      generateBlueprintDiscovery3Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-discovery-4",
    label: "Blueprint Discovery 4",
    description: "Discovery funnel (email 4)",
    getDefault: () =>
      generateBlueprintDiscovery4Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "blueprint-discovery-5",
    label: "Blueprint Discovery 5",
    description: "Discovery funnel (email 5)",
    getDefault: () =>
      generateBlueprintDiscovery5Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "cold-edu-day-1",
    label: "Cold Re-education Day 1",
    description: "Cold re-education (day 1)",
    getDefault: () =>
      generateColdEduDay1Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "cold-edu-day-3",
    label: "Cold Re-education Day 3",
    description: "Cold re-education (day 3)",
    getDefault: () =>
      generateColdEduDay3Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "cold-edu-day-7",
    label: "Cold Re-education Day 7",
    description: "Cold re-education (day 7)",
    getDefault: () =>
      generateColdEduDay7Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reengagement-day-0",
    label: "Re-engagement Day 0",
    description: "Re-engagement (day 0)",
    getDefault: () => generateReengagementDay0({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "reengagement-day-7",
    label: "Re-engagement Day 7",
    description: "Re-engagement (day 7)",
    getDefault: () => generateReengagementDay7({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "reengagement-day-14",
    label: "Re-engagement Day 14",
    description: "Re-engagement (day 14)",
    getDefault: () => generateReengagementDay14({ firstName: FIRST_NAME_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-0",
    label: "Reactivation Day 0",
    description: "Reactivation sequence (day 0)",
    getDefault: () =>
      generateReactivationDay0Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-2",
    label: "Reactivation Day 2",
    description: "Reactivation sequence (day 2)",
    getDefault: () =>
      generateReactivationDay2Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-5",
    label: "Reactivation Day 5",
    description: "Reactivation sequence (day 5)",
    getDefault: () =>
      generateReactivationDay5Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-7",
    label: "Reactivation Day 7",
    description: "Reactivation sequence (day 7)",
    getDefault: () =>
      generateReactivationDay7Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-10",
    label: "Reactivation Day 10",
    description: "Reactivation sequence (day 10)",
    getDefault: () =>
      generateReactivationDay10Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-14",
    label: "Reactivation Day 14",
    description: "Reactivation sequence (day 14)",
    getDefault: () =>
      generateReactivationDay14Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-20",
    label: "Reactivation Day 20",
    description: "Reactivation sequence (day 20)",
    getDefault: () =>
      generateReactivationDay20Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "reactivation-day-25",
    label: "Reactivation Day 25",
    description: "Reactivation sequence (day 25)",
    getDefault: () =>
      generateReactivationDay25Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "upsell-day-10",
    label: "Upsell Day 10",
    description: "Upsell (day 10)",
    getDefault: () =>
      generateUpsellDay10Email({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "upsell-freebie-membership",
    label: "Upsell Freebie → Membership",
    description: "Upsell freebie subscribers to membership",
    getDefault: () =>
      generateUpsellFreebieMembershipEmail({ firstName: FIRST_NAME_PLACEHOLDER, recipientEmail: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "win-back-offer",
    label: "Win-back Offer",
    description: "Win-back offer campaign",
    getDefault: () =>
      generateWinBackOfferEmail({
        firstName: FIRST_NAME_PLACEHOLDER,
        offerDiscount: "50%",
        offerCode: "COMEBACK50",
        offerExpiry: "48 hours",
      }),
  },
  // NEW HIGH-CONVERTING SEQUENCES (2026-01-28)
  {
    emailType: "preview-ready-enhanced",
    label: "Preview Ready (Enhanced)",
    description: "Enhanced preview delivery with engagement focus",
    getDefault: () =>
      generatePreviewReadyEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "engagement-check",
    label: "Engagement Check",
    description: "Day 1 follow-up with personal touch",
    getDefault: () =>
      generateEngagementCheckEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "urgency-conversion",
    label: "Urgency Conversion",
    description: "48-hour urgency offer for Blueprint",
    getDefault: () =>
      generateUrgencyConversionEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "laurie-story",
    label: "Laurie's Success Story",
    description: "Social proof email featuring Laurie Garcia testimonial",
    getDefault: () =>
      generateLaurieStoryEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "transformation-showcase",
    label: "Transformation Showcase",
    description: "Before/after social proof with multiple testimonials",
    getDefault: () =>
      generateTransformationEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "payment-update-needed",
    label: "Payment Update Needed",
    description: "Immediate payment recovery email",
    getDefault: () =>
      generatePaymentUpdateEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
  {
    emailType: "we-miss-you",
    label: "We Miss You",
    description: "Day 3 payment recovery with discount offer",
    getDefault: () =>
      generateWeMissYouEmail({ firstName: FIRST_NAME_PLACEHOLDER, email: EMAIL_PLACEHOLDER }),
  },
]
