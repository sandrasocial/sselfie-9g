import { describe, expect, it } from "vitest"
import { getMayaHomeBrandContext } from "@/lib/maya/home-brand-context"

describe("Maya Home brand context", () => {
  it("keeps message and audience facts but removes legacy automatic styling", () => {
    const context = `
=== USER INFORMATION ===
Gender: woman
IMPORTANT: Use your fashion expertise to create styling.

=== USER'S PERSONAL BRAND ===
Name: Sandra
Business Type: Personal brand education
Visual Aesthetic: Cozy & Textured
IMPORTANT: Generate concepts that match these aesthetics: Cozy & Textured
Preferred Settings: Coffee shops
Fashion Style: Old money
Communication Voice: Warm, direct, honest
Ideal Audience: Women over 40 building visible personal brands
Audience Challenge: They are hiding even though they have valuable experience
Content Pillars: Visibility, selfies, business
**🎨 BRAND COLORS (MANDATORY - USE THESE EXACT COLORS):**
camel, cream
⚠️ CRITICAL REQUIREMENT: You MUST use these colors in EVERY outfit.
Transformation Story: I stopped waiting to look perfect before showing up.
Business Goals: Help women become visible and build something real
`

    expect(getMayaHomeBrandContext(context)).toBe(
      [
        "Name: Sandra",
        "Business Type: Personal brand education",
        "Communication Voice: Warm, direct, honest",
        "Ideal Audience: Women over 40 building visible personal brands",
        "Audience Challenge: They are hiding even though they have valuable experience",
        "Content Pillars: Visibility, selfies, business",
        "Transformation Story: I stopped waiting to look perfect before showing up.",
        "Business Goals: Help women become visible and build something real",
      ].join("\n")
    )
  })
})
