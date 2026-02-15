import { normalizeEmailIdentifier } from "./normalize-identifier"

function readNormalizedEnv(name: string): string {
  return normalizeEmailIdentifier(process.env[name])
}

export const EMAIL_CONFIG = {
  transactional: {
    from: "SSelfie <hello@sselfie.ai>",
    replyTo: "hello@sselfie.ai",
  },
  marketing: {
    from: "Sandra from SSELFIE <hello@sselfie.ai>",
    replyTo: "hello@sselfie.ai",
  },
  compliance: {
    unsubscribeHtml: '<p style="text-align:center;font-size:12px;color:#78716c;"><a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color:#78716c;text-decoration:underline;">Unsubscribe</a></p>',
    unsubscribeText: "Unsubscribe: {{{RESEND_UNSUBSCRIBE_URL}}}",
  },
} as const

export const EMAIL_ENV = {
  resendAudienceId: readNormalizedEnv("RESEND_AUDIENCE_ID"),
  dryRun: process.env.EMAIL_DRY_RUN === "true",
  maxBroadcastRecipients: Number.parseInt(process.env.EMAIL_BROADCAST_MAX_RECIPIENTS || "10000", 10),
  allowLargeBroadcasts: process.env.EMAIL_ALLOW_LARGE_BROADCASTS === "true",
} as const

export const MARKETING_SEGMENTS = {
  blueprintDay3: readNormalizedEnv("RESEND_SEGMENT_BLUEPRINT_DAY_3"),
  blueprintDay7: readNormalizedEnv("RESEND_SEGMENT_BLUEPRINT_DAY_7"),
  blueprintDay14: readNormalizedEnv("RESEND_SEGMENT_BLUEPRINT_DAY_14"),
  paidBlueprintDay1: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_1"),
  paidBlueprintDay3: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_3"),
  paidBlueprintDay7: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_7"),
  nurtureDay1: readNormalizedEnv("RESEND_SEGMENT_NURTURE_DAY_1"),
  nurtureDay3: readNormalizedEnv("RESEND_SEGMENT_NURTURE_DAY_3"),
  nurtureDay7: readNormalizedEnv("RESEND_SEGMENT_NURTURE_DAY_7"),
  nurtureDay10: readNormalizedEnv("RESEND_SEGMENT_NURTURE_DAY_10"),
  welcomeDay0: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_0"),
  welcomeDay3: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_3"),
  welcomeDay7: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_7"),
  welcomeDay14: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_14"),
  welcomeDay21: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_21"),
  welcomeDay28: readNormalizedEnv("RESEND_SEGMENT_WELCOME_DAY_28"),
  onboardingDay0: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_0"),
  onboardingDay2: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_2"),
  onboardingDay7: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_7"),
  reengagementDay0: readNormalizedEnv("RESEND_SEGMENT_REENGAGEMENT_DAY_0"),
  reengagementDay7: readNormalizedEnv("RESEND_SEGMENT_REENGAGEMENT_DAY_7"),
  reengagementDay14: readNormalizedEnv("RESEND_SEGMENT_REENGAGEMENT_DAY_14"),
  winBackOffer: readNormalizedEnv("RESEND_SEGMENT_WIN_BACK_OFFER"),
  reactivationDay0: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_0"),
  reactivationDay2: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_2"),
  reactivationDay5: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_5"),
  reactivationDay7: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_7"),
  reactivationDay10: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_10"),
  reactivationDay14: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_14"),
  reactivationDay20: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_20"),
  reactivationDay25: readNormalizedEnv("RESEND_SEGMENT_REACTIVATION_DAY_25"),
  upsellDay10: readNormalizedEnv("RESEND_SEGMENT_UPSELL_DAY_10"),
  upsellFreebieMembership: readNormalizedEnv("RESEND_SEGMENT_UPSELL_FREEBIE_MEMBERSHIP"),
  coldEduDay1: readNormalizedEnv("RESEND_SEGMENT_COLD_EDU_DAY_1"),
  coldEduDay3: readNormalizedEnv("RESEND_SEGMENT_COLD_EDU_DAY_3"),
  coldEduDay7: readNormalizedEnv("RESEND_SEGMENT_COLD_EDU_DAY_7"),
  discoveryDay0: readNormalizedEnv("RESEND_SEGMENT_DISCOVERY_DAY_0"),
  discoveryDay3: readNormalizedEnv("RESEND_SEGMENT_DISCOVERY_DAY_3"),
  discoveryDay5: readNormalizedEnv("RESEND_SEGMENT_DISCOVERY_DAY_5"),
  discoveryDay7: readNormalizedEnv("RESEND_SEGMENT_DISCOVERY_DAY_7"),
  discoveryDay10: readNormalizedEnv("RESEND_SEGMENT_DISCOVERY_DAY_10"),
} as const
