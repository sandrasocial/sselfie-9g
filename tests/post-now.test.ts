// @vitest-environment node
// POST-NOW-01: the "I need something to post now" tool.
// Guardrails: one guarded Anthropic pass returns exactly three distinct
// ready-tonight options, the used log is fed into the prompt so nothing
// repeats, marking used/dismissed is wired, and a missing weekly brief
// degrades gracefully instead of failing.
import fs from "node:fs"
import path from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { ContentBrief } from "@/lib/content-engine/brief-generator"

const { anthropicCreateMock } = vi.hoisted(() => ({ anthropicCreateMock: vi.fn() }))

vi.mock("@anthropic-ai/sdk", () => ({
  default: class MockAnthropic {
    messages = {
      create: (...args: unknown[]) => anthropicCreateMock(...args),
    }
  },
}))

const { sqlMock } = vi.hoisted(() => ({ sqlMock: vi.fn() }))

vi.mock("@/lib/db/client", () => ({ sql: sqlMock }))

process.env.ANTHROPIC_API_KEY = "test-key"

const root = process.cwd()
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8")

function validOptions() {
  return [
    {
      type: "repurpose",
      title: "Recut the June selfie tutorial as a carousel",
      source: "your top reel from June 14 (2,300 saves, 41,000 reach)",
      executeIn: "20 min",
      steps: ["Pull the reel", "Screenshot the 3 key frames", "New hook on slide 1", "Post with a save CTA"],
      permalink: "https://www.instagram.com/p/winner123/",
    },
    {
      type: "trend-test",
      title: "Test the film-grain portrait wave tonight",
      source: "this week's trend radar",
      executeIn: "25 min",
      steps: ["Hook: the exact line on screen", "Second one: your real face, phone in hand", "CTA: comment PROMPT"],
    },
    {
      type: "story-sequence",
      title: "The 'what do I post' ladder",
      source: "DM question from this week",
      executeIn: "15 min",
      steps: [
        "Frame 1: tonight's photo + poll",
        "Frame 2: slider on the struggle",
        "Frame 3: one tiny lesson",
        "Frame 4: question box",
      ],
    },
  ]
}

function toolResponse(options: unknown) {
  return {
    stop_reason: "tool_use",
    content: [
      {
        type: "tool_use",
        id: "tool_1",
        name: "deliver_post_now_options",
        input: { options },
      },
    ],
  }
}

const miniBrief = {
  contentPlan: [
    {
      day: "Tuesday",
      format: "reel",
      funnelStage: "cold",
      title: "One selfie, five shoots",
      hook: "You only need one clear selfie",
      visualHook: "Phone up, real kitchen light",
      onScreenText: ["Line one", "Line two"],
      whyThisWorks: "Proven",
    },
  ],
  trendRadar: [
    {
      trend: "Film-grain portraits",
      whyItsMoving: "Anti-perfect wave",
      howSandraRidesIt: "Her own face, real grain",
      noFakeGuardrail: "Still her, never fake",
    },
  ],
  hookIntelligence: [
    { hook: "I stopped hiring photographers", pattern: "confession", source: "your-data", evidence: "top reel" },
  ],
  onScreenHookBank: [
    {
      text: "5 selfie mistakes making you invisible",
      pattern: "mistake framing plus number",
      watchThroughMechanic: "counts down 5 to 1",
      source: "research",
      evidence: "adapted from a working overlay pattern in the niche",
    },
  ],
  demandMap: {
    strongestDemandSignal: "Prompt copies",
    painfulBefore: "Feels invisible",
    desiredAfter: "Recognizable",
    beliefShift: "One selfie is enough",
    primaryOfferBridge: "PROMPT",
    contentWarning: "No more mirror selfies",
    audienceQuestions: [{ question: "What app do you use?", suggestedAnswerContent: "A reel" }],
  },
  storySequence: { theme: "From stuck to posted", frames: [] },
} as unknown as ContentBrief

const performanceSnapshot = {
  username: "sandra.social",
  followers: 110000,
  postsAnalyzed: 20,
  insightsLevel: "full",
  topPosts: [
    {
      id: "1",
      permalink: "https://www.instagram.com/p/winner123/",
      format: "reel",
      postedAt: "2026-06-14T18:00:00Z",
      caption: "caption",
      hookLine: "You only need one selfie",
      likes: 5000,
      comments: 200,
      views: 90000,
      reach: 41000,
      saves: 2300,
      shares: 800,
      engagementScore: 9,
    },
  ],
  allPosts: [],
} as any

