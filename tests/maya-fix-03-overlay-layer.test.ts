// @vitest-environment node

import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

import { compileConceptJobs } from "@/lib/app-v3/prompt-compiler"
import type { CreativeBrief } from "@/lib/app-v3/maya/concept-types"

const read = (path: string) => readFileSync(path, "utf8")

const brief: CreativeBrief = {
  outfit: "The Row cream cashmere turtleneck",
  setting: "a marble cafe table by a tall window in Paris morning light",
  mood: "calm, assured",
  pose: "seated, mid-thought, looking out the window",
  cameraSpec: "Hasselblad X2D 100C, 55mm f/2.5",
  lighting: "soft north-facing window light",
  graphic: {
    headline: "Look expensive without trying",
    subline: "Three quiet styling moves",
    designSystem: "cutout-editorial",
    slides: [
      {
        heading: "Start with one clean base",
        body: "Let the shape do the work",
      },
      { heading: "Repeat the same quiet tones", body: "It reads intentional" },
      {
        heading: "Save this for your next shoot",
        body: "Use it when you feel stuck",
        role: "cta",
      },
    ],
  },
}

describe("CONTENT-CAROUSEL-03 retired overlay layer", () => {
  it("bakes graphic text into image-model prompts instead of creating local text layers", () => {
    const jobs = [
      ...compileConceptJobs(brief, "carousel"),
      ...compileConceptJobs(brief, "reel-cover"),
      ...compileConceptJobs(brief, "story-slide"),
    ]
    const prompts = jobs.flatMap(job => job.passes.map(pass => pass.prompt)).join("\n")

    expect(prompts).toMatch(/Render this exact headline inside the image/)
    expect(prompts).toMatch(/Render all text spelled exactly as written/)
    expect(prompts).not.toMatch(/future app text layer|editable typography|Do not render any text/i)
    expect(jobs.every(job => job.passes.length === 1)).toBe(true)
    expect(jobs.every(job => job.passes.every(pass => pass.input === "selfie"))).toBe(true)
  })

  it("removes the live local overlay/composer modules", () => {
    expect(existsSync("components/app-v3/layered-image.tsx")).toBe(false)
    expect(existsSync("components/app-v3/overlay-composer.tsx")).toBe(false)
    expect(existsSync("components/app-v3/style-options-card.tsx")).toBe(false)
    expect(existsSync("lib/app-v3/overlay-layer.ts")).toBe(false)
    expect(existsSync("lib/app-v3/maya/overlay-styles.ts")).toBe(false)
    expect(existsSync("lib/app-v3/maya/style-example-store.ts")).toBe(false)
    expect(existsSync("app/api/admin/style-examples/route.ts")).toBe(false)
  })

  it("removes the Maya style picker tool from the live chat route", () => {
    const route = read("app/api/app-v3/maya/chat/route.ts")
    const persona = read("lib/app-v3/maya/persona.ts")
    const concierge = read("components/app-v3/maya-concierge.tsx")

    expect(route).not.toContain("show_style_options")
    expect(route).not.toContain("overlayStyle")
    expect(persona).not.toContain("getOverlayStyleGuide")
    expect(concierge).not.toContain("StyleOptionsCard")
  })
})
