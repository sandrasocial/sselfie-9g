import { describe, it, expect } from "vitest"
import { resolveCoherentStyle } from "../style-coherence-resolver"

describe("Style Coherence Resolver", () => {
  it("adapts athletic + luxury to elevated_athleisure", () => {
    const result = resolveCoherentStyle({
      category: "luxury",
      mood: "luxury",
      fashionStyle: "athletic",
      userId: "test-user-1",
      feedId: "test-feed-1",
    })

    expect(result.resolvedFashionStyle).toBe("elevated_athleisure")
    expect(result.adaptationApplied).toBe(true)
  })

  it("adapts bohemian + minimal to minimal_bohemian", () => {
    const result = resolveCoherentStyle({
      category: "minimal",
      mood: "minimal",
      fashionStyle: "bohemian",
      userId: "test-user-2",
      feedId: "test-feed-2",
    })

    expect(result.resolvedFashionStyle).toBe("minimal_bohemian")
    expect(result.adaptationApplied).toBe(true)
  })

  it("blocks athletic + professional and falls back to business", () => {
    const result = resolveCoherentStyle({
      category: "professional",
      mood: "minimal",
      fashionStyle: "athletic",
      userId: "test-user-3",
      feedId: "test-feed-3",
    })

    expect(result.resolvedFashionStyle).toBe("business")
    expect(result.adaptationApplied).toBe(true)
  })

  it("allows casual + minimal without adaptation", () => {
    const result = resolveCoherentStyle({
      category: "minimal",
      mood: "minimal",
      fashionStyle: "casual",
      userId: "test-user-4",
      feedId: "test-feed-4",
    })

    expect(result.resolvedFashionStyle).toBe("casual")
    expect(result.adaptationApplied).toBe(false)
  })

  it("defaults to classic for luxury with no fashion style", () => {
    const result = resolveCoherentStyle({
      category: "luxury",
      mood: "luxury",
      fashionStyle: null,
      userId: "test-user-5",
      feedId: "test-feed-5",
    })

    expect(result.resolvedFashionStyle).toBe("classic")
    expect(result.adaptationApplied).toBe(false)
  })

  it("adapts casual + luxury to elevated_casual", () => {
    const result = resolveCoherentStyle({
      category: "luxury",
      mood: "luxury",
      fashionStyle: "casual",
      userId: "test-user-6",
      feedId: "test-feed-6",
    })

    expect(result.resolvedFashionStyle).toBe("elevated_casual")
    expect(result.adaptationApplied).toBe(true)
  })

  it("allows classic + luxury without adaptation", () => {
    const result = resolveCoherentStyle({
      category: "luxury",
      mood: "luxury",
      fashionStyle: "classic",
      userId: "test-user-7",
      feedId: "test-feed-7",
    })

    expect(result.resolvedFashionStyle).toBe("classic")
    expect(result.adaptationApplied).toBe(false)
  })

  it("blocks bohemian + luxury and falls back to classic", () => {
    const result = resolveCoherentStyle({
      category: "luxury",
      mood: "luxury",
      fashionStyle: "bohemian",
      userId: "test-user-8",
      feedId: "test-feed-8",
    })

    expect(result.resolvedFashionStyle).toBe("classic")
    expect(result.adaptationApplied).toBe(true)
  })
})
