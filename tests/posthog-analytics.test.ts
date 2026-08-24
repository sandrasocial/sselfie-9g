import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("server-only", () => ({}))

import {
  buildPostHogProperties,
  capturePostHogEvent,
  mapPostHogEvent,
} from "@/lib/analytics/posthog"

describe("PostHog analytics boundary", () => {
  beforeEach(() => {
    process.env.POSTHOG_PROJECT_KEY = "phc_test_project"
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com"
  })

  afterEach(() => {
    delete process.env.POSTHOG_PROJECT_KEY
    delete process.env.POSTHOG_HOST
    vi.restoreAllMocks()
  })

  it("maps only approved activation and revenue events", () => {
    expect(mapPostHogEvent("activation_selfie_uploaded")).toBe("sselfie_reference_added")
    expect(mapPostHogEvent("suite_image_generated")).toBe("sselfie_generation_completed")
    expect(mapPostHogEvent("suite_edit_applied")).toBe("sselfie_edit_used")
    expect(mapPostHogEvent("suite_image_downloaded")).toBe("sselfie_result_saved")
    expect(mapPostHogEvent("purchase")).toBe("sselfie_purchase_observed")
    expect(mapPostHogEvent("unrelated_internal_event")).toBeNull()
  })

  it("filters PII, authored content, image data, nested values, and query strings", () => {
    expect(
      buildPostHogProperties({
        eventName: "suite_image_generated",
        path: "/suite?email=sandra@example.com#result",
        attribution: {
          source: "email",
          medium: "lifecycle",
          campaign: "first_value_2026",
        },
        properties: {
          provider: "replicate",
          image_count: 2,
          is_first: true,
          email: "sandra@example.com",
          prompt: "customer words",
          image_url: "https://example.com/private.png",
          ip_hint: "127.0.0.1",
          user_agent: "browser",
          source: "sandra@example.com",
          nested: { secret: "value" },
          tags: ["private"],
        },
      })
    ).toEqual({
      source_event: "suite_image_generated",
      $process_person_profile: false,
      path: "/suite",
      utm_source: "email",
      utm_medium: "lifecycle",
      utm_campaign: "first_value_2026",
      provider: "replicate",
      image_count: 2,
      is_first: true,
    })
  })

  it("uses stable scoped identities and the provider request shape", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))

    await expect(
      capturePostHogEvent(
        {
          eventName: "activation_selfie_uploaded",
          userId: "user-123",
          anonId: "ignored",
          path: "/suite?token=private",
          attribution: { source: "instagram", medium: "social", campaign: "suite_launch" },
          properties: { source: "maya", caption: "private" },
        },
        request
      )
    ).resolves.toEqual({ sent: true })

    expect(request).toHaveBeenCalledOnce()
    const [endpoint, init] = request.mock.calls[0]
    expect(String(endpoint)).toBe("https://eu.i.posthog.com/i/v0/e/")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toEqual({
      api_key: "phc_test_project",
      event: "sselfie_reference_added",
      distinct_id: "user:user-123",
      properties: {
        source_event: "activation_selfie_uploaded",
        $process_person_profile: false,
        path: "/suite",
        utm_source: "instagram",
        utm_medium: "social",
        utm_campaign: "suite_launch",
        source: "maya",
      },
    })
  })

  it("fails open when disabled, unmapped, missing an identity, or rejected by PostHog", async () => {
    delete process.env.POSTHOG_PROJECT_KEY
    await expect(
      capturePostHogEvent({ eventName: "suite_image_generated", anonId: "anon-1" })
    ).resolves.toEqual({ sent: false, reason: "disabled" })

    await expect(
      capturePostHogEvent({ eventName: "not_mapped", anonId: "anon-1" })
    ).resolves.toEqual({ sent: false, reason: "unmapped" })

    await expect(capturePostHogEvent({ eventName: "suite_image_generated" })).resolves.toEqual({
      sent: false,
      reason: "anonymous-missing",
    })

    process.env.POSTHOG_PROJECT_KEY = "phc_test_project"
    const rejected = vi.fn<typeof fetch>().mockRejectedValue(new Error("provider unavailable"))
    await expect(
      capturePostHogEvent({ eventName: "suite_image_generated", anonId: "anon-1" }, rejected)
    ).resolves.toEqual({ sent: false, reason: "provider-error" })
  })

  it("keeps browser replay and network capture privacy controls enabled", () => {
    const provider = readFileSync(
      join(process.cwd(), "components/analytics/posthog-provider.tsx"),
      "utf8"
    )

    expect(provider).toContain("mask_all_text:true")
    expect(provider).toContain("mask_all_element_attributes:true")
    expect(provider).toContain("maskAllInputs:true")
    expect(provider).toContain("recordBody:false")
    expect(provider).toContain("recordHeaders:false")
    expect(provider).toContain("capture_exceptions:true")
    expect(provider).toContain("window.location.origin}${pathname}")
    expect(provider).not.toContain("useSearchParams")
  })
})
