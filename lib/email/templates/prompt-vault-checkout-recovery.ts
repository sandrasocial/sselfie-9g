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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">You were close to turning one selfie into a whole set of editorial photos.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the page froze, Instagram closed, or life pulled you away, your vault is still here.</p>
    <p style="margin:0 0 20px;font-size:15px;line-height:1.8;color:#69645e;">Start with the Dark Balcony transformation. It is the strongest signal right now: moody city light, black outfit, expensive balcony energy, and a reel-cover image that looks like a real shoot.</p>
    <div style="margin:22px 0 4px;">${renderStoneButton("Finish Your Vault Order", checkoutUrl)}</div>
  `

  return {
    subject: "still want the selfie transformations?",
    html: renderStoneShell({
      eyebrow: "SSELFIE",
      title: "Your photoshoot is still here.",
      subtitle: "One selfie can become the whole visual identity.",
      bodyHtml,
      footerLead: "Reply if checkout gave you any trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYou were close to turning one selfie into a whole set of editorial photos.\n\nIf the page froze, Instagram closed, or life pulled you away, your vault is still here.\n\nStart with the Dark Balcony transformation. It is the strongest signal right now: moody city light, black outfit, expensive balcony energy, and a reel-cover image that looks like a real shoot.\n\nFinish your vault order: ${checkoutUrl}\n\nSandra x`,
  }
}
