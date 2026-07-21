const runPlaywright = process.env.PLAYWRIGHT_TEST === "1"

if (!runPlaywright) {
  describe.skip("Maya operating layer Playwright journeys", () => {
    it("requires PLAYWRIGHT_TEST=1", () => {})
  })
} else {
  const { test, expect } = require("@playwright/test")

  test.describe("Maya operating layer Phase 0 member-job baseline", () => {
    test.describe.configure({ mode: "serial", timeout: 60_000 })

    test.beforeEach(async ({ page }: { page: any }) => {
      const browserErrors: string[] = []
      ;(page as any).__mayaOperatingLayerErrors = browserErrors
      page.on("pageerror", (error: Error) => browserErrors.push(error.message))
      page.on("console", (message: any) => {
        if (message.type() === "error") browserErrors.push(message.text())
      })
      const posts = Array.from({ length: 9 }, (_, index) => {
        const position = index + 1
        return {
          id: 700 + position,
          position,
          caption:
            position <= 7
              ? `Post ${position} caption ready for the Maya operating layer baseline.`
              : "",
          image_url: position <= 6 ? `https://example.com/maya-qa-post-${position}.jpg` : null,
          generation_status: position <= 6 ? "completed" : null,
          pro_mode_type: "single",
          content_pillar: position % 2 ? "Story" : "Expertise",
        }
      })
      const feedData = {
        exists: true,
        feed: {
          id: 101,
          feed_name: "Maya Phase QA",
          title: "Maya Phase QA",
          feed_style: "minimal",
          feed_style_direction_mode: "curated",
          profile_image_url: "https://example.com/maya-qa-selfie.jpg",
        },
        posts,
        bio: { bio_text: "Maya operating layer test profile" },
        highlights: [],
      }

      await page.route("https://example.com/**", async (route: any) => {
        await route.fulfill({ status: 204, body: "" })
      })
      await page.route("**/api/**", async (route: any) => {
        const request = route.request()
        const pathname = new URL(request.url()).pathname
        let body: Record<string, unknown> = { ok: true }

        if (pathname === "/api/app-v3/aesthetics") body = { aesthetics: [] }
        else if (pathname === "/api/app-v3/gallery") body = { assets: [] }
        else if (pathname === "/api/app-v3/maya/recommendations") {
          body = {
            recommendations: [
              {
                title: "A clear founder point of view",
                rationale: "Your audience needs one useful belief from you today.",
                format: "photo",
              },
            ],
          }
        } else if (pathname === "/api/app-v3/library") {
          body = {
            membershipActive: true,
            ownedProducts: [],
            lockedProducts: [],
            drops: [],
            learningPlan: null,
            courses: [
              {
                id: 14,
                title: "Branded by SSELFIE",
                description: "Build a visible personal brand from your story and expertise.",
                href: "/academy/courses/14",
                progressPercentage: 7,
                completedLessons: 1,
                totalLessons: 14,
              },
            ],
          }
        } else if (pathname === "/api/feed-planner/access") {
          body = {
            isFree: false,
            isPaidBlueprint: false,
            isMembership: true,
            canGenerateImages: true,
            canGenerateCaptions: true,
            hasGalleryAccess: true,
          }
        } else if (pathname === "/api/user/onboarding-status") {
          body = {
            onboarding_completed: true,
            hasBaseWizardData: true,
            hasExtensionData: true,
            hasSelfies: true,
          }
        } else if (pathname === "/api/user/info") body = { name: "Maya QA" }
        else if (pathname === "/api/feed-planner/welcome-status") body = { shown: true }
        else if (pathname === "/api/profile/personal-brand") {
          body = {
            exists: true,
            completed: true,
            data: {
              businessType: "Personal brand education",
              idealAudience: "Women building visible personal brands",
              currentSituation: "Build trust with one clear post",
              transformationStory: "Visibility created choices.",
              audienceChallenge: "They do not know what to post.",
              audienceTransformation: "They show up clearly and consistently.",
              futureVision: "A visible business that supports their life.",
              contentGoals: "Build trust",
              contentPillars: ["Story", "Expertise"],
              settingsPreference: ["minimal"],
            },
          }
        } else if (pathname === "/api/feed/latest" || pathname === "/api/feed/101") {
          body = feedData
        } else if (pathname === "/api/feed/list") {
          body = { feeds: [{ id: 101, name: "Maya Phase QA", post_count: 9 }] }
        } else if (pathname === "/api/user/credits") body = { balance: 100 }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(body),
        })
      })
      await page.goto("/e2e/maya-operating-layer")
    })

    test.afterEach(async ({ page }: { page: any }) => {
      expect((page as any).__mayaOperatingLayerErrors).toEqual([])
    })

    test("Create content starts from the current Create surface", async ({
      page,
    }: {
      page: any
    }) => {
      await expect(page.getByRole("button", { name: "Create", exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "For you" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Start with Maya" })).toBeVisible()
    })

    test("Decide what to post and Finish a selected Calendar post start in Calendar", async ({
      page,
    }: {
      page: any
    }) => {
      await page.getByRole("button", { name: "Calendar" }).click()
      await expect(page.getByRole("region", { name: "What needs me" })).toBeVisible()
      await expect(page.getByRole("button", { name: /finish post 7 next/i })).toBeVisible()
      await page.getByRole("button", { name: /finish post 7 next/i }).click()
      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toBeVisible()
      await expect(page.getByRole("button", { name: "AI Create with Maya" })).toBeVisible()
    })

    test("Improve a grid starts from Visual direction", async ({ page }: { page: any }) => {
      await page.getByRole("button", { name: "Calendar" }).click()
      await page.getByRole("button", { name: "Visual direction" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    test("Learn the next useful thing starts from Maya Coach", async ({ page }: { page: any }) => {
      await page.getByRole("button", { name: "Learn" }).click()
      await expect(page.getByRole("heading", { name: "Maya Coach" })).toBeVisible()
      await page.getByRole("button", { name: "I don't know what to post" }).click()
      await expect(page.getByText("Start here")).toBeVisible()
      await expect(page.getByRole("button", { name: "Use it with Maya" })).toBeVisible()
    })

    test("keeps the current member shell inside the viewport", async ({ page }: { page: any }) => {
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      )
      expect(overflow).toBe(false)
      await expect(page.getByRole("button", { name: "Account" })).toBeVisible()
    })
  })
}
