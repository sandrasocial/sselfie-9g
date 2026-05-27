import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"

export const PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE = "prompt-vault-checkout-recovery"

export function generatePromptVaultCheckoutRecoveryEmail({
  firstName: _firstName,
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

  const bodyHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#ffffff;font-family:Arial,Helvetica,sans-serif;color:#111111;">
  <div style="max-width:560px;margin:0 auto;padding:32px 22px;font-size:16px;line-height:1.75;">
    Hey babe 🫶🏼<br><br>
    You were SO close to unlocking VAULT 😭✨<br><br>
    Inside are all the cinematic, luxury, dark feminine, glam, mirror selfie, and main-character-style prompts I’ve been obsessing over lately…<br><br>
    And honestly? I keep adding more because I literally can’t stop making them 😂💋<br><br>
    If you still want in, here’s your link:<br><br>
    <a href="${checkoutUrl}" style="color:#111111;text-decoration:underline;">${checkoutUrl}</a><br><br>
    🤍<br>
    Sandra
  </div>
</body>
</html>`

  return {
    subject: "your transformation is waiting",
    html: bodyHtml,
    text: `Hey babe 🫶🏼

You were SO close to unlocking VAULT 😭✨

Inside are all the cinematic, luxury, dark feminine, glam, mirror selfie, and main-character-style prompts I’ve been obsessing over lately…

And honestly? I keep adding more because I literally can’t stop making them 😂💋

If you still want in, here’s your link:

${checkoutUrl}

🤍
Sandra`,
  }
}