describe("post-now generation", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    sqlMock.mockResolvedValue([])
  })

  it("returns three options with all three distinct types and derived fingerprints", async () => {
    anthropicCreateMock.mockResolvedValue(toolResponse(validOptions()))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    const result = await generatePostNowOptions({
      weeklyBrief: miniBrief,
      performance: performanceSnapshot,
      recentFingerprints: [],
      dismissedFingerprints: [],
    })

    expect(result.options).toHaveLength(3)
    expect(new Set(result.options.map((o) => o.type))).toEqual(
      new Set(["repurpose", "trend-test", "story-sequence"]),
    )
    const repurpose = result.options.find((o) => o.type === "repurpose")!
    expect(repurpose.permalink).toBe("https://www.instagram.com/p/winner123/")
    expect(repurpose.fingerprint).toBe("https://www.instagram.com/p/winner123/")
    const trend = result.options.find((o) => o.type === "trend-test")!
    expect(trend.fingerprint).toBe(trend.title.toLowerCase())
    expect(result.missingInputs).toEqual([])
  })

  it("feeds the used log exclusions and brief intelligence into the prompt", async () => {
    anthropicCreateMock.mockResolvedValue(toolResponse(validOptions()))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    await generatePostNowOptions({
      weeklyBrief: miniBrief,
      performance: performanceSnapshot,
      recentFingerprints: ["https://www.instagram.com/p/already-used/"],
      dismissedFingerprints: ["some dismissed title"],
    })

    const call = anthropicCreateMock.mock.calls[0][0] as {
      model: string
      max_tokens: number
      system: string
      messages: Array<{ content: string }>
      tool_choice: { type: string; name: string }
    }
    expect(call.model).toBe("claude-sonnet-4-5")
    expect(call.max_tokens).toBe(2500)
    expect(call.tool_choice).toEqual({ type: "tool", name: "deliver_post_now_options" })
    const userContent = call.messages[0].content
    // Used log exclusions reach the model.
    expect(userContent).toContain("doNotRepeat")
    expect(userContent).toContain("https://www.instagram.com/p/already-used/")
    expect(userContent).toContain("some dismissed title")
    // Weekly brief intelligence and top posts reach the model.
    expect(userContent).toContain("trendRadar")
    expect(userContent).toContain("Film-grain portraits")
    expect(userContent).toContain("winner123")
    expect(userContent).toContain("localHour")
    // The on-screen hook bank reaches the model with its literal overlay lines.
    expect(userContent).toContain("onScreenHookBank")
    expect(userContent).toContain("5 selfie mistakes making you invisible")
    // Every option's first step must name the exact on-screen text to use.
    expect(call.system).toContain("exact on-screen text")
    expect(call.system).toContain("weeklyBrief.onScreenHookBank")
    expect(call.system).toContain("not the caption")
    // No web research in the post-now path: no web search tool attached.
    expect(JSON.stringify(call)).not.toContain("web_search")
    // The system prompt forbids repeats and invented numbers.
    expect(call.system).toContain("doNotRepeat")
    expect(call.system).toContain("ONLY numbers that appear in the input JSON")
    expect(anthropicCreateMock.mock.calls[0][1]).toMatchObject({
      maxRetries: 0,
      timeout: expect.any(Number),
    })
    expect((anthropicCreateMock.mock.calls[0][1] as { timeout: number }).timeout).toBeLessThan(60_000)
  })

  it("throws when the model does not return three distinct types", async () => {
    const options = validOptions()
    options[1].type = "repurpose"
    anthropicCreateMock.mockResolvedValue(toolResponse(options))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    await expect(
      generatePostNowOptions({
        weeklyBrief: miniBrief,
        performance: performanceSnapshot,
        recentFingerprints: [],
        dismissedFingerprints: [],
      }),
    ).rejects.toThrow(/three distinct option types/)
  })

  it("throws when an option repeats an excluded fingerprint", async () => {
    anthropicCreateMock.mockResolvedValue(toolResponse(validOptions()))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    await expect(
      generatePostNowOptions({
        weeklyBrief: miniBrief,
        performance: performanceSnapshot,
        recentFingerprints: ["https://www.instagram.com/p/winner123/"],
        dismissedFingerprints: [],
      }),
    ).rejects.toThrow(/repeats an excluded suggestion/)
  })

  it("degrades gracefully when the weekly brief is missing: names missing inputs, still generates", async () => {
    anthropicCreateMock.mockResolvedValue(toolResponse(validOptions()))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    const result = await generatePostNowOptions({
      weeklyBrief: null,
      performance: performanceSnapshot,
      recentFingerprints: [],
      dismissedFingerprints: [],
    })

    expect(result.missingInputs).toContain("weekly brief")
    expect(result.options).toHaveLength(3)
    const call = anthropicCreateMock.mock.calls[0][0] as { system: string; messages: Array<{ content: string }> }
    // The evergreen story ladder fallback is available to the model.
    expect(call.system).toContain("Evergreen story ladder")
    expect(call.messages[0].content).toContain("missingInputs")
    expect(call.messages[0].content).toContain("weekly brief")
  })

  it("retries once on max_tokens, then refuses", async () => {
    anthropicCreateMock
      .mockResolvedValueOnce({ stop_reason: "max_tokens", content: [] })
      .mockResolvedValueOnce(toolResponse(validOptions()))
    const { generatePostNowOptions } = await import("@/lib/admin/post-now")

    const result = await generatePostNowOptions({
      weeklyBrief: miniBrief,
      performance: performanceSnapshot,
      recentFingerprints: [],
      dismissedFingerprints: [],
    })
    expect(result.options).toHaveLength(3)
    expect(anthropicCreateMock).toHaveBeenCalledTimes(2)

    anthropicCreateMock.mockReset()
    anthropicCreateMock.mockResolvedValue({ stop_reason: "max_tokens", content: [] })
    await expect(
      generatePostNowOptions({
        weeklyBrief: miniBrief,
        performance: performanceSnapshot,
        recentFingerprints: [],
        dismissedFingerprints: [],
      }),
    ).rejects.toThrow(/max_tokens twice/)
  })
})

