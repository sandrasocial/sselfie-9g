/**
 * Creates the three attended One Selfie launch broadcasts as Resend drafts.
 *
 * This script is deliberately idempotent and never sends. Sandra reviews and
 * approves each draft through the existing Admin approval page.
 */
import { config } from "dotenv"
import { Resend } from "resend"
import {
  generateOneSelfieVisibilityInsideEmail,
  generateOneSelfieVisibilityLastCallEmail,
  generateOneSelfieVisibilityOpenEmail,
} from "../lib/email/templates/one-selfie-visibility-launch"

config({ path: ".env.local" })

const apiKey = process.env.RESEND_API_KEY?.trim()
const audienceId = process.env.RESEND_AUDIENCE_ID?.trim()
const from = "Sandra from SSELFIE <hello@sselfie.ai>"
const replyTo = "hello@sselfie.ai"
const firstName = "{{{contact.first_name|there}}}"

if (!apiKey || !audienceId) {
  throw new Error("RESEND_API_KEY and RESEND_AUDIENCE_ID are required")
}

const campaigns = [
  {
    name: "Launch · One Selfie · 1 Open",
    content: generateOneSelfieVisibilityOpenEmail({ firstName }),
  },
  {
    name: "Launch · One Selfie · 2 Inside",
    content: generateOneSelfieVisibilityInsideEmail({ firstName }),
  },
  {
    name: "Launch · One Selfie · 3 Last call",
    content: generateOneSelfieVisibilityLastCallEmail({ firstName }),
  },
] as const

async function main() {
  const resend = new Resend(apiKey)
  const listed = await resend.broadcasts.list()
  if (listed.error) throw new Error(`Could not list Resend broadcasts: ${listed.error.message}`)

  const existing = new Map(
    (((listed.data as any)?.data || []) as Array<Record<string, unknown>>).map((broadcast) => [
      String(broadcast.name || ""),
      { id: String(broadcast.id || ""), status: String(broadcast.status || "") },
    ]),
  )

  for (const campaign of campaigns) {
    const match = existing.get(campaign.name)
    if (match?.id) {
      if (match.status !== "draft") {
        console.log(`UNCHANGED ${campaign.name} ${match.id} (${match.status})`)
        continue
      }

      const updated = await resend.broadcasts.update(match.id, {
        audienceId,
        from,
        replyTo: [replyTo],
        name: campaign.name,
        subject: campaign.content.subject,
        html: campaign.content.html,
        text: campaign.content.text,
      })
      if (updated.error) {
        throw new Error(`Could not update ${campaign.name}: ${updated.error.message}`)
      }
      console.log(`UPDATED ${campaign.name} ${match.id}`)
      await new Promise((resolve) => setTimeout(resolve, 650))
      continue
    }

    const created = await resend.broadcasts.create({
      audienceId,
      from,
      replyTo,
      name: campaign.name,
      subject: campaign.content.subject,
      html: campaign.content.html,
      text: campaign.content.text,
    })
    if (created.error) throw new Error(`Could not create ${campaign.name}: ${created.error.message}`)
    console.log(`DRAFT ${campaign.name} ${created.data?.id}`)
    await new Promise((resolve) => setTimeout(resolve, 650))
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
