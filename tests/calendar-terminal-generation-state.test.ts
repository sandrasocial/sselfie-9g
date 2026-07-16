import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"
import { isFeedPostGenerating } from "@/components/feed-planner/hooks/feed-generation-state"

const read = (path: string) => readFileSync(path, "utf8")

describe("Calendar terminal generation state", () => {
  it("never polls a failed or cancelled prediction", () => {
    expect(
      isFeedPostGenerating({ prediction_id: "pred_failed", image_url: null, generation_status: "failed" }),
    ).toBe(false)
    expect(
      isFeedPostGenerating({ prediction_id: "pred_cancelled", image_url: null, generation_status: "cancelled" }),
    ).toBe(false)
    expect(
      isFeedPostGenerating({ prediction_id: "pred_live", image_url: null, generation_status: "generating" }),
    ).toBe(true)
  })

  it("marks timeouts failed with one atomic, completion-safe update", () => {
    const route = read("app/api/feed/post/[postId]/mark-failed/route.ts")

    expect(route).toContain("image_url IS NULL")
    expect(route).toContain("RETURNING id")
    expect(route).toContain("generation_status NOT IN")
  })

  it("reorders through temporary positions in one transaction", () => {
    const route = read("app/api/feed/[feedId]/reorder/route.ts")

    expect(route).toContain("sql.transaction")
    expect(route).toContain("position + 100")
    expect(route).toContain("jsonb_to_recordset")
    expect(route).toContain("new_position")
  })

  it("shows optimistic generation state for manual grids too", () => {
    const gridItem = read("components/feed-planner/feed-grid-item.tsx")

    expect(gridItem).not.toContain("!isManualFeed &&")
    expect(gridItem).toContain("!!predictionId")
  })
})
