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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Your Prompt Vault is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">33 copy-paste prompts across three editorial shoot collections. Open one, paste it into ChatGPT, upload your selfie. That's it.</p>
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:#8a8780;">Inside your vault:</p>
    <ul style="margin:0 0 20px;padding-left:20px;font-size:15px;line-height:2;color:#3a3a3a;">
      <li>Marble Café Wine Editorial — 6 shots</li>
      <li>Denim Street Editorial — 14 shots</li>
      <li>Cozy Leather + Oversized Knit Mirror Editorial — 13 shots</li>
    </ul>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Each prompt includes an example photo so you can see exactly what it produces before you try it.</p>
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
      title: "Your vault is ready.",
      subtitle: "33 editorial prompts. Copy, paste into ChatGPT, get a brand photo.",
      bodyHtml,
      footerLead: "One selfie. One prompt. One brand photo.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},\n\nYour Prompt Vault is ready.\n\n33 copy-paste prompts across three editorial shoot collections. Open one, paste it into ChatGPT, upload your selfie. That's it.\n\nInside your vault:\n- Marble Café Wine Editorial (6 shots)\n- Denim Street Editorial (14 shots)\n- Cozy Leather + Oversized Knit Mirror Editorial (13 shots)\n\nEach prompt includes an example photo so you can see what it produces.\n\n${textVaultLine}\nNeed help? Reply here or email support@sselfie.ai\n\nSandra x`,
  }
}
