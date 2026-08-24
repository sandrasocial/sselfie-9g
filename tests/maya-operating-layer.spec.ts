const runPlaywright = process.env.PLAYWRIGHT_TEST === "1"

if (!runPlaywright) {
  describe.skip("Maya operating layer Playwright journeys", () => {
    it("requires PLAYWRIGHT_TEST=1", () => {})
  })
} else {
  const { test, expect } = require("@playwright/test")

  async function captureMayaProof(page: any, name: string) {
    const proofDir = process.env.MAYA_VISUAL_PROOF_DIR
    if (!proofDir) return
    await page.waitForTimeout(350)
    await page.screenshot({
      path: `${proofDir}/${test.info().project.name}-${name}.png`,
      fullPage: true,
    })
  }

  async function captureMayaViewportProof(page: any, name: string) {
    const proofDir = process.env.MAYA_VISUAL_PROOF_DIR
    if (!proofDir) return
    await page.waitForTimeout(350)
    await page.screenshot({
      path: `${proofDir}/${test.info().project.name}-${name}.png`,
      fullPage: false,
    })
  }

  test.describe("Maya operating layer Phase 0 member-job baseline", () => {
    test.describe.configure({ mode: "serial", timeout: 60_000 })

    test.beforeEach(async ({ page }: { page: any }) => {
      const browserErrors: string[] = []
      const paidRequests: string[] = []
      const paidRequestIds: string[] = []
      const calendarMutations: string[] = []
      const calendarMutationKeys: string[] = []
      const chatHistoryLookups: string[] = []
      const finishedPostPayloads: any[] = []
      const readyPostPayloads: any[] = []
      const founderReports: any[] = []
      const chatStore = new Map<string, any>()
      let activeDraft: any = null
      let generationAttempts = 0
      let calendarApplyAttempts = 0
      let actionJourneyEnabled = false
      let carouselJourneyEnabled = false
      ;(page as any).__mayaOperatingLayerErrors = browserErrors
      ;(page as any).__mayaOperatingLayerPaidRequests = paidRequests
      ;(page as any).__mayaOperatingLayerPaidRequestIds = paidRequestIds
      ;(page as any).__mayaOperatingLayerCalendarMutations = calendarMutations
      ;(page as any).__mayaOperatingLayerCalendarMutationKeys = calendarMutationKeys
      ;(page as any).__mayaOperatingLayerChatHistoryLookups = chatHistoryLookups
      ;(page as any).__mayaFinishedPostPayloads = finishedPostPayloads
      ;(page as any).__mayaReadyPostPayloads = readyPostPayloads
      ;(page as any).__mayaFounderReports = founderReports
      ;(page as any).__mayaChatStore = chatStore
      ;(page as any).__enableMayaActionJourney = () => {
        actionJourneyEnabled = true
      }
      ;(page as any).__enableMayaCarouselJourney = () => {
        carouselJourneyEnabled = true
      }
      page.on("pageerror", (error: Error) => browserErrors.push(error.message))
      page.on("console", (message: any) => {
        const messageText = message.text()
        const isSentryTransportNoise =
          messageText.startsWith(
            "Sentry Logger [error]: Encountered error running transport request"
          ) || messageText.startsWith("Sentry Logger [error]: Error while sending envelope")
        const sourceUrl = message.location?.().url
        const isExternalFontNoise = sourceUrl?.startsWith("https://fonts.gstatic.com/")
        if (message.type() === "error" && !isSentryTransportNoise && !isExternalFontNoise) {
          browserErrors.push(sourceUrl ? `${messageText} (${sourceUrl})` : messageText)
        }
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

        if (pathname === "/api/app-v3/maya/generate") {
          const payload = request.postDataJSON?.() ?? {}
          paidRequestIds.push(String(payload.clientRequestId || ""))
          generationAttempts += 1
          if (carouselJourneyEnabled) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({
                imageUrl: "/images/selfie-to-brand-shoot/module-5-content-use/detail-coffee.jpg",
                imageUrls: [
                  "/images/selfie-to-brand-shoot/module-5-content-use/detail-coffee.jpg",
                  "/images/selfie-to-brand-shoot/module-5-content-use/creator-phone-detail.jpg",
                  "/images/selfie-to-brand-shoot/module-5-content-use/quiet-product-detail.jpg",
                ],
                aiImageId: 991,
                aiImageIds: [991, 992, 993],
                newBalance: 97,
              }),
            })
            return
          }
          if (generationAttempts === 1) {
            await route.fulfill({
              status: 200,
              contentType: "application/json",
              body: JSON.stringify({ error: "Provider unavailable. Try again safely." }),
            })
            return
          }
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              imageUrl: "https://example.com/maya-action-result.jpg",
              imageUrls: ["https://example.com/maya-action-result.jpg"],
              aiImageId: 990,
              aiImageIds: [990],
              newBalance: 99,
            }),
          })
          return
        }

        if (pathname === "/api/app-v3/maya/founder-feedback") {
          if (method === "POST") {
            const report = {
              id: `founder-feedback-${founderReports.length + 1}`,
              reportType: "quality",
              message: "The answer is useful but still sounds generic.",
              status: "new",
              statusLabel: "Received",
              createdAt: "2026-08-08T12:00:00.000Z",
            }
            founderReports.unshift(report)
            body = { report }
          } else if (method === "PATCH") {
            body = { report: founderReports[0] }
          } else {
            body = { reports: founderReports }
          }
        } else if (pathname === "/api/app-v3/maya/chat") {
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
          const confirmedCarousel =
            /yes, make that carousel/i.test(userText) ||
            /create the carousel/i.test(userText) ||
            /create a three-slide visibility carousel/i.test(userText)
          const recommendsCarousel =
            /I want to share why showing up before you feel ready matters/i.test(userText)
          const carouselPull = /let's make a carousel/i.test(userText)
          const clarifyPayload = recommendsCarousel
            ? {
                kind: "format",
                question:
                  "I recommend a carousel because this idea needs a short teaching sequence. Shall I create it?",
                options: ["Create the carousel", "Choose something else"],
                allowFreeText: true,
              }
            : null
          const conceptPayload =
            carouselJourneyEnabled && carouselPull
              ? {
                  format: "carousel",
                  concepts: [
                    {
                      id: "qa-carousel",
                      title: "Three-part visibility carousel",
                      description: "Three distinct scenes in one consistent visual world.",
                      brief: {
                        outfit: "Black knit and tailored trousers",
                        setting: "Editorial founder world",
                        mood: "Calm and assured",
                        pose: "Natural movement",
                        cameraSpec: "Hasselblad X2D 100C, 55mm",
                        lighting: "Soft directional window light",
                        graphic: {
                          carouselTitle: "Visibility creates choices",
                          slides: [
                            {
                              number: 1,
                              heading: "Visibility creates choices",
                              body: "Start before you feel ready.",
                              purpose: "hook",
                              visualConcept: "Founder portrait beside a bright studio window",
                              imagePromptDirection: "Medium portrait beside a bright studio window",
                            },
                            {
                              number: 2,
                              heading: "Your story is the strategy",
                              body: "Let people understand what shaped your work.",
                              purpose: "value",
                              visualConcept: "Overhead notebook and coffee detail",
                              imagePromptDirection: "Overhead notebook and coffee detail",
                            },
                            {
                              number: 3,
                              heading: "Take one visible step",
                              body: "Share the useful thing today.",
                              purpose: "cta",
                              visualConcept: "Walking full-body frame outside the studio",
                              imagePromptDirection: "Walking full-body frame outside the studio",
                            },
                          ],
                        },
                      },
                    },
                  ],
                }
              : post && actionJourneyEnabled
                ? {
                    format: "photo",
                    concepts: [
                      {
                        id: `qa-post-${post}`,
                        title: `Editorial direction for post ${post}`,
                        description: "A clear, grounded founder portrait for this Calendar post.",
                        brief: {
                          outfit: "Black knit and tailored trousers",
                          setting: "Window-lit studio",
                          mood: "Calm and assured",
                          pose: "Standing naturally beside a desk",
                          cameraSpec: "Hasselblad X2D 100C, 55mm",
                          lighting: "Soft north-facing window light",
                        },
                      },
                    ],
                  }
                : null
          const toolCallId = `tool-${Date.now()}`
          const formatPayload = confirmedCarousel ? { format: "carousel" } : null
          const streamParts = [
            `data: ${JSON.stringify({ type: "start", messageId })}`,
            `data: ${JSON.stringify({ type: "text-start", id: textId })}`,
            `data: ${JSON.stringify({ type: "text-delta", id: textId, delta: answer })}`,
            `data: ${JSON.stringify({ type: "text-end", id: textId })}`,
            ...(clarifyPayload
              ? [
                  `data: ${JSON.stringify({ type: "tool-input-start", toolCallId, toolName: "ask_clarify" })}`,
                  `data: ${JSON.stringify({ type: "tool-input-available", toolCallId, toolName: "ask_clarify", input: clarifyPayload })}`,
                  `data: ${JSON.stringify({ type: "tool-output-available", toolCallId, output: clarifyPayload })}`,
                ]
              : formatPayload
                ? [
                    `data: ${JSON.stringify({ type: "tool-input-start", toolCallId, toolName: "set_format" })}`,
                    `data: ${JSON.stringify({ type: "tool-input-available", toolCallId, toolName: "set_format", input: formatPayload })}`,
                    `data: ${JSON.stringify({ type: "tool-output-available", toolCallId, output: formatPayload })}`,
                  ]
                : conceptPayload
                  ? [
                      `data: ${JSON.stringify({ type: "tool-input-start", toolCallId, toolName: "emit_concepts" })}`,
                      `data: ${JSON.stringify({ type: "tool-input-available", toolCallId, toolName: "emit_concepts", input: conceptPayload })}`,
                      `data: ${JSON.stringify({ type: "tool-output-available", toolCallId, output: conceptPayload })}`,
                    ]
                  : []),
            `data: ${JSON.stringify({ type: "finish", finishReason: "stop" })}`,
            "data: [DONE]",
          ]
          const stream = streamParts.join("\n\n") + "\n\n"
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
              chats: Array.from(chatStore.values())
                .sort((left, right) => right.savedAt - left.savedAt)
                .map(chat => ({
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
          if (method === "GET") chatHistoryLookups.push(id)
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
        } else if (pathname === "/api/app-v3/maya/guidance") {
          const payload = request.postDataJSON?.() ?? {}
          body = {
            recommendation: "Use one honest teaching post to show up before you feel ready.",
            reason: "Sandra teaches that confidence is created by showing up, not waiting.",
            sourceRefs: [
              {
                kind: "lesson",
                courseId: 14,
                lessonId: 140,
                title: "Post Before You Feel Ready",
                version: "1234567890abcdef",
              },
            ],
            nextAction: {
              id: `guidance-${String(payload.taskId || "maya-task-guidance")}`,
              taskId: String(payload.taskId || "maya-task-guidance"),
              kind: "continue_lesson",
              title: "Continue with Post Before You Feel Ready",
              reason: "This is the most relevant lesson you own.",
              target: { lessonId: 140 },
              creditCost: 0,
              requiresConfirmation: false,
              canUndo: false,
              idempotencyKey: `maya-action-guidance-${String(payload.taskId || "task")}`,
              status: "recommended",
            },
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
        } else if (pathname === "/api/app-v3/maya/finish-post") {
          finishedPostPayloads.push(request.postDataJSON?.() ?? {})
          body = {
            caption: "A ready caption for this week's visibility piece.",
          }
        } else if (pathname === "/api/app-v3/maya/feed-plan/place-photo") {
          const payload = request.postDataJSON?.() ?? {}
          readyPostPayloads.push(payload)
          if (!posts.some(post => post.position === 10)) {
            posts.push({
              id: 710,
              position: 10,
              caption: typeof payload.finishedCaption === "string" ? payload.finishedCaption : "",
              image_url: "https://example.com/maya-carousel-1.jpg",
              generation_status: "completed",
              pro_mode_type: "carousel",
              content_pillar: "Visibility",
            })
          }
          body = {
            postId: 710,
            position: 10,
            scheduledAt: "2026-08-24",
            caption: payload.finishedCaption,
            readyPostKey: "qa-ready-post-key",
            alreadyPlaced: false,
            mediaCount: Array.isArray(payload.assetIds) ? payload.assetIds.length : 0,
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
        else if (pathname === "/api/app-v3/gallery") {
          body = {
            assets: [
              {
                id: "ai_501",
                kind: "image",
                contentType: "photo",
                url: "/images/selfie-to-brand-shoot/module-5-content-use/creator-phone-detail.jpg",
                createdAt: "2026-07-22T10:00:00.000Z",
                isFavorite: false,
                title: "Member portrait",
                canFavorite: true,
                canDelete: true,
                canDownload: true,
                canMakeMotion: true,
              },
            ],
            counts: {
              all: 1,
              favorites: 0,
              photos: 1,
              photoshoots: 0,
              reelCovers: 0,
              carousels: 0,
              storySlides: 0,
              videos: 0,
            },
          }
        } else if (pathname === "/api/app-v3/maya/recommendations") {
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
        } else if (pathname === "/api/feed/101/replace-post-image") {
          const payload = request.postDataJSON?.() ?? {}
          const post = posts.find(item => item.id === Number(payload.postId))
          if (post) {
            post.image_url = String(payload.imageUrl || "")
            post.generation_status = "completed"
            calendarApplyAttempts += 1
            if (!post.caption && (!actionJourneyEnabled || calendarApplyAttempts > 1)) {
              post.caption = `QA caption for post ${post.position}.`
            }
          }
          calendarMutations.push(`${method} ${pathname}`)
          calendarMutationKeys.push(request.headers()["x-maya-action-idempotency-key"] || "")
          body = {
            success: true,
            post,
            captionStatus:
              actionJourneyEnabled && calendarApplyAttempts === 1 ? "unavailable" : "ready",
          }
        } else if (pathname === "/api/feed/101/remove-post-image") {
          const payload = request.postDataJSON?.() ?? {}
          const post = posts.find(item => item.id === Number(payload.postId))
          if (post) {
            post.image_url = null
            post.generation_status = "pending"
          }
          calendarMutations.push(`${method} ${pathname}`)
          body = { success: true }
        } else if (pathname === "/api/feed/101/update-caption") {
          const payload = request.postDataJSON?.() ?? {}
          const post = posts.find(item => item.id === Number(payload.postId))
          if (post) post.caption = String(payload.caption || "")
          calendarMutations.push(`${method} ${pathname}`)
          body = { success: true }
        } else if (pathname === "/api/feed/101/enhance-caption") {
          const payload = request.postDataJSON?.() ?? {}
          const post = posts.find(item => item.id === Number(payload.postId))
          const enhancedCaption = `Improved caption for post ${post?.position ?? "selected"}.`
          if (post) post.caption = enhancedCaption
          calendarMutations.push(`${method} ${pathname}`)
          body = { enhancedCaption }
        } else if (pathname === "/api/feed/101/regenerate-caption") {
          const payload = request.postDataJSON?.() ?? {}
          const post = posts.find(item => item.id === Number(payload.postId))
          const caption = `Fresh caption for post ${post?.position ?? "selected"}.`
          if (post) post.caption = caption
          calendarMutations.push(`${method} ${pathname}`)
          body = { caption }
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

    test("Maya Home starts as one neutral conversation above the fold", async ({
      page,
    }: {
      page: any
    }) => {
      await expect(page.getByRole("button", { name: "Maya", exact: true })).toBeVisible()
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await expect(composer).toBeVisible()
      await expect(composer).toHaveAttribute("placeholder", "Tell Maya the messy version…")
      await captureMayaProof(page, "new-member-home")

      const composerBox = await composer.boundingBox()
      const viewport = page.viewportSize()
      expect(composerBox).not.toBeNull()
      expect(viewport).not.toBeNull()
      expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeLessThan(
        (viewport?.height ?? 0) - 55
      )

      await composer.fill("What should I focus on today?")
      await page.getByRole("button", { name: "Send message", exact: true }).click()
      await expect(page.getByText("Maya QA response for the Create task.")).toBeVisible()
      await page.getByRole("button", { name: "Menu" }).click()
      await expect(page.getByRole("button", { name: "Brand profile" })).toBeVisible()
    })

    test("turns the next-post outcome into one confirmed creation path", async ({
      page,
    }: {
      page: any
    }) => {
      await (page as any).__enableMayaCarouselJourney()
      const maya = page.locator("aside[data-maya-task-id]")

      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await composer.fill("I want to share why showing up before you feel ready matters")
      await page.getByRole("button", { name: "Send message", exact: true }).click()

      await expect(
        page.getByText("I want to share why showing up before you feel ready matters")
      ).toBeVisible()
      await expect(maya).toHaveAttribute("data-maya-format", "none")
      await expect(
        page.getByText(
          "I recommend a carousel because this idea needs a short teaching sequence. Shall I create it?"
        )
      ).toBeVisible()
      await expect(page.getByText("Maya recommends", { exact: true })).toBeVisible()
      await expect(page.getByText("You choose before Maya creates anything.")).toBeVisible()
      await expect(page.getByRole("button", { name: "Create the carousel" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Choose something else" })).toBeVisible()
      await expect(page.locator("summary").filter({ hasText: "Other options" })).toHaveCount(0)

      await page.getByRole("button", { name: "Create the carousel" }).click()
      await expect(maya).toHaveAttribute("data-maya-format", "carousel")
      await expect(page.getByText("Choose your style")).toHaveCount(0)
      await expect(page.getByText("Text on image")).toBeVisible()
      await page.getByRole("button", { name: "No text, just the visual" }).click()
      await expect(page.getByText("Three-part visibility carousel")).toBeVisible()

      await page.getByRole("button", { name: /Create this · 3 credits/i }).click()
      await expect(page.getByRole("button", { name: "Finish as a post" })).toBeVisible()
      await expect(page.getByRole("button", { name: /Turn this into Stories/i })).toHaveCount(0)
      await expect(page.getByText("More things Maya can make")).toHaveCount(0)
      await page.getByRole("button", { name: "Finish as a post" }).click()
      await expect(page.getByText("Post ready", { exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: "Save as ready post" })).toBeVisible()
      await expect(page.getByText("Would you post this?")).toHaveCount(0)
      await page.getByRole("button", { name: "Save as ready post" }).click()
      await expect(page.getByText(/Ready in Calendar · Post 10/)).toBeVisible()
      await expect(page.getByRole("button", { name: "Open Calendar" })).toBeVisible()
      await expect(page.getByText("Would you post this?")).toBeVisible()
      await page.getByRole("button", { name: "Almost", exact: true }).click()
      await expect(page.getByText("Thank you — this helps Maya improve.")).toBeVisible()
      await expect(page.getByRole("button", { name: /Make it more like me/i })).toBeVisible()
      await page.getByRole("button", { name: /Make it more like me/i }).click()
      await expect(composer).toHaveValue("Make this more like me by ")
      await expect(page.getByText("Photos", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Slides", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Motion", { exact: true })).toHaveCount(0)
      await captureMayaProof(page, "finished-post")
      await expect(
        page.getByText("A ready caption for this week's visibility piece.")
      ).toBeVisible()
      expect((page as any).__mayaFinishedPostPayloads).toMatchObject([
        {
          conceptTitle: "Three-part visibility carousel",
        },
      ])
      expect((page as any).__mayaFinishedPostPayloads[0].captionContext).toContain(
        "Three distinct scenes in one consistent visual world"
      )
      expect((page as any).__mayaReadyPostPayloads).toMatchObject([
        {
          assetIds: [991, 992, 993],
          conceptTitle: "Three-part visibility carousel",
          finishedCaption: "A ready caption for this week's visibility piece.",
        },
      ])
      expect((page as any).__mayaOperatingLayerCalendarMutations).toEqual([])

      await page.getByRole("button", { name: "Open Calendar" }).click()
      await expect(page.getByRole("button", { name: "Plan a new grid", exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: /Select post 10/ })).toBeVisible()
      await page.evaluate(() =>
        window.localStorage.setItem("sselfie.appV3.section.v1", JSON.stringify("create"))
      )

      await expect
        .poll(
          () =>
            page.evaluate(() => {
              const drafts = window.localStorage.getItem("sselfie.appV3.mayaTasks.v1")
              return drafts?.includes("calendarPlacement") ?? false
            }),
          { timeout: 5_000 }
        )
        .toBe(true)
      await expect
        .poll(
          () =>
            Array.from((page as any).__mayaChatStore.values()).some(
              (chat: any) =>
                JSON.stringify(chat.workspace).includes("calendarPlacement") &&
                JSON.stringify(chat.workspace).includes("finishedPost")
            ),
          { timeout: 5_000 }
        )
        .toBe(true)
      await page.goto("/e2e/maya-operating-layer", { waitUntil: "domcontentloaded" })
      const resume = page.getByRole("button", { name: /Resume/i })
      // A cold local Next compile can finish hydration after the default 5s assertion window.
      // Production serves the built bundle; keep the journey strict while allowing dev startup.
      await expect(resume).toBeVisible({ timeout: 15_000 })
      await captureMayaProof(page, "returning-member-saved-work")
      await resume.click()
      await expect(maya).toHaveAttribute("data-maya-format", "carousel")
      await expect(page.getByRole("button", { name: "Plan a new grid", exact: true })).toBeVisible()
      await expect(page.getByRole("button", { name: /Select post 10/ })).toBeVisible()
      await expect(page.getByText("Three-part visibility carousel")).toBeVisible()
      await expect(page.getByRole("button", { name: "Save as ready post" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: /Make it more like me/i })).toBeVisible()
      await expect(page.getByRole("button", { name: "Finish as a post" })).toHaveCount(0)
    })

    test("keeps the mobile result and its finish action in one usable view", async ({
      page,
    }: {
      page: any
    }) => {
      await (page as any).__enableMayaCarouselJourney()
      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await composer.fill("I want to share why showing up before you feel ready matters")
      await page.getByRole("button", { name: "Send message", exact: true }).click()
      await page.getByRole("button", { name: "Create the carousel" }).click()
      await page.getByRole("button", { name: "No text, just the visual" }).click()
      await page.getByRole("button", { name: /Create this · 3 credits/i }).click()

      const preview = page.locator(".suite-concept-result-preview")
      const finish = page.getByRole("button", { name: "Finish as a post" })
      await expect(preview).toBeVisible()
      await expect(finish).toBeVisible()

      const viewport = page.viewportSize()
      const previewBox = await preview.boundingBox()
      if (viewport && viewport.width <= 480) {
        expect(previewBox?.height ?? Number.POSITIVE_INFINITY).toBeLessThanOrEqual(
          viewport.height * 0.63
        )
      }
      await finish.scrollIntoViewIfNeeded()
      await captureMayaViewportProof(page, "result-and-finish-action")
    })

    test("keeps the Edit a Photo composer above mobile navigation", async ({
      page,
    }: {
      page: any
    }) => {
      await page.goto("/e2e/maya-operating-layer?cohort=member", {
        waitUntil: "domcontentloaded",
      })
      await page.getByRole("button", { name: /Edit a Photo/i }).click()
      await page.getByRole("button", { name: "Choose a photo" }).click()
      await expect(page.getByRole("heading", { name: "Choose a photo to edit" })).toBeVisible()
      await page.getByRole("button", { name: /Open Member portrait/i }).click()

      const dialog = page.getByRole("dialog", { name: "Edit with Maya" })
      const composer = page.getByRole("textbox", { name: "Tell Maya what to change" })
      await expect(dialog).toBeVisible()
      await expect(composer).toBeVisible()
      await expect(dialog).not.toHaveCSS("background-color", "rgba(0, 0, 0, 0)")
      await page.getByRole("button", { name: "Change the outfit to" }).click()
      await expect(composer).toHaveValue("Change the outfit to ")

      const viewport = page.viewportSize()
      const composerBox = await composer.boundingBox()
      expect(composerBox).not.toBeNull()
      expect(viewport).not.toBeNull()
      expect((composerBox?.y ?? 0) + (composerBox?.height ?? 0)).toBeLessThan(viewport?.height ?? 0)
      await captureMayaViewportProof(page, "edit-mode-composer")
    })

    test("saves founder feedback without interrupting the Maya test session", async ({
      page,
    }: {
      page: any
    }) => {
      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await expect(composer).toBeVisible()
      await page.getByRole("button", { name: "Report", exact: true }).click()
      await expect(page.getByRole("dialog", { name: "Report what felt wrong" })).toBeVisible()
      await page.getByRole("button", { name: "Not good enough" }).click()
      await page
        .getByRole("textbox", { name: "What happened?" })
        .fill("The answer is useful but still sounds generic.")
      await page.getByRole("button", { name: "Save and keep testing" }).click()

      await expect(page.getByRole("status")).toContainText("Saved. Keep testing Maya.")
      await expect(composer).toBeVisible()
      await page.getByRole("button", { name: "Report", exact: true }).click()
      await page.getByRole("button", { name: "Reports" }).click()
      await expect(page.getByText("The answer is useful but still sounds generic.")).toBeVisible()
      await expect(page.getByText("Received")).toBeVisible()
      expect((page as any).__mayaFounderReports).toHaveLength(1)
    })

    test("keeps existing operating-layer members on their focused Today experience", async ({
      page,
    }: {
      page: any
    }) => {
      await page.goto("/e2e/maya-operating-layer?home=0", { waitUntil: "domcontentloaded" })

      await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      )
      await expect(
        page.getByRole("heading", { name: "Maya QA, your next finished post starts here." })
      ).toBeVisible()
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Open Maya" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Report", exact: true })).toHaveCount(0)
      await captureMayaProof(page, "current-returning-member-today")
    })

    test("a first-time current member sees the real member-facing Today experience", async ({
      page,
    }: {
      page: any
    }) => {
      await page.goto("/e2e/maya-operating-layer?home=0&member=new", {
        waitUntil: "domcontentloaded",
      })

      await expect(page.getByRole("button", { name: "Today", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      )
      await expect(
        page.getByRole("heading", { name: "Maya QA, your next finished post starts here." })
      ).toBeVisible()
      await expect(page.getByRole("button", { name: "Report", exact: true })).toHaveCount(0)
      await captureMayaProof(page, "current-first-time-member-today")
    })

    test("returning members land with Maya even when their last saved tab was Calendar", async ({
      page,
    }: {
      page: any
    }) => {
      await page.goto("/e2e/maya-operating-layer?cohort=member", {
        waitUntil: "domcontentloaded",
      })
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      await page.evaluate(() =>
        window.localStorage.setItem("sselfie.appV3.section.v1", JSON.stringify("calendar"))
      )
      await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem("sselfie.appV3.section.v1")))
        .toBe('"calendar"')
      await page.goto("/e2e/maya-operating-layer?cohort=member", {
        waitUntil: "domcontentloaded",
      })

      await expect
        .poll(() => page.evaluate(() => window.localStorage.getItem("sselfie.appV3.section.v1")))
        .toBe('"create"')

      await expect(page.getByRole("button", { name: "Maya", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      )
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      await expect(page.getByPlaceholder("Tell Maya the messy version…")).toBeVisible()
      await expect(page.getByRole("button", { name: "Report", exact: true })).toHaveCount(0)
      await captureMayaProof(page, "returning-member-home")
    })

    test("a first-time member gets one clear starting action without format switches", async ({
      page,
    }: {
      page: any
    }) => {
      await page.goto("/e2e/maya-operating-layer?member=new&cohort=member", {
        waitUntil: "domcontentloaded",
      })

      await expect(page.getByRole("heading", { name: /what do you want to say/i })).toBeVisible()
      await expect(page.getByPlaceholder("Tell Maya the messy version…")).toBeVisible()
      await expect(page.getByRole("button", { name: "Create my next post" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Report", exact: true })).toHaveCount(0)
      await expect(page.getByText("Start with one real idea.")).toHaveCount(0)
      await expect(page.getByText("Photos", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Slides", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Motion", { exact: true })).toHaveCount(0)
      await captureMayaProof(page, "first-time-member-home")
    })

    test("ordinary writing help stays in the same neutral conversation", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")
      const composer = page.getByRole("textbox", { name: "Message Maya" })

      await composer.fill("Help me write a warm reply to a customer who feels stuck")
      await page.getByRole("button", { name: "Send" }).click()

      await expect(
        page.getByText("Help me write a warm reply to a customer who feels stuck")
      ).toBeVisible()
      await expect(page.getByText("Maya QA response for the Create task.")).toBeVisible()
      await expect(maya).toHaveAttribute("data-maya-format", "none")
      await expect(page.getByText("Choose your style")).toHaveCount(0)

      await composer.fill("Can you explain why this photo feels off?")
      await page.getByRole("button", { name: "Send" }).click()
      await expect(page.getByText("Can you explain why this photo feels off?")).toBeVisible()
      await expect(maya).toHaveAttribute("data-maya-format", "none")
      await expect(page.getByText("Choose your style")).toHaveCount(0)
    })

    // Archived compatibility journey: Calendar is dormant and is not a current member beta job.
    test.skip("Decide what to post and Finish a selected Calendar post start in Calendar", async ({
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

    test.skip("Improve a grid starts from Visual direction", async ({ page }: { page: any }) => {
      await page.getByRole("button", { name: "Calendar" }).click()
      await page.getByRole("button", { name: "Visual direction" }).click()
      await expect(page.getByRole("dialog")).toBeVisible()
    })

    // Archived compatibility journeys: Learn is not part of the current Maya / Work / You beta.
    test.skip("Learn starts with one source-backed Maya recommendation", async ({
      page,
    }: {
      page: any
    }) => {
      await page.getByRole("button", { name: "Learn" }).click()
      await expect(page.getByRole("heading", { name: "Maya recommends next" })).toBeVisible()
      await expect(page.getByRole("button", { name: "I don't know what to post" })).toHaveCount(0)
      await expect(page.getByText("Start here")).toBeVisible()
      await expect(
        page.getByRole("heading", { name: "Post Before You Feel Ready", exact: true })
      ).toBeVisible()
      await expect(page.getByText(/From Post Before You Feel Ready/i)).toBeVisible()
      await expect(page.getByRole("button", { name: "Do this with Maya" })).toBeVisible()
      await expect(page.getByText("Branded by SSELFIE", { exact: true })).toHaveCount(0)
      await page.getByRole("button", { name: "Browse all" }).click()
      await expect(page.getByText("Branded by SSELFIE", { exact: true })).toBeVisible()
    })

    test.skip("keeps a source-backed lesson bound through the Learn to Maya handoff and reload", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")
      await page.getByRole("button", { name: "Learn" }).click()
      await page.getByRole("button", { name: "Do this with Maya" }).click()

      await expect(maya).toHaveAttribute("data-maya-job", "learn_next")
      await expect(maya).toHaveAttribute("data-maya-surface", "learn")
      await expect(maya).toHaveAttribute("data-maya-course-id", "14")
      await expect(maya).toHaveAttribute("data-maya-lesson-id", "140")
      await expect(page.getByRole("heading", { name: "One useful next step" })).toBeVisible()
      await expect(page.getByText("Sandra's method")).toBeVisible()
      await expect(page.getByRole("button", { name: "Preview" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Attach an inspiration image" })).toHaveCount(0)

      await page.waitForTimeout(900)
      // Founder-cohort reloads deliberately return to Maya Home. The exact Learn task remains
      // one visible action away instead of forcing the member back into the Learn library.
      await page.goto("/e2e/maya-operating-layer", { waitUntil: "domcontentloaded" })
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      await page.getByRole("button", { name: /Resume/i }).click()
      await expect(maya).toHaveAttribute("data-maya-job", "learn_next")
      await expect(maya).toHaveAttribute("data-maya-course-id", "14")
      await expect(maya).toHaveAttribute("data-maya-lesson-id", "140")
      await expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([])
    })

    test("keeps the current member shell inside the viewport", async ({ page }: { page: any }) => {
      await page.goto("/e2e/maya-operating-layer?home=0", { waitUntil: "domcontentloaded" })
      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth
      )
      expect(overflow).toBe(false)
      await expect(page.getByRole("button", { name: "You", exact: true })).toBeVisible()
    })

    test("keeps Gallery assets stored and offers one clear variation handoff", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")
      await page.goto("/e2e/maya-operating-layer?home=0&view=photos", {
        waitUntil: "domcontentloaded",
      })
      await expect(page.getByRole("button", { name: "Work", exact: true })).toHaveAttribute(
        "aria-current",
        "page"
      )
      await expect(page.getByRole("heading", { name: "Everything you're making" })).toBeVisible()
      await page.getByRole("button", { name: /Open Member portrait/i }).click()
      const lightbox = page.getByRole("dialog", { name: "Your finished creation" })
      await expect(lightbox).toBeVisible()
      await expect(lightbox.getByRole("button", { name: "Download", exact: true })).toBeVisible()
      await expect(lightbox.getByRole("button", { name: "Finish as a post" })).toHaveCount(0)
      await lightbox.getByRole("button", { name: "Create a variation" }).click()

      await expect(maya).toHaveAttribute("data-maya-surface", "gallery")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "present")
      expect((page as any).__mayaOperatingLayerCalendarMutations).toEqual([])
    })

    test.skip("routes a free Calendar caption improvement through one action, result, and undo", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")
      await page.getByRole("button", { name: "Calendar" }).click()
      await page.getByRole("button", { name: "Select post 7" }).click()
      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toBeVisible()
      await page.getByRole("button", { name: "Improve with Maya" }).click()

      await expect(page.getByRole("dialog", { name: "Edit calendar post" })).toHaveCount(0)
      await expect(maya).toHaveAttribute("data-maya-post-id", "707")
      await expect(page.getByRole("heading", { name: "Post 7 · Maya Phase QA" })).toBeVisible()
      const action = page.locator('section[data-maya-action-kind="improve_caption"]')
      await expect(action).toHaveAttribute("data-maya-action-status", "recommended")
      await expect(action).toContainText(/can undo/i)
      await action.getByRole("button", { name: "Rewrite caption" }).click()
      await expect(action).toHaveAttribute("data-maya-action-status", "succeeded")
      await action.getByRole("button", { name: "Undo" }).click()
      await expect(action).toHaveAttribute("data-maya-action-status", "undone")

      expect((page as any).__mayaOperatingLayerCalendarMutations).toEqual([
        "POST /api/feed/101/enhance-caption",
        "PATCH /api/feed/101/update-caption",
      ])
      expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([])
    })

    test.skip("keeps Create and Calendar tasks isolated across post switches, History, and reload", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")

      const homeComposer = page.getByRole("textbox", { name: "Message Maya" })
      await homeComposer.fill("Phase one Create task")
      await page.getByRole("button", { name: "Send" }).click()
      await expect(maya).toHaveAttribute("data-maya-job", "create_content")
      await expect(maya).toHaveAttribute("data-maya-surface", "create")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")
      const firstCreateTask = await maya.getAttribute("data-maya-task-id")
      expect(firstCreateTask).toMatch(/^maya-/)
      await expect(page.getByText("Maya QA response for the Create task.")).toBeVisible()
      expect((page as any).__mayaOperatingLayerChatHistoryLookups).not.toContain(firstCreateTask)

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
      await page.getByRole("button", { name: "Work", exact: true }).click()
      await expect(page.getByRole("dialog", { name: "Your post projects" })).toBeVisible()
      await expect(page.getByRole("dialog")).toHaveCount(1)
      await page.keyboard.press("Escape")
      await expect(page.getByRole("dialog", { name: "Your post projects" })).toHaveCount(0)
      await expect(maya).toBeVisible()

      await page.getByRole("button", { name: "Close", exact: true }).click()
      // Keyboard activation avoids the local Next.js dev badge, which overlaps the bottom-left
      // tab at 390 px but is not present in production, and verifies the same control is usable.
      await page.getByRole("button", { name: "Maya", exact: true }).press("Enter")
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
      await page.goto("/e2e/maya-operating-layer", { waitUntil: "domcontentloaded" })
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      await expect(maya).toHaveAttribute("data-maya-job", "create_content")
      await expect(maya).toHaveAttribute("data-maya-surface", "create")
      await expect(maya).toHaveAttribute("data-maya-format", "none")
      await expect(maya).toHaveAttribute("data-maya-inspiration", "none")

      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await composer.focus()
      await expect(composer).toBeFocused()
      const viewport = await page.evaluate(() => ({
        rootOverflow: document.documentElement.scrollWidth > window.innerWidth,
        drawerOverflow:
          (document.querySelector("aside[data-maya-task-id]")?.scrollWidth ?? 0) >
          (document.querySelector("aside[data-maya-task-id]")?.clientWidth ?? 0),
      }))
      expect(viewport).toEqual({ rootOverflow: false, drawerOverflow: false })

      await page.getByRole("button", { name: "Menu" }).click()
      await page.getByRole("button", { name: "Work", exact: true }).click()
      const history = page.getByRole("dialog", { name: "Your post projects" })
      await expect(history).toBeVisible()
      await history.getByRole("button", { name: /post 7.*Keep working/i }).click()
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
      await page.goto("/e2e/maya-operating-layer", { waitUntil: "domcontentloaded" })
      await expect(page.getByRole("region", { name: /what do you want to say/i })).toBeVisible()
      await page.getByRole("button", { name: /Resume/i }).click()
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-707")
      await expect(maya).toHaveAttribute("data-maya-post-id", "707")
      await page.waitForTimeout(900)
      await expect(page.getByText("Let's create photos.", { exact: true })).toHaveCount(0)
      await expect(page.getByText("Maya QA response for post 7.")).toHaveCount(1)

      await page.keyboard.press("Escape")
      await expect(maya).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Open Maya" })).toHaveCount(0)
      await expect(page.getByRole("button", { name: "Maya", exact: true })).toBeVisible()
      expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([])
    })

    test("creates a multi-slide concept in one credit-labelled action and keeps every slide visible", async ({
      page,
    }: {
      page: any
    }) => {
      ;(page as any).__enableMayaCarouselJourney()

      const composer = page.getByRole("textbox", { name: "Message Maya" })
      await composer.fill("Create a three-slide visibility carousel")
      await page.getByRole("button", { name: "Send" }).click()

      await expect(page.getByText("Text on image")).toBeVisible()
      await page.getByRole("button", { name: "No text, just the visual" }).click()
      await expect(page.getByText("Three-part visibility carousel")).toBeVisible()
      await expect(page.getByRole("button", { name: "Preview" })).toHaveCount(0)
      const create = page.getByRole("button", { name: "Create this · 3 credits" })
      await expect(create).toBeVisible()
      await create.dblclick()

      await expect(page.getByRole("button", { name: "View all slides" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Download all 3" })).toBeVisible()
      await expect(page.getByRole("button", { name: "View slide 1 of 3" })).toBeVisible()
      await expect(page.getByRole("button", { name: "View slide 2 of 3" })).toBeVisible()
      await expect(page.getByRole("button", { name: "View slide 3 of 3" })).toBeVisible()
      expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([
        "POST /api/app-v3/maya/generate",
      ])
      expect((page as any).__mayaOperatingLayerPaidRequestIds).toHaveLength(1)
    })

    test.skip("runs one-step create, apply, reload, and undo with retry-safe boundaries", async ({
      page,
    }: {
      page: any
    }) => {
      const maya = page.locator("aside[data-maya-task-id]")
      ;(page as any).__enableMayaActionJourney()

      await page.getByRole("button", { name: "Calendar" }).click()
      await page.getByRole("button", { name: "Select post 8" }).click()
      await page.getByRole("button", { name: /Create with Maya/i }).click()
      await expect(maya).toHaveAttribute("data-maya-post-id", "708")

      await expect(
        page.locator(
          'section[data-maya-action-kind="create_both"], section[data-maya-action-kind="create_image"]'
        )
      ).toHaveCount(0)
      const create = page.getByRole("button", { name: "Create my photo · 1 credit" })
      await expect(create).toBeVisible()
      await expect(page.getByRole("button", { name: "Preview" })).toHaveCount(0)
      await create.dblclick()
      await expect(page.getByText("Provider unavailable. Try again safely.")).toBeVisible()
      await create.click()

      await expect(page.getByAltText("Editorial direction for post 8")).toBeVisible()
      expect((page as any).__mayaOperatingLayerPaidRequests).toEqual([
        "POST /api/app-v3/maya/generate",
        "POST /api/app-v3/maya/generate",
      ])
      const requestIds = (page as any).__mayaOperatingLayerPaidRequestIds
      expect(requestIds).toHaveLength(2)
      expect(requestIds[0]).toBe(requestIds[1])
      ;(page as any).__mayaOperatingLayerErrors.length = 0

      const applyAction = page.locator('section[data-maya-action-kind="apply_to_post"]')
      await expect(applyAction).toHaveAttribute("data-maya-action-status", "recommended")
      await applyAction.getByRole("button", { name: "Preview" }).click()
      await expect(applyAction).toContainText("Free")
      await applyAction.getByRole("button", { name: "Confirm and apply" }).click()
      await expect(applyAction).toHaveAttribute("data-maya-action-status", "failed")
      await expect(applyAction.getByRole("alert")).toContainText(
        "The photo is in post 8, but the caption did not finish"
      )
      await expect(page.getByText("Photo added. The caption needs another try.")).toBeVisible()
      await applyAction.getByRole("button", { name: "Try again" }).click()
      await expect(applyAction).toHaveAttribute("data-maya-action-status", "succeeded")
      expect((page as any).__mayaOperatingLayerCalendarMutations).toEqual([
        "POST /api/feed/101/replace-post-image",
        "POST /api/feed/101/replace-post-image",
      ])
      const mutationKeys = (page as any).__mayaOperatingLayerCalendarMutationKeys
      expect(mutationKeys).toHaveLength(2)
      expect(mutationKeys[0]).toMatch(/^maya-action-/)
      expect(mutationKeys[1]).toBe(mutationKeys[0])

      await page.waitForTimeout(900)
      await page.goto("/e2e/maya-operating-layer", { waitUntil: "domcontentloaded" })
      await expect(maya).toBeVisible()
      // Maya Home stays neutral while keeping the exact completed Calendar task one action away.
      await expect
        .poll(() =>
          page.evaluate(() => window.localStorage.getItem("sselfie.maya.last-active-task.v1"))
        )
        .toBe("maya-calendar-v1-101-708")
      const resume = page.getByRole("button", { name: /Resume/i })
      await expect(resume).toContainText(/post 8/i)
      await resume.click()
      await expect(maya).toHaveAttribute("data-maya-task-id", "maya-calendar-v1-101-708")
      const restoredApplyAction = page.locator('section[data-maya-action-kind="apply_to_post"]')
      await expect(restoredApplyAction).toHaveAttribute("data-maya-action-status", "succeeded")
      await expect(page.getByRole("button", { name: "Undo", exact: true })).toHaveCount(1)
      await restoredApplyAction.getByRole("button", { name: "Undo" }).click()
      await expect(restoredApplyAction).toHaveAttribute("data-maya-action-status", "undone")
      expect((page as any).__mayaOperatingLayerCalendarMutations).toEqual([
        "POST /api/feed/101/replace-post-image",
        "POST /api/feed/101/replace-post-image",
        "PATCH /api/feed/101/update-caption",
        "POST /api/feed/101/remove-post-image",
      ])

      const overflow = await page.evaluate(() => ({
        root: document.documentElement.scrollWidth > window.innerWidth,
        drawer:
          (document.querySelector("aside[data-maya-task-id]")?.scrollWidth ?? 0) >
          (document.querySelector("aside[data-maya-task-id]")?.clientWidth ?? 0),
      }))
      expect(overflow).toEqual({ root: false, drawer: false })
    })
  })
}
