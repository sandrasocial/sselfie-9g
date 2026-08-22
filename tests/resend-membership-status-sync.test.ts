// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()
const route = fs.readFileSync(
  path.join(ROOT, "app/api/cron/resend-membership-status-sync/route.ts"),
  "utf8",
)

describe("Resend membership status sync", () => {
  it("updates existing contacts without creating or emailing them", () => {
    expect(route).toContain('import { updateContactTags } from "@/lib/resend/manage-contact"')
    expect(route).not.toContain("addOrUpdateResendContact")
    expect(route).not.toContain("sendEmail(")
    expect(route).not.toContain("create-contact")
  })

  it("keeps current and billing-risk statuses ahead of historical cancellations", () => {
    expect(route).toContain("WHEN 'active' THEN 1")
    expect(route).toContain("WHEN 'trialing' THEN 2")
    expect(route).toContain("WHEN 'past_due' THEN 3")
    expect(route).toContain("WHEN 'unpaid' THEN 4")
    expect(route).toContain("truth.source_updated_at DESC")
    expect(route).toContain("s.updated_at >= ${ROLLOUT_START}::timestamptz")
  })

  it("backs off a missing marketing contact instead of treating it as synced", () => {
    expect(route).toContain("contactNotFound")
    expect(route).toContain('await recordFailure(candidate, "contact_not_found")')
    expect(route).toContain("retry_after = NOW() + INTERVAL '24 hours'")
    expect(route).toContain("last_error = EXCLUDED.last_error")
    expect(route).toContain("failure_count = resend_membership_status_sync_state.failure_count + 1")
  })

  it("prioritizes untouched or newly changed contacts ahead of retry rows", () => {
    expect(route).toContain("WHEN sync.email IS NULL THEN 0")
    expect(route).toContain("truth.source_updated_at > sync.source_updated_at")
    expect(route).toContain("sync.retry_after IS NULL OR sync.retry_after <= NOW()")
  })

  it("stores current membership state separately from historical lifecycle stage", () => {
    expect(route).toContain('lifecycle_stage: "member"')
    expect(route).toContain("membership_status: candidate.status")
    expect(route).toContain('primary_interest: "all"')
  })
})
