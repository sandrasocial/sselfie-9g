import { buildRevenueEmailLink } from "./revenue-links"
import { promptVaultCheckoutUrl } from "./selfie-education-links"
import {
  renderPersonalLink,
  renderPersonalNote,
  renderStoneButton,
  renderStoneShell,
} from "./stone-email"

export const PROMPT_VAULT_CHECKOUT_RECOVERY_EMAIL_TYPE = "prompt-vault-checkout-recovery"
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
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">You started checking out with the Prompt Vault but did not finish, so I am sending the link back in case something interrupted you.</p>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">The Vault is $37 once. You get every current prompt collection, an example photo for every prompt, and the new prompt drops I add later.</p>
    <div style="margin:26px 0 22px;">${renderStoneButton("Return to checkout", checkoutUrl)}</div>
    <p style="margin:0 0 16px;font-size:16px;line-height:1.75;">If checkout gave you trouble, reply and tell me what happened. I&apos;ll help.</p>
    <p style="margin:0;font-size:16px;line-height:1.75;">If you were only looking, that is completely fine too.</p>
  `

  return {
    subject: "here is your Prompt Vault link",
    html: renderStoneShell({
      title: "Here is your Prompt Vault link.",
      eyebrow: "Prompt Vault",
      subtitle: "Use it if you still want to finish your order.",
      bodyHtml,
      footerLead: "Reply if checkout gave you trouble.",
      footerSignoff: "Sandra x",
    }),
    text: `Hi ${firstName},

You started checking out with the Prompt Vault but did not finish, so I am sending the link back in case something interrupted you.

The Vault is $37 once. You get every current prompt collection, an example photo for every prompt, and the new prompt drops I add later.

Return to checkout:
${checkoutUrl}

If checkout gave you trouble, reply and tell me what happened. I'll help.

If you were only looking, that is completely fine too.

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
    content: "recovery_2_product_truth",
    emailType: PROMPT_VAULT_CHECKOUT_RECOVERY_2_EMAIL_TYPE,
    checkoutEmail: recipientEmail,
  })

  const bodyHtml = `
    <p style="margin:0 0 18px;">Hi ${firstName},</p>
    <p style="margin:0 0 18px;">Before you decide about the Prompt Vault, I want to make the difference clear.</p>
    <p style="margin:0 0 18px;">The five free prompts give you five individual photos to try. The Vault gives you the complete collections, so you can create several photos that look like they came from the same shoot.</p>
    <p style="margin:0 0 18px;">You still copy the prompts into ChatGPT yourself. The Vault gives you the finished prompts and an example photo for each one, so you do not have to work out what to ask for.</p>
    <p style="margin:0 0 18px;">It is $37 once, not a subscription. ${renderPersonalLink("You can finish your order here", checkoutUrl)}.</p>
    <p style="margin:0;">If that is not what you need, keep using the free prompts. They are yours.</p>
  `

  return {
    subject: "what you get inside the Prompt Vault",
    html: renderPersonalNote({ title: "What you get inside the Prompt Vault", bodyHtml }),
    text: `Hi ${firstName},

Before you decide about the Prompt Vault, I want to make the difference clear.

The five free prompts give you five individual photos to try. The Vault gives you the complete collections, so you can create several photos that look like they came from the same shoot.

You still copy the prompts into ChatGPT yourself. The Vault gives you the finished prompts and an example photo for each one, so you do not have to work out what to ask for.

It is $37 once, not a subscription. You can finish your order here:
${checkoutUrl}

If that is not what you need, keep using the free prompts. They are yours.

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
    <p style="margin:0 0 18px;">This is my last email about the checkout you started.</p>
    <p style="margin:0 0 18px;">If you still want the Prompt Vault, ${renderPersonalLink("your checkout link is here", checkoutUrl)}. It is $37 once, and the new prompt drops I add later are included.</p>
    <p style="margin:0 0 18px;">If the timing is not right, leave it. There is no deadline and the five free prompts are still yours to use.</p>
    <p style="margin:0;">If something went wrong at checkout, reply and I&apos;ll help.</p>
  `

  return {
    subject: "last note about your Prompt Vault checkout",
    html: renderPersonalNote({ title: "Last note about your Prompt Vault checkout", bodyHtml }),
    text: `Hi ${firstName},

This is my last email about the checkout you started.

If you still want the Prompt Vault, your checkout link is here:
${checkoutUrl}

It is $37 once, and the new prompt drops I add later are included.

If the timing is not right, leave it. There is no deadline and the five free prompts are still yours to use.

If something went wrong at checkout, reply and I'll help.

Sandra x`,
  }
}
