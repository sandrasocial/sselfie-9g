// Email sending utilities using fetch to external email service
// In production, you would integrate with Resend, SendGrid, or similar

export interface EmailOptions {
  to: string | string[]
  subject: string
  html: string
  text: string
  from?: string
  replyTo?: string
  tags?: string[]
}

export async function sendEmail(
  options: EmailOptions,
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    console.log("[v0] Sending email:", { to: options.to, subject: options.subject })

    // For now, we'll log the email instead of actually sending
    // In production, integrate with Resend or similar service
    console.log("[v0] Email content:", {
      from: options.from || "sandra@ssasocial.com",
      to: options.to,
      subject: options.subject,
      textLength: options.text.length,
      htmlLength: options.html.length,
    })

    // Simulate successful send
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    }
  } catch (error) {
    console.error("[v0] Error sending email:", error)
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    }
  }
}

export async function sendBulkEmails(
  recipients: string[],
  subject: string,
  html: string,
  text: string,
): Promise<{ sent: number; failed: number; errors: string[] }> {
  const results = {
    sent: 0,
    failed: 0,
    errors: [] as string[],
  }

  for (const recipient of recipients) {
    const result = await sendEmail({
      to: recipient,
      subject,
      html,
      text,
    })

    if (result.success) {
      results.sent++
    } else {
      results.failed++
      results.errors.push(`${recipient}: ${result.error}`)
    }

    // Rate limiting: wait 100ms between sends
    await new Promise((resolve) => setTimeout(resolve, 100))
  }

  return results
}
