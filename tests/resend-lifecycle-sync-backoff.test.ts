// @vitest-environment node

import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const route = fs.readFileSync(
  path.join(process.cwd(), "app/api/cron/resend-lifecycle-sync/route.ts"),
  "utf8",
)

describe("Resend lifecycle backfill retry safety", () => {
  it("backs off failures instead of retrying them every hourly batch", () => {
    expect(route).toContain("retry_after TIMESTAMPTZ")
    expect(route).toContain("failure_count INTEGER NOT NULL DEFAULT 0")
    expect(route).toContain("retry_after = NOW() + INTERVAL '24 hours'")
    expect(route).toContain("sync.retry_after IS NULL OR sync.retry_after <= NOW()")
  })

  it("prioritizes untouched and newly changed contacts before retry rows", () => {
    expect(route).toContain("WHEN sync.email IS NULL THEN 0")
    expect(route).toContain("e.source_updated_at > sync.source_updated_at")
    expect(route).toContain("ELSE 2")
  })

  it("still keeps historical backfill disabled unless explicitly enabled", () => {
    expect(route).toContain("RESEND_LIFECYCLE_BACKFILL_ENABLED")
    expect(route).toContain("disabled: true")
  })
})
