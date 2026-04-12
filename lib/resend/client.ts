import { Resend } from "resend"
import { getResendApiKey, hasResendApiKey } from "./api-key"

let resendClient: Resend | null | undefined

export function getResendClient(): Resend | null {
  if (resendClient !== undefined) {
    return resendClient
  }

  resendClient = hasResendApiKey() ? new Resend(getResendApiKey()) : null
  return resendClient
}

export function requireResendClient(): Resend {
  const client = getResendClient()

  if (!client) {
    throw new Error("RESEND_API_KEY not configured")
  }

  return client
}
