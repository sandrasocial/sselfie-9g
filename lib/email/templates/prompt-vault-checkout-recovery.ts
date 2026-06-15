import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import {
  renderPersonalLink,
  renderPersonalNote,
  renderStoneButton,
  renderStonePanel,
  renderStoneShell,
} from "./stone-email"

export const PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE = "prompt-vault-checkout-recovery"
// Follow-up touches (EMAIL-02, 2026-06-11): 3-email recovery is the benchmark — Klaviyo data
// shows 6.5x the recovered revenue of a single email. Stage 2 at +24h (what it feels like to
// use it), stage 3 at +72h (a quiet last note). Personal-note format on purpose: recovery
// converts best when it reads like Sandra, not like a brand.
export const PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE = "prompt-vault-checkout-recovery-2"
export const PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE = "prompt-vault-checkout-recovery-3"

export function generatePromptVaultCheckoutRecoveryEmail({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "prompt_vault_checkout_recovery",
    content: "return_to_checkout",
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
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
    subject: "you were one tap from your vault 👀",
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

export function generatePromptVaultRecovery2Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "prompt_vault_checkout_recovery",
    content: "recovery_2_social_proof",
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">Yesterday you were a click away from the Prompt Vault, so I'm sending the link back in case life got in the way.</p>
    <p style="margin:0 0 18px;">Here's what usually happens next: you pick one photoshoot world, paste the prompt into ChatGPT, add one selfie. Ten minutes later you have a set of photos that look like a quiet luxury morning in London or a dark balcony over the city. Still your face. Still you. Just elevated.</p>
    <p style="margin:0 0 18px;">AI should not erase you. It should frame you. That's the whole point of the Vault.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Get the Prompt Vault here", checkoutUrl)} ($27, once).</p>
    <p style="margin:0;">Every new collection I add lands in your vault automatically.</p>
  `

  return {
    subject: "what happens after one selfie",
    html: renderPersonalNote({ title: "What happens after one selfie", bodyHtml }),
    text: `Hi ${firstName},

Yesterday you were a click away from the Prompt Vault, so I'm sending the link back in case life got in the way.

Here's what usually happens next: you pick one photoshoot world, paste the prompt into ChatGPT, add one selfie. Ten minutes later you have a set of photos that look like a quiet luxury morning in London or a dark balcony over the city. Still your face. Still you. Just elevated.

AI should not erase you. It should frame you. That's the whole point of the Vault.

Get the Prompt Vault ($27, once):
${checkoutUrl}

Every new collection I add lands in your vault automatically.

Sandra x`,
  }
}

export function generatePromptVaultRecovery3Email({
  firstName,
  recipientEmail,
}: {
  firstName: string
  recipientEmail?: string | null
}) {
  const checkoutUrl = buildRevenueEmailLink(promptVaultCheckoutUrl(), {
    source: "email",
    medium: "checkout_recovery",
    campaign: "prompt_vault_checkout_recovery",
    content: "recovery_3_last_note",
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_3_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">Last note from me about the Prompt Vault, I promise.</p>
    <p style="margin:0 0 18px;">If checkout gave you trouble or the timing was off, just reply. A real person answers, usually me.</p>
    <p style="margin:0 0 18px;">And if you were waiting for a sign: one selfie, every editorial collection, $27 once. New drops included forever.</p>
    <p style="margin:0 0 18px;">${renderPersonalLink("Here's the link", checkoutUrl)}.</p>
    <p style="margin:0;">Either way, I'm glad you're here.</p>
  `

  return {
    subject: "last note about the vault",
    html: renderPersonalNote({ title: "Last note about the vault", bodyHtml }),
    text: `Hi ${firstName},

Last note from me about the Prompt Vault, I promise.

If checkout gave you trouble or the timing was off, just reply. A real person answers, usually me.

And if you were waiting for a sign: one selfie, every editorial collection, $27 once. New drops included forever.

Here's the link:
${checkoutUrl}

Either way, I'm glad you're here.

Sandra x`,
  }
}
