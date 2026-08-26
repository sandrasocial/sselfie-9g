import { describe, expect, it } from "vitest"
import { curatedPromptPositionForCalendarPosition } from "@/lib/feed-planner/curated-feed-position"

describe("curated feed prompt positions", () => {
  it("preserves the approved positions 1 through 9", () => {
    expect(
      Array.from({ length: 9 }, (_, index) => curatedPromptPositionForCalendarPosition(index + 1))
    ).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it("cycles later calendar slots through the approved 3x3 prompt rhythm", () => {
    expect(curatedPromptPositionForCalendarPosition(10)).toBe(1)
    expect(curatedPromptPositionForCalendarPosition(11)).toBe(2)
    expect(curatedPromptPositionForCalendarPosition(18)).toBe(9)
    expect(curatedPromptPositionForCalendarPosition(19)).toBe(1)
  })

  it.each([0, -1, 1.5, Number.NaN])("rejects invalid calendar position %s", position => {
    expect(() => curatedPromptPositionForCalendarPosition(position)).toThrow(
      "Invalid calendar feed position"
    )
  })
})
