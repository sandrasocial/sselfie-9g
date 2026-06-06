import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import { renderStoneButton, renderStonePanel, renderStoneShell } from "./stone-email"

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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">Hi ${firstName},</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You were looking at the Prompt Vault, so I wanted to send the link back to you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The free prompt shows you what one selfie can become. The Vault gives you the full set of visual directions to keep creating from that same starting point.</p>
    ${renderStonePanel(
      `<p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Use it when you want more than one random AI image.</p>
       <p style="margin:0 0 10px;font-size:15px;line-height:1.8;">Choose a photoshoot world, copy the prompt, upload your selfie, and start testing the version of you that actually feels exciting to post.</p>
       <p style="margin:0;font-size:15px;line-height:1.8;">Simple. Visual. No overthinking.</p>`,
      "What the Vault helps with"
    )}
    <div style="margin:26px 0 22px;">${renderStoneButton("Get the Prompt Vault", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If you were just browsing, that is completely okay.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">But if you still want the prompts, this is the easiest place to start.</p>
  `

  return {
    subject: "here is the vault link",
    html: renderStoneShell({
      title: "Here is the Vault link.",
      eyebrow: "Prompt Vault",
      subtitle: "A simple way back to the prompts you were looking at.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

You were looking at the Prompt Vault, so I wanted to send the link back to you.

The free prompt shows you what one selfie can become. The Vault gives you the full set of visual directions to keep creating from that same starting point.

What the Vault helps with:
- Use it when you want more than one random AI image.
- Choose a photoshoot world, copy the prompt, upload your selfie, and start testing the version of you that actually feels exciting to post.
- Simple. Visual. No overthinking.

Get the Prompt Vault:
${checkoutUrl}

If you were just browsing, that is completely okay.

But if you still want the prompts, this is the easiest place to start.

Reply if checkout gave you trouble.

Sandra x`,
  }
}
