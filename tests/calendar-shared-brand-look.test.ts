import { describe, expect, it } from "vitest"

import { resolveCalendarBrandLook } from "@/lib/feed-planner/calendar-brand-look"

describe("Calendar shared brand look", () => {
  it("reuses the saved member look when an older grid has no direction of its own", () => {
    expect(
      resolveCalendarBrandLook({
        feed: { feed_style: null, feed_style_variation_id: null, visual_direction_mode: null },
        personalBrand: {
          data: {
            settingsPreference: ["Light & Minimalistic"],
            feedStyleVariationId: 17,
          },
        },
      })
    ).toEqual({
      directionMode: "curated",
      feedStyle: "Light & Minimalistic",
      feedStyleVariationId: 17,
      inherited: true,
    })
  })

  it("keeps an explicit grid direction instead of overwriting it", () => {
    expect(
      resolveCalendarBrandLook({
        feed: {
          feed_style: "Dark & Moody",
          feed_style_variation_id: 4,
          visual_direction_mode: "curated",
        },
        personalBrand: {
          data: {
            settingsPreference: ["Light & Minimalistic"],
            feedStyleVariationId: 17,
          },
        },
      })
    ).toEqual({
      directionMode: "curated",
      feedStyle: "Dark & Moody",
      feedStyleVariationId: 4,
      inherited: false,
    })
  })
})
