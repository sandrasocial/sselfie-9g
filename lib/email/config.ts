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
  // Active onboarding sequence.
  onboardingDay0: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_0"),
  onboardingDay2: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_2"),
  onboardingDay7: readNormalizedEnv("RESEND_SEGMENT_ONBOARDING_DAY_7"),
} as const
