/**
 * Fixed-scope safety guard for the already-approved August 2026 Prompt Vault proof event.
 *
 * Default: read-only provider audit.
 * Stop: removes only the three known broadcasts that are still scheduled, and only
 * when the caller supplies the explicit approved-event confirmation and a safety reason.
 */

/* eslint-disable no-console -- aggregate CLI status only */

import * as dotenv from "dotenv"
import { Resend } from "resend"

dotenv.config({ path: process.env.SSELFIE_ENV_PATH || ".env.local" })

const APPROVED_BROADCAST_IDS = [
  "fa3ec7a9-bf83-427f-b561-ec34f99f2c4f",
  "34ac74a1-5216-45d1-9665-885815debfde",
  "8d6e9101-c4fd-468a-8d16-ea197fc56a1b",
] as const
const CONFIRMATION = "approved-proof-event-guard-2026-08"
const ALLOWED_REASONS = new Set(["checkout", "fulfillment", "provider", "complaint"])

function arg(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] || null : null
}

function requiredEnv(name: string): string {
  const value = String(process.env[name] || "").replace(/\r|\n|\t/g, "").trim()
  if (!value) throw new Error(`${name} is required`)
  return value
}

async function main() {
  const resend = new Resend(requiredEnv("RESEND_API_KEY"))
  const stop = process.argv.includes("--stop-scheduled")
  const reason = arg("--reason")
  const confirmation = arg("--confirm")

  if (stop && (!reason || !ALLOWED_REASONS.has(reason) || confirmation !== CONFIRMATION)) {
    throw new Error("Stopping requires an approved safety reason and the exact event confirmation")
  }

  const states = await Promise.all(APPROVED_BROADCAST_IDS.map(async broadcastId => {
    const { data, error } = await resend.broadcasts.get(broadcastId)
    if (error || !data) throw new Error(`Unable to verify approved broadcast ${broadcastId}`)
    return { broadcastId, status: String((data as unknown as Record<string, unknown>).status || "unknown") }
  }))

  // Resend's live API has returned `scheduled` while the installed SDK names the
  // pre-send state `queued`. Treat both as pending, and never touch sent or draft work.
  const scheduled = states.filter(item => item.status === "scheduled" || item.status === "queued")
  if (stop) {
    for (const item of scheduled) {
      const { error } = await resend.broadcasts.remove(item.broadcastId)
      if (error) throw new Error(`Unable to stop approved broadcast ${item.broadcastId}`)
      const after = await resend.broadcasts.get(item.broadcastId)
      const afterStatus = after.data
        ? String((after.data as unknown as Record<string, unknown>).status || "unknown")
        : null
      if (afterStatus === "scheduled" || afterStatus === "queued") {
        throw new Error(`Approved broadcast ${item.broadcastId} is still queued after stop`)
      }
    }
  }

  const counts = states.reduce<Record<string, number>>((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1
    return result
  }, {})
  console.log(`[prompt-vault-proof-event] mode=${stop ? "stop" : "audit"}`)
  console.log(`[prompt-vault-proof-event] provider-states=${JSON.stringify(counts)}`)
  console.log(`[prompt-vault-proof-event] scheduled-found=${scheduled.length}`)
  if (stop) console.log(`[prompt-vault-proof-event] stopped=${scheduled.length}; reason=${reason}`)
}

main().catch(error => {
  console.error("[prompt-vault-proof-event] failed", error instanceof Error ? error.message : error)
  process.exitCode = 1
})
