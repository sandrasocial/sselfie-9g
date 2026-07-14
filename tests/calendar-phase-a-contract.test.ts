import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar Phase A operational contracts", () => {
  it("keeps bulk image work inside the supported function window", () => {
    const route = read("app/api/feed-planner/queue-all-images/route.ts")
    expect(route).toContain("export const maxDuration = 300")
  })

  it("claims, charges, refunds, and recovers bulk posts individually", () => {
    const queue = read("lib/feed-planner/queue-images.ts")
    expect(queue).toContain("RETURNING id")
    expect(queue).toContain("updated_at < NOW() - INTERVAL '10 minutes'")
    expect(queue).toContain("await deductCredits(")
    expect(queue).toContain("await refundCredits(")
    expect(queue).not.toContain("Deduct credits once for all successful generations")
  })

  it("never sends an in-app calendar action to the retired Studio route", () => {
    const files = [
      "components/feed-planner/feed-post-card.tsx",
      "components/feed-planner/feed-view-screen.tsx",
      "components/feed-planner/hooks/use-feed-actions.ts",
      "app/feed-planner/feed-planner-client.tsx",
    ]
    for (const file of files) expect(read(file)).not.toContain("/studio#maya/feed")
  })

  it("selects this month's eligible calendar owners deterministically", () => {
    const cron = read("app/api/cron/feed-plan-monthly-draft/route.ts")
    expect(cron).not.toContain("previousPeriodMonth")
    expect(cron).toContain("ORDER BY u.id")
    expect(cron).toContain("paid_blueprint_purchased = TRUE")
    expect(cron).toContain("product_type IN")
  })
})
