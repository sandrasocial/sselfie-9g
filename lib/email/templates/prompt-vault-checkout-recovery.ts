import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"

export const PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE = "prompt-vault-checkout-recovery"

export function generatePromptVaultCheckoutRecoveryEmail({
  firstName,
}: {
  firstName: string
}) {
  const checkoutUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "prompt_vault_checkout_recovery",
    content: "return_to_checkout",
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
  })

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hey ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You were so close to unlocking the Vault.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Inside are the cinematic, luxury, dark feminine, glam, mirror selfie, and main-character-style transformations I have been obsessing over lately.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#69645e;">And honestly, I keep adding more because I cannot stop making them.</p>
    <div style="margin:22px 0 4px;">${renderStoneButton("Unlock the Vault", checkoutUrl)}</div>
  `

  return {
    subject: "your transformation is waiting",
    html: renderStoneShell({
      eyebrow: "SSELFIE",
      title: "Your transformation is waiting.",
      subtitle: "One selfie can become the whole photoshoot.",
      bodyHtml,
      footerLead: "Reply if checkout gave you any trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hey ${firstName},\n\nYou were so close to unlocking the Vault.\n\nInside are the cinematic, luxury, dark feminine, glam, mirror selfie, and main-character-style transformations I have been obsessing over lately.\n\nAnd honestly, I keep adding more because I cannot stop making them.\n\nUnlock the Vault: ${checkoutUrl}\n\nSandra x`,
  }
}
