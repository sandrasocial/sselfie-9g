import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderPersonalLink, renderPersonalNote } from "./stone-email"

export const PROMPT_VAULT_PROOF_RECOVERY_EMAIL_TYPE =
  "prompt-vault-proof-recovery-2026-08"

export function generatePromptVaultProofRecoveryEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const promptVaultUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "prompt_vault_proof_recovery_2026_08",
    content: "one_selfie_marbella_proof",
    medium: "broadcast",
    emailType: PROMPT_VAULT_PROOF_RECOVERY_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })
  const subject = "this was the selfie I started with"
  const vaultLink = renderPersonalLink("See the complete Prompt Vault · $37", promptVaultUrl)
  const bodyHtml = `
    <p style="margin:0 0 16px;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;">I used one selfie to create the photos I needed for Marbella.</p>
    <p style="margin:0 0 16px;">I was already travelling there. I was not trying to invent a trip or pretend I was living a different life.</p>
    <p style="margin:0 0 16px;">I just did not want to spend another day doing my makeup, changing outfits, finding locations, and editing content when I could use the selfie I already had.</p>
    <p style="margin:0 0 16px;">That is the part I want to make easier.</p>
    <p style="margin:0 0 16px;">The free prompts let you try one photo from each collection. The Prompt Vault gives you the complete shoots, so the photos work together and you are not starting from a blank page every time.</p>
    <p style="margin:24px 0;">${vaultLink}</p>
    <p style="margin:0 0 16px;">It is $37 once. You copy the prompts into ChatGPT with your own selfie, and the new prompt drops I add are included.</p>
    <p style="margin:0;">If the free prompts are enough for you right now, keep using them. They are yours.</p>
  `
  const html = renderPersonalNote({
    title: subject,
    bodyHtml,
  })
  const text = `Hi ${firstName},

I used one selfie to create the photos I needed for Marbella.

I was already travelling there. I was not trying to invent a trip or pretend I was living a different life.

I just did not want to spend another day doing my makeup, changing outfits, finding locations, and editing content when I could use the selfie I already had.

That is the part I want to make easier.

The free prompts let you try one photo from each collection. The Prompt Vault gives you the complete shoots, so the photos work together and you are not starting from a blank page every time.

See the complete Prompt Vault · $37:
${promptVaultUrl}

It is $37 once. You copy the prompts into ChatGPT with your own selfie, and the new prompt drops I add are included.

If the free prompts are enough for you right now, keep using them. They are yours.

Sandra x`

  return { subject, html, text }
}
