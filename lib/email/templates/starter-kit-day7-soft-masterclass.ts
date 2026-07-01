import { renderStoneButton, renderStoneShell } from "./stone-email"
import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"

export function generateStarterKitDay7SoftMasterclassEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string
}) {
  const vaultUrl = new URL(buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    campaign: "selfie_ai_kit_day7_prompt_vault",
    content: "open_vault",
    emailType: "starter-kit-day7-soft-masterclass",
  }))
  if (recipientEmail) vaultUrl.searchParams.set("checkout_email", recipientEmail)
  vaultUrl.searchParams.set("checkout_source", "selfie_ai_kit_day7")
  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">If the Kit helped you get your first AI photo, the next question is usually: what else can I create?</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">That is where the Prompt Vault comes in.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">It gives you more visual worlds to try with the same clear selfie, so you are not guessing from scratch every time.</p>
    <div style="margin:28px 0 14px;">${renderStoneButton("Open The Prompt Vault", vaultUrl.toString())}</div>
  `
  return {
    subject: "want more looks from one selfie?",
    html: renderStoneShell({
      eyebrow: "Selfie To AI Photos Kit",
      title: "One selfie can give you more than one look.",
      subtitle: "The Vault is the next step when you want more visual worlds.",
      bodyHtml,
      footerLead: "Start with one clear selfie. Then choose the world you want to step into.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nIf the Kit helped you get your first AI photo, the next question is usually: what else can I create?\n\nThat is where the Prompt Vault comes in.\n\nIt gives you more visual worlds to try with the same clear selfie, so you are not guessing from scratch every time.\n\nOpen the Prompt Vault: ${vaultUrl.toString()}\n\nSandra x`,
  }
}
