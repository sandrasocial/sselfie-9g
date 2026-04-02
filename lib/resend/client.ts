import { Resend } from "resend"

let resendClient: Resend | null | undefined

export function getResendClient(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient
  }

  resendClient = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null
  return resendClient
}

export function requireResendClient(): Resend {
  const client = getResendClient()

  if (!client) {
    throw new Error("RESEND_API_KEY not configured")
  }

  return client
}
