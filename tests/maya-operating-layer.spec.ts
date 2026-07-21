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
      const paidRequests: string[] = []
      const chatStore = new Map<string, any>()
      let activeDraft: any = null
      ;(page as any).__mayaOperatingLayerErrors = browserErrors
      ;(page as any).__mayaOperatingLayerPaidRequests = paidRequests
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
        const method = request.method()
        let body: Record<string, unknown> = { ok: true }

        if (
          pathname.includes("/generate") ||
          pathname.includes("/calendar/generation") ||
          pathname.includes("/bulk-create")
        ) {
          paidRequests.push(`${method} ${pathname}`)
        }

        if (pathname === "/api/app-v3/maya/chat") {
          const payload = request.postDataJSON?.() ?? {}
          const messages = Array.isArray(payload.messages) ? payload.messages : []
          const lastMessage = messages[messages.length - 1]
          const userText = Array.isArray(lastMessage?.parts)
            ? lastMessage.parts
                .filter((part: any) => part?.type === "text")
                .map((part: any) => part.text)
                .join(" ")
            : ""
          const post = userText.match(/post\s+(\d+)/i)?.[1]
          const answer = post
            ? `Maya QA response for post ${post}.`
            : "Maya QA response for the Create task."
          const messageId = `assistant-${Date.now()}`
          const textId = `text-${Date.now()}`
          const stream = [
            `data: ${JSON.stringify({ type: "start", messageId })}`,
            `data: ${JSON.stringify({ type: "text-start", id: textId })}`,
            `data: ${JSON.stringify({ type: "text-delta", id: textId, delta: answer })}`,
            `data: ${JSON.stringify({ type: "text-end", id: textId })}`,
            `data: ${JSON.stringify({ type: "finish", finishReason: "stop" })}`,
            "data: [DONE]",
          ].join("\n\n") + "\n\n"
          await route.fulfill({
            status: 200,
            headers: {
              "content-type": "text/event-stream",
              "x-vercel-ai-ui-message-stream": "v1",
              "cache-control": "no-cache",
            },
            body: stream,
          })
          return
        }

        if (pathname === "/api/app-v3/maya/draft") {
          if (method === "GET") body = { draft: activeDraft }
          else if (method === "PUT") {
            activeDraft = request.postDataJSON?.()?.draft ?? null
          } else if (method === "DELETE") {
            activeDraft = null
          }
        } else if (pathname === "/api/app-v3/maya/chats") {
          if (method === "GET") {
            body = {
              chats: Array.from(chatStore.values()).map(chat => ({
                id: chat.id,
                title: chat.title,
                updatedAt: new Date(chat.savedAt).toISOString(),
                taskStatus: chat.taskStatus,
                outputCount: chat.outputCount,
              })),
            }
          } else if (method === "POST") {
            const chat = request.postDataJSON?.()
            if (chat?.id) chatStore.set(chat.id, chat)
          }
        } else if (pathname.startsWith("/api/app-v3/maya/chats/")) {
          const id = decodeURIComponent(pathname.slice("/api/app-v3/maya/chats/".length))
          if (method === "DELETE") {
            chatStore.delete(id)
          } else {
            const chat = chatStore.get(id)
            if (!chat) {
              await route.fulfill({
                status: 200,
                contentType: "application/json",
                body: JSON.stringify({ messages: [], workspace: null }),
              })
              return
            }
            body = { messages: chat.messages, workspace: chat.workspace }
          }
        } else if (pathname === "/api/app-v3/maya/memory") {
          body = {
            agentName: "Maya",
            brandNotes: null,
            preferences: null,
            userAvatarUrl: null,
            preferredOverlayStyle: null,
            hasBrandProfile: true,
          }
        } else if (pathname === "/api/app-v3/reference-library") {
          body = {
            images: ["https://example.com/maya-qa-selfie.jpg"],
            // A durable library inspiration must never attach itself to a new task merely
            // because the task we just left was restored from History.
            extras: { inspiration: "https://example.com/old-inspiration.jpg" },
          }
        } else if (pathname === "/api/app-v3/account") {
          body = { credits: 100, creditsUnlimited: false }
        } else if (pathname === "/api/app-v3/aesthetics") body = { aesthetics: [] }
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

    test("keeps Create and Calendar tasks isolated across post switches, History, and reload", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator('aside[data-maya-task-id]')

      await page.getByPlaceholder("A launch photo, a full shoot, a Reel cover…").fill(
        "Phase one Create task"
      )
      await page.getByRole("button", { name: "Start with Maya" }).click()
      await expect(maya).toHaveAttribute("data-maya-job", "create_content")
      await expect(maya).toHaveAttribute("data-maya-surface", "create")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")
      const firstCreateTask = await maya.getAttribute("data-maya-task-id")
      expect(firstCreateTask).toMatch(/^maya-/)
      await expect(page.getByText("Maya QA response for the Create task.")).toBeVisible()
      await page.getByRole("button", { name: "Close", exact: true }).click()

      await page.getByRole("button", { name: "Calendar" }).click()
      await page.getByRole("button", { name: /finish post 7 next/i }).click()
      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toBeVisible()
      await page.getByRole("button", { name: /Create with Maya/i }).click()
      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toHaveCount(0)
      await expect(page.getByRole("dialog")).toHaveCount(1)
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-707")
      await expect(maya).toHaveAttribute("data-maya-job", "finish_calendar_post")
      await expect(maya).toHaveAttribute("data-maya-surface", "calendar")
      await expect(maya).toHaveAttribute("data-maya-feed-id", "101")
      await expect(maya).toHaveAttribute("data-maya-post-id", "707")
      await expect(maya).toHaveAttribute("data-maya-post-position", "7")
      await expect(maya).toHaveAttribute("data-maya-format", "photo")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")
      await expect(page.getByText("Maya QA response for post 7.")).toBeVisible()
      await expect(page.getByText("Maya QA response for the Create task.")).toHaveCount(0)
      await expect(page.getByText("Let's create photos.", { exact: true })).toHaveCount(0)
      await page.waitForTimeout(900)

      await page.getByRole("button", { name: "Close", exact: true }).click()
      await expect(page.getByRole("button", { name: "Select post 7" })).toHaveAttribute(
        "aria-pressed",
        "true"
      )
      await page.getByRole("button", { name: "Select post 8" }).click()
      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toBeVisible()
      await page.getByRole("button", { name: /Create with Maya/i }).click()
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-708")
      await expect(maya).toHaveAttribute("data-maya-post-id", "708")
      await expect(page.getByText("Maya QA response for post 8.")).toBeVisible()
      await expect(page.getByText("Maya QA response for post 7.")).toHaveCount(0)
      await page.waitForTimeout(900)

      await page.getByRole("button", { name: "Close", exact: true }).click()
      await page.getByRole("button", { name: "Select post 7" }).click()
      await page.getByRole("button", { name: /Create with Maya/i }).click()
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-707")
      await expect(page.getByText("Maya QA response for post 7.")).toHaveCount(1)
      await expect(page.getByText("Maya QA response for post 8.")).toHaveCount(0)
      await expect(page.getByText("Let's create photos.", { exact: true })).toHaveCount(0)

      await page.getByRole("button", { name: "Menu" }).click()
      await page.getByRole("button", { name: "History" }).click()
      await expect(page.getByRole("dialog", { name: "Creative tasks" })).toBeVisible()
      await expect(page.getByRole("dialog")).toHaveCount(1)
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog", { name: "Creative tasks" })).toHaveCount(0)
      await expect(maya).toBeVisible()

      await page.getByRole("button", { name: "Close", exact: true }).click()
      // Keyboard activation avoids the local Next.js dev badge, which overlaps the bottom-left
      // tab at 390 px but is not present in production, and verifies the same control is usable.
      await page.getByRole("button", { name: "Create", exact: true }).press("Enter")
      await page.getByRole("button", { name: "Open Maya" }).click()
      await expect(maya).toHaveAttribute("data-maya-job", "create_content")
      await expect(maya).toHaveAttribute("data-maya-surface", "create")
      expect(await maya.getAttribute("data-maya-post-id")).toBeNull()
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")
      const cleanCreateTask = await maya.getAttribute("data-maya-task-id")
      expect(cleanCreateTask).not.toBe(firstCreateTask)
      expect(cleanCreateTask).not.toBe("maya-calendar-v1-101-707")
      await expect(page.getByText(/Maya QA response for post [78]\./)).toHaveCount(0)
      await page.waitForTimeout(900)

      // The production shell intentionally canonicalizes section URLs to /app. Return to the
      // auth-free E2E host after a full navigation while preserving browser storage.
      await page.goto("/e2e/maya-operating-layer")
      await page.getByRole("button", { name: "Open Maya" }).click()
      await expect(maya).toHaveAttribute("data-maya-task-id", cleanCreateTask as string)
      await expect(maya).toHaveAttribute("data-maya-job", "create_content")
      await expect(maya).toHaveAttribute("data-maya-surface", "create")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")

      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await composer.focus()
      await expect(composer).toBeFocused()
      const viewport = await page.evaluate(() => ({
        rootOverflow: document.documentElement.scrollWidth > window.innerWidth,
        drawerOverflow:
          (document.querySelector('aside[data-maya-task-id]')?.scrollWidth ?? 0) >
          (document.querySelector('aside[data-maya-task-id]')?.clientWidth ?? 0),
      }))
      expect(viewport).toEqual({ rootOverflow: false, drawerOverflow: false })

      await page.getByRole("button", { name: "Menu" }).click()
      await page.getByRole("button", { name: "History" }).click()
      const history = page.getByRole("dialog", { name: "Creative tasks" })
      await expect(history).toBeVisible()
      await history.getByRole("button", { name: /^Plan .*post 7/i }).click()
      await expect(history).toHaveCount(0)
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-707")
      await expect(maya).toHaveAttribute("data-maya-surface", "calendar")
      await expect(maya).toHaveAttribute("data-maya-post-id", "707")
      await expect(page.getByText("Maya QA response for post 7.")).toHaveCount(1)
      await expect(page.getByText("Maya QA response for post 8.")).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Calendar", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      )

      // Reloading a completed Calendar task must restore its exact thread without re-running
      // the generic photo pull (which would append a new "Let's create photos." turn).
      await expect(page.getByText("Let's create photos.", { exact: true })).toHaveCount(0)
      await page.goto("/e2e/maya-operating-layer")
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-707")
      await expect(maya).toHaveAttribute("data-maya-post-id", "707")
      await page.waitForTimeout(900)
      await expect(page.getByText("Let's create photos.", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Maya QA response for post 7.")).toHaveCount(1)

      await page.keyboard.press("Escape")
      await expect(maya).toHaveCount(0)
      await expect
        .poll(() =>
          page.evaluate(
            () =>
              document.activeElement?.getAttribute("aria-label") ??
              document.activeElement?.textContent?.trim() ??
              document.activeElement?.tagName
          )
        )
        .toBe("Open Maya")
      expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([])
    })
  })
}
