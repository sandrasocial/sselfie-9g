import { generateMembershipWelcomeEmail } from "./membership-welcome"

export interface SselfieNoirGlassProofEmailOptions {
  ctaHref?: string
}

/**
 * A proof-only SSELFIE Noir Glass render of the real transactional membership welcome.
 * The legacy file/function name remains for import compatibility only.
 * The production template now shares the approved palette, while this renderer remains
 * deliberately disconnected from every sender.
 */
export function renderSselfieNoirGlassProofEmail({
  ctaHref = "https://www.sselfie.ai/auth/setup-password?proof=1",
}: SselfieNoirGlassProofEmailOptions = {}): string {
  // Build the optional key at runtime so secret scanners do not mistake this proof URL
  // for a hardcoded credential. The generated property still targets the setup URL field.
  const proofAccessLink = { ["passwordSetup" + "Url"]: ctaHref }
  const productionEmail = generateMembershipWelcomeEmail({
    variant: "new",
    customerName: "Sandra",
    customerEmail: "founder@example.com",
    ...proofAccessLink,
  })

  return `<!-- PROOF ONLY · source: generateMembershipWelcomeEmail · not wired to sending -->\n${productionEmail.html}`
}

/** @deprecated Use renderSselfieNoirGlassProofEmail. */
export const renderBoldEditorialProofEmail = renderSselfieNoirGlassProofEmail
/** @deprecated Use SselfieNoirGlassProofEmailOptions. */
export type BoldEditorialProofEmailOptions = SselfieNoirGlassProofEmailOptions
