// @vitest-environment node

import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

function read(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8")
}

describe("DM founder approval context", () => {
  it("binds each queued reply to the contact message it answers", () => {
    const sync = read("lib/admin/sync-approval-actions.ts")

    expect(sync).toContain("latest_contact.id AS inbound_message_id")
    expect(sync).toContain("latest_contact.content AS customer_message")
    expect(sync).toContain("m.from_type = 'contact'")
    expect(sync).toContain("inboundMessageId: conversation.inbound_message_id")
    expect(sync).toContain("customerMessage: conversation.customer_message")
  })

  it("shows the customer message before the editable suggested reply", () => {
    const page = read("app/approve/[token]/page.tsx")

    expect(page).toContain("getDmApprovalContext")
    expect(page).toContain("They wrote")
    expect(page).toContain("Suggested reply")
    expect(page.indexOf("They wrote")).toBeLessThan(page.indexOf("Suggested reply"))
  })

  it("fails closed when the incoming message cannot be verified", () => {
    const page = read("app/approve/[token]/page.tsx")

    expect(page).toContain("The original customer message could not be loaded")
    expect(page).toContain("!dmContext")
  })
})
