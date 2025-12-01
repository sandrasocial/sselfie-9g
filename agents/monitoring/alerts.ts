/**
 * Critical Failure Alerts
 * Sends email alerts for critical agent failures
 */

import { sendEmail } from "@/lib/email/resend"

/**
 * Check if an error is recoverable (network/timeout errors)
 */
export function isRecoverable(error: unknown): boolean {
  if (!error) return false

  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorCode = (error as any)?.code

  return (
    errorMessage.includes("timeout") ||
    errorMessage.includes("network") ||
    errorMessage.includes("ECONNRESET") ||
    errorMessage.includes("ETIMEDOUT") ||
    errorCode === "ECONNRESET" ||
    errorCode === "ETIMEDOUT"
  )
}

/**
 * Send critical alert email for agent failures
 */
export async function sendCriticalAlert(agentName: string, error: string): Promise<void> {
  try {
    const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || "ssa@ssasocial.com"

    await sendEmail({
      to: adminEmail,
      subject: `SSELFIE Agent FAILURE: ${agentName}`,
      html: `
        <h2>🔥 Critical Agent Failure</h2>
        <p><strong>Agent:</strong> ${agentName}</p>
        <p><strong>Error:</strong> ${error}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p><strong>Action Required:</strong> Please review the agent logs and system status.</p>
      `,
    })

    console.log(`[ALERT] Critical alert sent for ${agentName}`)
  } catch (err) {
    console.error("[ALERT FAILED] Could not send critical alert:", err)
  }
}

/**
 * Retry with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000,
): Promise<T> {
  let lastError: unknown

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Only retry if error is recoverable
      if (!isRecoverable(error)) {
        throw error
      }

      // Don't retry on last attempt
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt)
        console.log(`[RETRY] Attempt ${attempt + 1}/${maxRetries} failed, retrying in ${delay}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

