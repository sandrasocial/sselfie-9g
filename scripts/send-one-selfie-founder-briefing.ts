/**
 * One attended, founder-only briefing send. This is not a list broadcast or automation.
 */
import { config } from "dotenv"

config({ path: ".env.local" })

async function main() {
  const [{ sendEmail }, { generateOneSelfieFounderBriefing }] = await Promise.all([
    import("../lib/email/send-email"),
    import("../lib/email/templates/one-selfie-founder-briefing"),
  ])
  const to = (process.env.ADMIN_EMAIL || "ssa@ssasocial.com").trim().toLowerCase()
  const briefing = generateOneSelfieFounderBriefing()
  const result = await sendEmail({
    to,
    from: "SSELFIE Operations <hello@sselfie.ai>",
    replyTo: "hello@sselfie.ai",
    subject: briefing.subject,
    html: briefing.html,
    text: briefing.text,
    emailType: "one_selfie_founder_briefing",
    tags: ["admin", "one-selfie-launch"],
    idempotencyKey: "one-selfie-founder-briefing-2026-07-13",
  })

  if (!result.success) {
    throw new Error(result.error || "Could not send founder briefing")
  }

  console.log(`Founder briefing sent: ${result.messageId || "accepted"}`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
