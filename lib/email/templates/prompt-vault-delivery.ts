import { renderStoneButton, renderStoneShell } from "./stone-email"
import { accessRecoveryUrl } from "./selfie-education-links"

export function generatePromptVaultDeliveryEmail({
  firstName,
  accessUrl,
}: {
  firstName: string
  accessUrl: string
  passwordSetupUrl?: string
}) {
  const fallbackUrl = accessRecoveryUrl()
  const vaultButton = `<div style="margin:20px 0 0;">${renderStoneButton("Open my Prompt Vault", accessUrl)}</div>`

  const bodyHtml = `
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">Thank you. Your Prompt Vault is ready.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;"><strong>Keep this email.</strong> The button below is your private access link, and you do not need to create a login.</p>
    <p style="margin:0 0 10px;font-size:16px;line-height:1.8;">To create your first photo:</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.8;">1. Open the Vault and choose a photo you love.<br />2. Tap Copy prompt.<br />3. Upload one clear selfie to ChatGPT and paste the prompt.</p>
    <p style="margin:0 0 16px;font-size:15px;line-height:1.8;">Every collection includes a complete photo sequence and an example image for every prompt. When I add a new prompt collection, it will appear in your Vault automatically.</p>
    ${vaultButton}
    <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#a8a49c;">If you cannot find this email later, start at <a href="${fallbackUrl}" style="color:#a8a49c;">${fallbackUrl}</a> and enter the email address you used at checkout.</p>
    <p style="margin:12px 0 0;font-size:14px;line-height:1.7;color:#8a8780;">If you need help, reply here or email <a href="mailto:support@sselfie.ai" style="color:#8a8780;">support@sselfie.ai</a>.</p>
  `

  return {
    subject: "your Prompt Vault is ready",
    html: renderStoneShell({
      eyebrow: "Prompt Vault",
      title: "Your Prompt Vault is ready.",
      subtitle: "Choose one photo you love and start there.",
      bodyHtml,
      footerLead: "You do not need to create everything today. One photo is enough to begin.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

Thank you. Your Prompt Vault is ready.

Keep this email. The link below is your private access link, and you do not need to create a login.

To create your first photo:
1. Open the Vault and choose a photo you love.
2. Tap Copy prompt.
3. Upload one clear selfie to ChatGPT and paste the prompt.

Every collection includes a complete photo sequence and an example image for every prompt. When I add a new prompt collection, it will appear in your Vault automatically.

Open my Prompt Vault: ${accessUrl}

If you cannot find this email later, start at ${fallbackUrl} and enter the email address you used at checkout.

If you need help, reply here or email support@sselfie.ai.

Sandra x`,
  }
}
