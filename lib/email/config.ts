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
    // Required by CAN-SPAM (US), CASL (CA), and good practice for GDPR.
    addressHtml: '<p style="text-align:center;font-size:11px;color:#a8a49c;margin:4px 0 0;">SSELFIE Studio &bull; Fauskevegen 121, 6230 Sykkylven, Norway</p>',
    addressText: "SSELFIE Studio, Fauskevegen 121, 6230 Sykkylven, Norway",
  },
} as const

export const EMAIL_ENV = {
  resendAudienceId: readNormalizedEnv("RESEND_AUDIENCE_ID"),
  dryRun: String(process.env.EMAIL_DRY_RUN || "").trim().toLowerCase() === "true",
  maxBroadcastRecipients: Number.parseInt(process.env.EMAIL_BROADCAST_MAX_RECIPIENTS || "10000", 10),
  allowLargeBroadcasts: process.env.EMAIL_ALLOW_LARGE_BROADCASTS === "true",
} as const

export const MARKETING_SEGMENTS = {
  // Studio member onboarding sequence.
  onboardingDay0: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_0"),
  onboardingDay2: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_2"),
  onboardingDay7: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_7"),
  // Feed Planner (paid_blueprint) follow-up sequence.
  paidBlueprintDay1: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_1"),
  paidBlueprintDay3: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_3"),
  paidBlueprintDay7: readNormalizedEnv("RESEND_SEGMENT_PAID_BLUEPRINT_DAY_7"),
} as const