describe("post-now route", () => {
  const getUserMock = vi.fn()
  const runPostNowMock = vi.fn()
  const setSuggestionStatusMock = vi.fn()

  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    delete process.env.CRON_SECRET
    vi.doMock("@/lib/supabase/server", () => ({
      createServerClient: async () => ({ auth: { getUser: getUserMock } }),
    }))
    vi.doMock("@/lib/admin/post-now", () => ({
      runPostNow: runPostNowMock,
      setSuggestionStatus: setSuggestionStatusMock,
    }))
  })

  it("rejects POST without admin auth", async () => {
    getUserMock.mockResolvedValue({ data: { user: null } })
    const { POST } = await import("@/app/api/admin/content-kit/post-now/route")
    const response = await POST(new Request("http://localhost/api/admin/content-kit/post-now", { method: "POST" }) as any)
    expect(response.status).toBe(401)
    expect(runPostNowMock).not.toHaveBeenCalled()
  })

  it("accepts the CRON_SECRET bearer convention and returns options", async () => {
    process.env.CRON_SECRET = "test-cron"
    runPostNowMock.mockResolvedValue({
      options: [{ id: 1, type: "repurpose", title: "t", source: "s", executeIn: "15 min", steps: ["a", "b"], permalink: null, fingerprint: "t" }],
      missingInputs: ["weekly brief"],
    })
    const { POST } = await import("@/app/api/admin/content-kit/post-now/route")
    const response = await POST(
      new Request("http://localhost/api/admin/content-kit/post-now", {
        method: "POST",
        headers: { authorization: "Bearer test-cron" },
      }) as any,
    )
    const body = await response.json()
    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.options).toHaveLength(1)
    expect(body.missingInputs).toEqual(["weekly brief"])
  })

  it("returns a JSON timeout before the platform can return a non-JSON 504", async () => {
    vi.useFakeTimers()
    process.env.CRON_SECRET = "test-cron"
    process.env.POST_NOW_ROUTE_TIMEOUT_MS = "10"
    runPostNowMock.mockImplementation(() => new Promise(() => {}))
    const { POST } = await import("@/app/api/admin/content-kit/post-now/route")
    const promise = POST(
      new Request("http://localhost/api/admin/content-kit/post-now", {
        method: "POST",
        headers: { authorization: "Bearer test-cron" },
      }) as any,
    )

    await vi.advanceTimersByTimeAsync(11)
    const response = await promise
    const body = await response.json()
    expect(response.status).toBe(504)
    expect(body.success).toBe(false)
    expect(body.error).toContain("took too long")
    vi.useRealTimers()
    delete process.env.POST_NOW_ROUTE_TIMEOUT_MS
  })

  it("allows the admin session user", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "ssa@ssasocial.com" } } })
    runPostNowMock.mockResolvedValue({ options: [], missingInputs: [] })
    const { POST } = await import("@/app/api/admin/content-kit/post-now/route")
    const response = await POST(new Request("http://localhost/api/admin/content-kit/post-now", { method: "POST" }) as any)
    expect(response.status).toBe(200)
    expect(runPostNowMock).toHaveBeenCalledTimes(1)
  })

  it("PATCH marks an option used and validates status", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "ssa@ssasocial.com" } } })
    setSuggestionStatusMock.mockResolvedValue(true)
    const { PATCH } = await import("@/app/api/admin/content-kit/post-now/route")

    const ok = await PATCH(
      new Request("http://localhost/api/admin/content-kit/post-now", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 5, status: "used" }),
      }) as any,
    )
    expect(ok.status).toBe(200)
    expect(setSuggestionStatusMock).toHaveBeenCalledWith(5, "used")

    const bad = await PATCH(
      new Request("http://localhost/api/admin/content-kit/post-now", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 5, status: "done" }),
      }) as any,
    )
    expect(bad.status).toBe(400)
  })

  it("PATCH returns 404 when the suggestion does not exist", async () => {
    getUserMock.mockResolvedValue({ data: { user: { email: "ssa@ssasocial.com" } } })
    setSuggestionStatusMock.mockResolvedValue(false)
    const { PATCH } = await import("@/app/api/admin/content-kit/post-now/route")
    const response = await PATCH(
      new Request("http://localhost/api/admin/content-kit/post-now", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: 999, status: "dismissed" }),
      }) as any,
    )
    expect(response.status).toBe(404)
  })
})

