import { existsSync, readFileSync, statSync } from "node:fs"
import { describe, expect, it } from "vitest"

const read = (path: string) => readFileSync(path, "utf8")

describe("public search foundation", () => {
  it("uses the live www host consistently and gives every indexable page a self canonical", () => {
    const rootLayout = read("app/layout.tsx")
    expect(rootLayout).toContain('metadataBase: new URL("https://www.sselfie.ai")')
    expect(rootLayout).not.toContain('canonical: "https://sselfie.ai"')
    expect(rootLayout).not.toContain('"@type": "FAQPage"')
    expect(rootLayout).not.toContain('"@type": "SoftwareApplication"')

    const home = read("app/page.tsx")
    expect(home).toContain('"https://www.instagram.com/sandra.social/"')
    expect(home).toContain('"https://www.tiktok.com/@sandra.social"')
    expect(home).toContain('"https://no.linkedin.com/in/sandra-aamodt-919734253"')
    expect(home).not.toContain("Single mother")

    const canonicals = new Map([
      ["app/page.tsx", "https://www.sselfie.ai/"],
      ["app/selfie-guide/page.tsx", "https://www.sselfie.ai/selfie-guide"],
      ["app/starter-kit/page.tsx", "https://www.sselfie.ai/starter-kit"],
      ["app/masterclass/page.tsx", "https://www.sselfie.ai/masterclass"],
      ["app/join/studio/page.tsx", "https://www.sselfie.ai/join/studio"],
      ["app/ai-prompts/page.tsx", "https://www.sselfie.ai/ai-prompts"],
      ["app/prompt-vault/page.tsx", "https://www.sselfie.ai/prompt-vault"],
    ])

    for (const [path, canonical] of canonicals) {
      expect(read(path), path).toContain(`canonical: "${canonical}"`)
    }
  })

  it("lists only canonical, indexable marketing URLs in the sitemap", () => {
    const sitemap = read("app/sitemap.ts")
    expect(sitemap).toContain('const baseUrl = "https://www.sselfie.ai"')
    for (const path of [
      "/",
      "/selfie-guide",
      "/starter-kit",
      "/masterclass",
      "/join/studio",
      "/ai-prompts",
      "/prompt-vault",
    ]) {
      expect(sitemap).toContain(`path: "${path}"`)
    }
    expect(sitemap).not.toContain("/work-with-me")
    expect(sitemap).not.toContain("/why-studio")
    expect(sitemap).not.toContain("lastModified: now")
  })

  it("lets Google crawl utility routes so their noindex directives can be seen", () => {
    const robots = read("app/robots.ts")
    expect(robots).toContain('sitemap: "https://www.sselfie.ai/sitemap.xml"')
    expect(robots).not.toContain('"/studio"')
    expect(robots).not.toContain('"/checkout/"')
    expect(robots).not.toContain('"/auth/"')

    for (const path of ["app/auth/layout.tsx", "app/checkout/layout.tsx", "app/app/layout.tsx", "app/studio/page.tsx"]) {
      const source = read(path)
      expect(source, path).toContain("index: false")
      expect(source, path).toContain("follow: false")
    }
  })

  it("permanently redirects stale public URLs without redirect chains", () => {
    const config = read("next.config.mjs")
    const redirects = new Map([
      ["/why-studio", "/join/studio"],
      ["/visibility-suite", "/join/studio"],
      ["/transform/studio", "/app"],
      ["/simple-training", "/selfie-guide"],
      ["/simple-checkout", "/join/studio"],
      ["/sselfie-gallery", "/prompt-vault"],
    ])

    for (const [source, destination] of redirects) {
      expect(config).toContain(`{ source: "${source}", destination: "${destination}", permanent: true }`)
    }
    expect(config).not.toContain('destination: "/why-studio"')
  })

  it("ships lightweight homepage images and does not eagerly load below-fold editorial art", () => {
    const marketing = read("components/sselfie/public-marketing.tsx")
    const optimizedImages = [
      "public/academy/visibility-suite/sandra-hero.webp",
      "public/academy/visibility-suite/hero.webp",
      "public/images/selfie-guide/img-editorial-dark.webp",
    ]

    for (const path of optimizedImages) {
      expect(existsSync(path), path).toBe(true)
      expect(statSync(path).size, path).toBeLessThan(500_000)
    }
    expect(marketing).toMatch(/homeHero:\s*"\/academy\/visibility-suite\/sandra-hero\.webp"/)
    expect(marketing).toMatch(/homeStudio:\s*"\/academy\/visibility-suite\/hero\.webp"/)
    expect(marketing).toMatch(/homeSelfie:\s*"\/images\/selfie-guide\/img-editorial-dark\.webp"/)
    expect(marketing).toMatch(/loading="lazy"\s+decoding="async"/)
  })
})
