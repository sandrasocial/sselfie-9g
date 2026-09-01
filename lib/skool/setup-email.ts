import { requireResendClient } from "@/lib/resend/client"

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export async function sendSkoolSetupEmail(input: {
  email: string
  recoveryLink: string
  membershipKey: string
  billingPeriodKey: string
}): Promise<{ messageId: string | null }> {
  const recoveryLink = input.recoveryLink.trim()
  if (!recoveryLink.startsWith("https://")) {
    throw new Error("SKOOL_SETUP_EMAIL_FAILED")
  }

  const resend = requireResendClient()
  const safeLink = escapeHtml(recoveryLink)
  const subject = "Your SSELFIE access is ready 🤍"
  const text = [
    "Hey 🤍",
    "",
    "Your SSELFIE access is ready.",
    "",
    "Because you joined through Skool, SSELFIE Suite + Maya are included. You do not need to buy or pay for Suite again.",
    "",
    "Use this private link to finish setting up your SSELFIE account:",
    recoveryLink,
    "",
    "Once your password is set, you will land inside SSELFIE and can start creating.",
    "",
    "Sandra x",
  ].join("\n")
  const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;background-color:#ffffff;"><table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#ffffff;"><tr><td align="center" style="padding-top:28px;padding-right:20px;padding-bottom:44px;padding-left:20px;"><table width="560" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:560px;"><tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;"><p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;">Hey 🤍</p><p style="font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:30px;color:#171719;margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;"><strong>Your SSELFIE access is ready.</strong></p><p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;">Because you joined through Skool, SSELFIE Suite + Maya are included. You do not need to buy or pay for Suite again.</p><p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;margin-top:0;margin-right:0;margin-bottom:22px;margin-left:0;">Use this private link to finish setting up your SSELFIE account:</p></td></tr><tr><td align="left" style="padding-top:0;padding-right:0;padding-bottom:24px;padding-left:0;"><a href="${safeLink}" style="font-family:Arial,Helvetica,sans-serif;font-size:12px;line-height:18px;color:#ffffff;background-color:#171719;text-decoration:none;display:inline-block;padding-top:14px;padding-right:22px;padding-bottom:14px;padding-left:22px;letter-spacing:1px;">SET UP MY SSELFIE ACCOUNT →</a></td></tr><tr><td style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;"><p style="font-family:Georgia,'Times New Roman',serif;font-size:16px;line-height:29px;color:#282728;margin-top:0;margin-right:0;margin-bottom:18px;margin-left:0;">Once your password is set, you will land inside SSELFIE and can start creating.</p><p style="font-family:Georgia,'Times New Roman',serif;font-size:17px;line-height:28px;color:#0D0E10;font-style:italic;margin-top:0;margin-right:0;margin-bottom:0;margin-left:0;">Sandra x</p></td></tr></table></td></tr></table></body></html>`

  const { data, error } = await resend.emails.send(
    {
      from: "Sandra from SSELFIE <hello@sselfie.ai>",
      to: [input.email],
      subject,
      text,
      html,
      replyTo: "hello@sselfie.ai",
    },
    {
      idempotencyKey:
        `skool-setup:${input.membershipKey}:${input.billingPeriodKey}`,
    },
  )

  if (error) {
    throw new Error("SKOOL_SETUP_EMAIL_FAILED")
  }

  return { messageId: data?.id ?? null }
}
