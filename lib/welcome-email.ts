import { Resend } from "resend"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  try {
    await resend.emails.send({
      from: "Sandra <hello@sselfie.ai>",
      to: email,
      subject: `You're in, ${firstName} 🤍`,
      html: `
        <div style="font-family: 'Inter', sans-serif; max-width: 560px; margin: 0 auto; padding: 48px 24px; color: #0a0a0a; background: #ffffff;">
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">Hey ${firstName},</p>
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">You just did something most women never do. You said yes to being seen.</p>
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">Here's the thing — SSELFIE isn't just an app. It's a mirror that shows you how the world could see you, on your terms.</p>
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">Your first step: <strong>generate your first image today.</strong> It takes five minutes and I promise it'll surprise you.</p>
          <p style="margin: 32px 0;">
            <a href="https://app.sselfie.ai" style="background: #0a0a0a; color: #ffffff; padding: 14px 28px; text-decoration: none; font-size: 14px; font-weight: 300; letter-spacing: 0.05em;">OPEN SSELFIE STUDIO →</a>
          </p>
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">I'm rooting for you. Always.</p>
          <p style="font-size: 16px; line-height: 1.6; font-weight: 300;">Sandra x</p>
          <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 32px 0;" />
          <p style="font-size: 12px; color: #666666; font-weight: 300;">SSELFIE Studio · <a href="https://sselfie.ai" style="color: #666666;">sselfie.ai</a></p>
        </div>
      `,
    })
  } catch (err) {
    console.error("[welcome-email] Failed to send welcome email:", err)
  }
}
