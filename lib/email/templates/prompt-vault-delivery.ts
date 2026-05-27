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
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your vault:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>Dark Feminine Caf&eacute; Coffee-Run Editorial</li>
      <li>Dark Balcony Luxury City Editorial</li>
      <li>Coastal White Dress Sunset Editorial</li>
      <li>Marble Café Wine Editorial</li>
      <li>Soft Blazer + Light Denim Street Editorial</li>
      <li>Cozy Leather + Oversized Knit Mirror Editorial</li>
    </ul>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Each transformation includes an example photo so you can see the exact visual direction before you try it.</p>
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
    text: `Hi ${firstName},\n\nYour selfie transformations are ready.\n\nChoose the aesthetic you want, paste it into ChatGPT, upload one selfie, and let it become the whole photoshoot.\n\nInside your vault:\n- Dark Feminine Café Coffee-Run Editorial
- Dark Balcony Luxury City Editorial\n- Coastal White Dress Sunset Editorial\n- Marble Café Wine Editorial\n- Soft Blazer + Light Denim Street Editorial\n- Cozy Leather + Oversized Knit Mirror Editorial\n\nEach transformation includes an example photo so you can see the visual direction before you try it.\n\n${textVaultLine}\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
