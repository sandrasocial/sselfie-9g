import { Resend } from "resend"
import { generateWelcomeEmail } from "@/lib/email/templates/welcome-email"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  try {
    const content = generateWelcomeEmail({
      customerName: firstName,
      customerEmail: email,
      creditsGranted: 200,
      packageName: "STUDIO MEMBERSHIP",
      productType: "sselfie_studio_membership",
    })

    await resend.emails.send({
      from: "Sandra <hello@sselfie.ai>",
      to: email,
      subject: `You're in, ${firstName} 🤍`,
      html: content.html,
    })
  } catch (err) {
    console.error("[welcome-email] Failed to send welcome email:", err)
  }
}
