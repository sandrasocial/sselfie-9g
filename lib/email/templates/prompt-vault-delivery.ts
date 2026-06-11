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
    ? `<div style="margin:20px 0 10px;">${renderStoneButton("Set Your Password", passwordSetupUrl)}</div>
       <div style="margin:8px 0 0;">${renderStoneButton("Open Your Prompt Vault", accessUrl, "outline")}</div>`
    : `<div style="margin:20px 0 0;">${renderStoneButton("Open Your Prompt Vault", accessUrl, "outline")}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your selfie transformations are ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Choose the aesthetic you want, paste it into ChatGPT, upload one selfie, and let it become the whole photoshoot.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Inside: every current editorial collection, from Quiet Luxury London to Dark Feminine Caf&eacute; to Denim Street. Full shot sequences, copy-paste prompts, and an example photo for each one so you see the exact visual direction before you try it.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">And when I add a new collection, it shows up in your vault automatically. One payment, all of it.</p>
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
      title: "Your transformations are ready.",
      subtitle: "One selfie can become the whole photoshoot.",
      bodyHtml,
      footerLead: "One selfie. Unlimited photoshoots.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour selfie transformations are ready.\n\nChoose the aesthetic you want, paste it into ChatGPT, upload one selfie, and let it become the whole photoshoot.\n\nInside: every current editorial collection, from Quiet Luxury London to Dark Feminine Café to Denim Street. Full shot sequences, copy-paste prompts, and an example photo for each one so you see the exact visual direction before you try it.\n\nAnd when I add a new collection, it shows up in your vault automatically. One payment, all of it.\n\n${textVaultLine}\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
