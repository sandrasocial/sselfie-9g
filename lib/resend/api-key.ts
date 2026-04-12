/**
 * Production Resend API key from env.
 * Vercel/dashboard copies sometimes include a trailing newline, which breaks Bearer auth.
 */
export function getResendApiKey(): string {
  return (process.env.RESEND_API_KEY ?? "").replace(/\r|\n|\t/g, "").trim()
}

export function hasResendApiKey(): boolean {
  return getResendApiKey().length > 0
}
