// @vitest-environment node

import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const read = (path: string) => readFileSync(path, "utf8")

const carouselBrief = (slides: NonNullable<NonNullable<CreativeBrief["graphic"]>["slides"]>): CreativeBrief => ({
  outfit: "The Row cream cashmere turtleneck",
  setting: "a marble cafe table by a tall window in Paris morning light",
  mood: "calm, assured",
  pose: "seated, mid-thought, looking out the window",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light",
  graphic: { designSystem: "cutout-editorial", slides },
})

describe("MAYA-FIX-01 quick wins", () => {
  it("lets Maya size concept sets to the ask instead of forcing exactly three", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")

    expect(route).toContain("6-9")
    expect(route).toContain("full shoot")
    expect(route).not.toContain("Present EXACTLY 3")
    expect(route).not.toContain("Never more or fewer than 3")
  })

  it("keeps Maya Concierge CTA copy count-agnostic", () => {
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(concierge).not.toContain("pull three directions")
    expect(concierge).not.toContain("Create my 3")
    expect(concierge).toContain("Create my photo directions")
    expect(concierge).toContain("Create my carousel directions")
  })

  it("caps explicit identity slides at two per carousel set", () => {
    const jobs = compileConceptJobs(
      carouselBrief([
        { heading: "S1", visual: "identity" },
        { heading: "S2", visual: "identity" },
        { heading: "S3", visual: "identity" },
        { heading: "S4", visual: "identity" },
      ]),
      "carousel",
    )

    const inputs = jobs.map((job) => job.passes[0].input)
    expect(inputs.filter((input) => input === "selfie")).toHaveLength(2)
    expect(inputs.filter((input) => input === "none")).toHaveLength(2)
  })

  it("makes carousel guidance face-first and removes the banned flawless example", () => {
    const persona = read("lib/app-v3/maya/persona.ts")

    expect(persona).toContain("default hook/value/CTA slides to identity")
    expect(persona).toContain("detail is opt-in")
    expect(persona).not.toMatch(/flawless/i)
  })
})
