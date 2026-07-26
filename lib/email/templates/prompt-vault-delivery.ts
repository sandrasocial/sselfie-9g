import { renderStoneButton, renderStoneShell } from "./stone-email"
import { promptVaultLandingUrl } from "./selfie-education-links"

export function generatePromptVaultDeliveryEmail({
  firstName,
  accessUrl,
  passwordSetupUrl,
}: {
  firstName: string
  accessUrl: string
  passwordSetupUrl?: string
}) {
  const fallbackUrl = promptVaultLandingUrl()

  const vaultButton = passwordSetupUrl
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Open Your Prompt Vault", accessUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Set Your Password", passwordSetupUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Prompt Vault", accessUrl)}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Prompt Vault is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Choose the visual world you want, paste the prompt, upload one clear selfie, and start with the first shot.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Inside: every current editorial collection, from Quiet Luxury London to Dark Feminine Caf&eacute; to Denim Street. Full shot sequences, copy-paste prompts, and an example photo for each one, so you see the exact visual direction before you try it.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">And when I add a new collection, it shows up in your vault automatically. One payment. All of it.</p>
    ${vaultButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">Can't find this email later? Access your vault anytime at: <a href="${fallbackUrl}" style="color:#a8a49c;">${fallbackUrl}</a></p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">Questions? Reply here or reach us at <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a></p>
  `

  const textVaultLine = passwordSetupUrl
    ? `Set your password: ${passwordSetupUrl}\nOpen your vault: ${accessUrl}\n`
    : `Open your vault: ${accessUrl}\n`

  return {
    subject: "your prompt vault is here",
    html: renderStoneShell({
      eyebrow: "AI Photo Prompt Vault",
      title: "Your Vault is ready.",
      subtitle: "One selfie. One visual world. A shoot you can build from.",
      bodyHtml,
      footerLead: "One selfie. One world. Start there.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Prompt Vault is ready.\n\nChoose the visual world you want, paste the prompt, upload one clear selfie, and start with the first shot.\n\nInside: every current editorial collection, from Quiet Luxury London to Dark Feminine Café to Denim Street. Full shot sequences, copy-paste prompts, and an example photo for each one, so you see the exact visual direction before you try it.\n\nAnd when I add a new collection, it shows up in your vault automatically. One payment. All of it.\n\n${textVaultLine}\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