describe("post-now UI wiring", () => {
  const client = read("components/admin/post-now-client.tsx")

  it("has the prominent button and honest loading copy", () => {
    expect(client).toContain("I need something to post now")
    expect(client).toContain("Pulling from your winners and this week's brief...")
  })

  it("marks options used or dismissed with visible text buttons, not title-attribute-only affordances", () => {
    expect(client).toContain("Used it")
    expect(client).toContain("Not for me")
    expect(client).toContain('method: "PATCH"')
    expect(client).toContain('status: next')
    // No hover-only affordances: the component never relies on title attributes.
    expect(client).not.toMatch(/\btitle=/)
  })

  it("links the repurpose option back to the original post and surfaces missing inputs", () => {
    expect(client).toContain("Open the original post")
    expect(client).toContain("option.permalink")
    expect(client).toContain("missingInputs")
  })

  it("does not parse admin responses with raw res.json only", () => {
    // 2026-07-06: readAdminJson moved to the shared lib/admin/safe-fetch-json helper.
    const helper = read("lib/admin/safe-fetch-json.ts")
    expect(client).toContain('import { readAdminJson } from "@/lib/admin/safe-fetch-json"')
    expect(helper).toContain("response.text()")
    expect(helper).toContain("non-JSON")
    expect(client).not.toContain("const json = await res.json()")
  })

  it("is embedded on the content page and linked from admin home (no new admin page)", () => {
    const contentPage = read("app/admin/content-brief/page.tsx")
    expect(contentPage).toContain("PostNowClient")
    const home = read("app/admin/page.tsx")
    expect(home).toContain("/admin/content-brief#post-now")
    expect(fs.existsSync(path.join(root, "app/admin/post-now"))).toBe(false)
  })

  it("has a formal migration record for the used log", () => {
    const migration = read("migrations/20260702_content_suggestion_log.sql")
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS content_suggestion_log")
    for (const column of ["created_at", "type", "fingerprint", "status", "payload"]) {
      expect(migration).toContain(column)
    }
  })
})
