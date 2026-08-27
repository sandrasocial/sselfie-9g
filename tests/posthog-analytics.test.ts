import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"

vi.mock("server-only", () => ({}))

import {
  buildPostHogProperties,
  capturePostHogEvent,
  mapPostHogEvent,
} from "@/lib/analytics/posthog"
import {
  normalizePostHogApiHost,
  sanitizePostHogEventPayload,
  sanitizePostHogPathname,
  shouldResetPostHogIdentity,
} from "@/lib/analytics/posthog-browser"

describe("PostHog analytics boundary", () => {
  beforeEach(() => {
    process.env.POSTHOG_PROJECT_KEY = "phc_test_project"
    process.env.POSTHOG_HOST = "https://eu.i.posthog.com"
  })

  afterEach(() => {
    delete process.env.POSTHOG_PROJECT_KEY
    delete process.env.POSTHOG_HOST
    delete process.env.NEXT_PUBLIC_POSTHOG_HOST
    delete process.env.NEXT_PUBLIC_SITE_URL
    vi.restoreAllMocks()
  })

  it("maps only approved activation and revenue events", () => {
    expect(mapPostHogEvent("activation_selfie_uploaded")).toBe("sselfie_reference_added")
    expect(mapPostHogEvent("first_generation_guided_start")).toBe("sselfie_generation_started")
    expect(mapPostHogEvent("suite_image_generated")).toBe("sselfie_generation_completed")
    expect(mapPostHogEvent("suite_edit_applied")).toBe("sselfie_edit_used")
    expect(mapPostHogEvent("suite_image_downloaded")).toBe("sselfie_result_saved")
    expect(mapPostHogEvent("purchase")).toBe("sselfie_purchase_observed")
    for (const eventName of [
      "brand_strategy_pack_checkout_success",
      "campaign_purchase",
      "masterclass_checkout_success",
      "presets_checkout_success",
      "prompt_vault_checkout_success",
      "selfie_ai_photos_kit_checkout_success",
      "selfie_guide_checkout_success",
      "selfie_to_brand_shoot_checkout_success",
      "starter_kit_checkout_success",
      "work_with_me_checkout_success",
    ]) {
      expect(mapPostHogEvent(eventName)).toBe("sselfie_purchase_observed")
    }
    expect(mapPostHogEvent("prompt_vault_payment_completed")).toBeNull()
    expect(mapPostHogEvent("suite_ready_post_saved")).toBe("sselfie_content_completed")
    expect(mapPostHogEvent("suite_maya_job_started")).toBeNull()
    expect(mapPostHogEvent("suite_post_finished")).toBeNull()
    expect(mapPostHogEvent("suite_inline_selfie_uploaded")).toBeNull()
    expect(mapPostHogEvent("first_image_generated")).toBeNull()
    expect(mapPostHogEvent("suite_generation_path_completed")).toBeNull()
    expect(mapPostHogEvent("suite_maya_job_finished")).toBeNull()
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
          campaign: "free_welcome_day0",
        },
        properties: {
          provider: "replicate",
          images: 2,
          mode: "concept",
          rerun: true,
          email: "sandra@example.com",
          prompt: "customer words",
          image_url: "https://example.com/private.png",
          ip_hint: "127.0.0.1",
          user_agent: "browser",
          source: "sandra@example.com",
          product_type: "prompt_vault",
          value: 97,
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
      utm_campaign: "free_welcome_day0",
      provider: "replicate",
      image_count: 2,
      generation_mode: "concept",
      is_rerun: true,
      product: "prompt_vault",
      revenue_value: 97,
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
          attribution: { source: "instagram", medium: "manychat", campaign: "prompt_keyword" },
          properties: { source: "maya_concierge", caption: "private" },
        },
        request
      )
    ).resolves.toEqual({ sent: true })

    expect(request).toHaveBeenCalledOnce()
    const [endpoint, init] = request.mock.calls[0]
    expect(String(endpoint)).toBe("https://eu.i.posthog.com/i/v0/e/")
    expect(init?.method).toBe("POST")
    expect(JSON.parse(String(init?.body))).toMatchObject({
      api_key: "phc_test_project",
      event: "sselfie_reference_added",
      distinct_id: "user:user-123",
      properties: {
        source_event: "activation_selfie_uploaded",
        $process_person_profile: false,
        path: "/suite",
        utm_source: "instagram",
        utm_medium: "manychat",
        utm_campaign: "prompt_keyword",
        source: "maya_concierge",
      },
    })
    expect(JSON.parse(String(init?.body)).properties.$insert_id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f-]{27}$/
    )
  })

  it.each([
    ["/ingest", "https://sselfie.ai/ingest/i/v0/e/"],
    ["https://sselfie.ai/ingest", "https://sselfie.ai/ingest/i/v0/e/"],
  ])("preserves the configured ingestion proxy prefix for %s", async (host, expected) => {
    delete process.env.POSTHOG_HOST
    process.env.NEXT_PUBLIC_POSTHOG_HOST = host
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))

    await expect(
      capturePostHogEvent(
        {
          eventName: "activation_selfie_uploaded",
          anonId: "anonymous-visitor",
        },
        request
      )
    ).resolves.toEqual({ sent: true })

    expect(String(request.mock.calls[0]?.[0])).toBe(expected)
  })

  it.each([
    "https://us.i.posthog.com",
    "https://attacker.example",
    "https://sselfie.ai/not-ingest",
  ])("rejects an unapproved capture host %s", async host => {
    process.env.POSTHOG_HOST = host
    process.env.NEXT_PUBLIC_SITE_URL = "https://sselfie.ai"
    const request = vi.fn<typeof fetch>()

    await expect(
      capturePostHogEvent(
        { eventName: "activation_selfie_uploaded", anonId: "anonymous-visitor" },
        request
      )
    ).resolves.toEqual({ sent: false, reason: "invalid-host" })
    expect(request).not.toHaveBeenCalled()
  })

  it("retries a transient provider failure with the same insert id", async () => {
    const request = vi
      .fn<typeof fetch>()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce(new Response("ok", { status: 200 }))

    await expect(
      capturePostHogEvent(
        { eventName: "suite_image_generated", anonId: "anonymous-visitor" },
        request
      )
    ).resolves.toEqual({ sent: true })

    expect(request).toHaveBeenCalledTimes(2)
    const bodies = request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
    expect(bodies[1].properties.$insert_id).toBe(bodies[0].properties.$insert_id)
  })

  it("uses a stable insert id when a durable caller retries later", () => {
    const first = buildPostHogProperties({
      eventName: "suite_ready_post_saved",
      idempotencyKey: "ready-post:fingerprint",
    })
    const second = buildPostHogProperties({
      eventName: "suite_ready_post_saved",
      idempotencyKey: "ready-post:fingerprint",
    })
    expect(first.$insert_id).toMatch(/^[a-f0-9]{64}$/)
    expect(second.$insert_id).toBe(first.$insert_id)
  })

  it("adds a privacy-safe stable insert id to retried Stripe purchases", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))

    const purchase = {
      eventName: "purchase",
      userId: "user-123",
      properties: {
        source: "stripe_webhook",
        product_type: "sselfie_studio_membership",
        value: 97,
        stripe_payment_id: "pi_retry_safe_123",
      },
    }

    await capturePostHogEvent(purchase, request)
    await capturePostHogEvent(purchase, request)

    const bodies = request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
    expect(bodies[0].properties.$insert_id).toMatch(/^[a-f0-9]{64}$/)
    expect(bodies[1].properties.$insert_id).toBe(bodies[0].properties.$insert_id)
    expect(JSON.stringify(bodies[0])).not.toContain("pi_retry_safe_123")
  })

  it("normalizes durable product checkouts and caller attribution as purchases", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))

    await capturePostHogEvent(
      {
        eventName: "prompt_vault_checkout_success",
        userId: "user-123",
        properties: {
          product_type: "prompt_vault",
          value: 49,
          stripe_session_id: "cs_prompt_vault_123",
          utm_source: "email",
          utm_medium: "lifecycle",
          utm_campaign: "prompt_vault_launch",
        },
      },
      request
    )

    const body = JSON.parse(String(request.mock.calls[0][1]?.body))
    expect(body.event).toBe("sselfie_purchase_observed")
    expect(body.properties).toMatchObject({
      product: "prompt_vault",
      revenue_value: 49,
      utm_source: "email",
      utm_medium: "lifecycle",
      utm_campaign: "prompt_vault_launch",
    })
    expect(body.properties.$insert_id).toMatch(/^[a-f0-9]{64}$/)
    expect(JSON.stringify(body)).not.toContain("cs_prompt_vault_123")
  })

  it("uses a stable privacy-safe purchase identity for guest checkout retries", async () => {
    const request = vi.fn<typeof fetch>().mockResolvedValue(new Response("ok", { status: 200 }))
    const input = {
      eventName: "prompt_vault_checkout_success",
      userId: "null",
      properties: {
        product_type: "prompt_vault",
        value: 49,
        stripe_session_id: "cs_guest_purchase_123",
      },
    }

    await capturePostHogEvent(input, request)
    await capturePostHogEvent(input, request)

    const bodies = request.mock.calls.map(([, init]) => JSON.parse(String(init?.body)))
    expect(bodies[0].distinct_id).toMatch(/^purchase:[a-f0-9]{64}$/)
    expect(bodies[1].distinct_id).toBe(bodies[0].distinct_id)
    expect(bodies[0].properties).not.toHaveProperty("distinct_id")
    expect(JSON.stringify(bodies[0])).not.toContain("cs_guest_purchase_123")
  })

  it("normalizes campaign cents and presets emitter revenue", () => {
    expect(
      buildPostHogProperties({
        eventName: "campaign_purchase",
        properties: {
          amount_cents: 9700,
          stripe_session_id: "cs_campaign_123",
        },
      })
    ).toMatchObject({
      product: "campaign_outcome",
      revenue_value: 97,
    })

    const presetsHandler = readFileSync(
      join(process.cwd(), "lib/payments/handlers/presets.ts"),
      "utf8"
    )
    expect(presetsHandler).toContain("amountCents: paymentAmountCents")
    expect(presetsHandler).toContain('currency: typeof session.currency === "string"')
  })

  it("suppresses Stripe test-mode purchases before provider delivery", async () => {
    const request = vi.fn<typeof fetch>()

    for (const eventName of ["purchase", "starter_kit_checkout_success"]) {
      await expect(
        capturePostHogEvent(
          {
            eventName,
            userId: "user-123",
            properties: {
              value: 97,
              stripe_payment_id: "pi_test_123",
              is_test_mode: true,
            },
          },
          request
        )
      ).resolves.toEqual({ sent: false, reason: "test-event" })
    }
    expect(request).not.toHaveBeenCalled()
  })

  it("drops unapproved attribution and event-source slugs", () => {
    expect(
      buildPostHogProperties({
        eventName: "purchase",
        attribution: {
          source: "recipient_sandra_123",
          medium: "private_segment_456",
          campaign: "customer_789",
        },
        properties: { source: "recipient_sandra_123" },
      })
    ).toEqual({
      source_event: "purchase",
      $process_person_profile: false,
    })
  })

  it("keeps every live attribution literal identified by the funnel audit", () => {
    const properties = buildPostHogProperties({
      eventName: "purchase",
      attribution: {
        source: "presets_landing",
        medium: "checkout_recovery",
        campaign: "starter_kit_checkout_recovery",
      },
      properties: { source: "app-v3-generate-stream" },
    })
    expect(properties).toMatchObject({
      utm_source: "presets_landing",
      utm_medium: "checkout_recovery",
      utm_campaign: "starter_kit_checkout_recovery",
      source: "app-v3-generate-stream",
    })

    for (const medium of ["guide", "newsletter", "nurture", "site"]) {
      expect(
        buildPostHogProperties({ eventName: "purchase", attribution: { medium } }).utm_medium
      ).toBe(medium)
    }
    for (const campaign of [
      "ai_prompts_day7",
      "current_free_prompt",
      "freebie_guide_day8_starter_kit_direct",
      "prompt_vault_checkout_recovery",
      "vault_collection_drop",
    ]) {
      expect(
        buildPostHogProperties({ eventName: "purchase", attribution: { campaign } }).utm_campaign
      ).toBe(campaign)
    }
    for (const source of ["concept-card", "lightbox"]) {
      expect(buildPostHogProperties({ eventName: "purchase", properties: { source } }).source).toBe(
        source
      )
    }
  })

  it("allows only the EU API origin or same-origin proxy path in the browser SDK", () => {
    expect(normalizePostHogApiHost("https://eu.i.posthog.com/")).toBe("https://eu.i.posthog.com")
    expect(normalizePostHogApiHost("/ingest/")).toBe("/ingest")
    expect(normalizePostHogApiHost("https://us.i.posthog.com")).toBeNull()
    expect(normalizePostHogApiHost("https://attacker.example")).toBeNull()
  })

  it("keeps only allowlisted browser attribution properties", () => {
    expect(
      sanitizePostHogEventPayload({
        event: "$pageview",
        properties: {
          utm_source: " EMAIL ",
          utm_medium: "private-segment",
          utm_campaign: "vault_collection_drop",
        },
      })
    ).toEqual({
      event: "$pageview",
      properties: {
        utm_source: "email",
        utm_campaign: "vault_collection_drop",
      },
    })
  })

  it.each([
    "landing_page",
    "brand_strategy_paid",
    "work_with_me_paid",
    "selfie_guide_access",
    "selfie_guide_bundle",
    "selfie_guide_order_bump",
    "prompt_vault_paid",
  ])("keeps the known checkout source %s", source => {
    expect(
      buildPostHogProperties({
        eventName: "purchase",
        properties: { source, stripe_payment_id: "pi_source_test" },
      }).source
    ).toBe(source)
  })

  it("normalizes emitted generation failure reasons", () => {
    expect(
      buildPostHogProperties({
        eventName: "suite_generation_failed",
        properties: { reason: "content_policy" },
      })
    ).toMatchObject({ error_code: "content_policy" })
  })

  it("redacts access tokens from browser page paths", () => {
    expect(sanitizePostHogPathname("/claim/secret-token")).toBe("/claim/[token]")
    expect(sanitizePostHogPathname("/access/prompt-vault/token123/details")).toBe(
      "/access/prompt-vault/[token]/details"
    )
    expect(sanitizePostHogPathname("/selfie-guide/access/private?email=private")).toBe(
      "/selfie-guide/access/[token]"
    )
    expect(sanitizePostHogPathname("/app")).toBe("/app")
    expect(sanitizePostHogPathname("/maya/asset/customer-specific-id")).toBe("/maya/asset/[id]")
    expect(sanitizePostHogPathname("/api/maya/generated-assets/customer-specific-id/html")).toBe(
      "/api/maya/generated-assets/[id]/html"
    )
    expect(
      buildPostHogProperties({
        eventName: "trial_claimed",
        path: "/claim/server-secret?email=private",
      }).path
    ).toBe("/claim/[token]")
  })

  it("redacts access tokens from every browser event payload", () => {
    expect(
      sanitizePostHogEventPayload({
        event: "$autocapture",
        properties: {
          $current_url:
            "https://preview.test/claim/secret-token?vault_token=private&email=private@example.com",
          $pathname: "/claim/secret-token",
          $snapshot_data: {
            href: "https://preview.test/checkout/membership?session_id=cs_private&freebie_token=private",
          },
        },
      })
    ).toEqual({
      event: "$autocapture",
      properties: {
        $current_url: "https://preview.test/claim/[token]",
        $pathname: "/claim/[token]",
        $snapshot_data: {
          href: "https://preview.test/checkout/membership",
        },
      },
    })
  })

  it("strips reserved exception metadata from browser custom events", () => {
    expect(
      sanitizePostHogEventPayload({
        event: "customer_custom_event",
        properties: {
          safe_dimension: "gallery",
          $exception_list: [{ value: "untrusted" }],
          $exception_message: "untrusted",
          $exception_type: "untrusted",
          $exception_source: "untrusted",
        },
      })
    ).toEqual({
      event: "customer_custom_event",
      properties: { safe_dimension: "gallery" },
    })
  })

  it("keeps only safe exception grouping dimensions for real browser exceptions", () => {
    expect(
      sanitizePostHogEventPayload({
        event: "$exception",
        properties: {
          $exception_message: "private customer value",
          $exception_list: [
            {
              type: "TypeError",
              value: "private customer value",
              mechanism: { type: "web.react", handled: true },
              stacktrace: { frames: [{ filename: "/private/customer/path" }] },
            },
          ],
          stack: "private stack",
          safe_dimension: "gallery",
        },
      })
    ).toEqual({
      event: "$exception",
      properties: {
        $exception_type: "TypeError",
        $exception_source: "web.react",
        safe_dimension: "gallery",
      },
    })

    expect(
      sanitizePostHogEventPayload({
        event: "$exception",
        properties: {
          $exception_list: [
            {
              type: "TypeError customer@example.com",
              mechanism: {
                type: "https://private.example/?email=customer@example.com",
              },
            },
          ],
        },
      })
    ).toEqual({ event: "$exception", properties: {} })
  })

  it("resets only when a persisted user differs from the server identity", () => {
    expect(shouldResetPostHogIdentity("user:account-a", "user:account-b")).toBe(true)
    expect(shouldResetPostHogIdentity("user:account-a", "user:account-a")).toBe(false)
    expect(shouldResetPostHogIdentity("anon:browser-a", "user:account-a")).toBe(false)
    expect(shouldResetPostHogIdentity(null, "user:account-a")).toBe(false)
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
    expect(provider).toContain("capture_exceptions: enabled")
    expect(provider).toContain("autocapture:false")
    expect(provider).toContain("capture_exceptions:false")
    expect(provider).toContain("disable_session_recording:true")
    expect(provider).toContain("function scrub(value)")
    expect(provider).toContain('event.event==="$exception"')
    expect(provider).toContain('event.event!=="$exception"')
    expect(provider).toContain("/^\\\\$exception_/i.test(key)")
    expect(provider).toContain("function exceptionDimension(value)")
    expect(provider).toContain("var list=Array.isArray(event.properties.$exception_list)")
    expect(provider).toContain("first&&first.type")
    expect(provider).toContain("mechanism&&mechanism.type")
    expect(provider).toContain("/exception|error|message|stack/i.test(key)")
    expect(provider).toContain("delete event.properties[key]")
    expect(provider).toContain('event.event==="$autocapture"')
    expect(provider).toContain("/text|element|attr/i.test(key)")
    expect(provider).toContain('new URL(clean,"https://sselfie.invalid")')
    expect(provider).toContain("window.posthog.identify(distinctId)")
    expect(provider).toContain("get_distinct_id?.()")
    expect(provider).toContain("shouldResetPostHogIdentity")
    expect(provider).toContain("window.posthog.reset()")
    expect(provider).toContain("identity.resetPostHog")
    expect(provider).toContain("await acknowledgePostHogReset()")
    expect(provider).toContain("ensureAnalyticsBrowserIdentity")
    expect(provider).toContain("readIdentity(true)")
    expect(provider).toContain("setPostHogCaptureEnabled(false)")
    expect(provider).toContain("setPostHogCaptureEnabled(true)")
    expect(provider).toContain("const refreshIdentity = async (")
    expect(provider).toContain("scheduleIdentityRetry(attempt, generation, capturePageview)")
    expect(provider).toContain(
      "() => void refreshIdentity(attempt + 1, generation, capturePageview)"
    )
    expect(provider).toContain("identifiedAs.current !== null || attempt > 0")
    expect(provider).toContain("if (retryTimer) clearTimeout(retryTimer)")
    expect(provider).toContain('window.addEventListener("focus", refreshOnFocus)')
    expect(provider).toContain("subscribeToAnalyticsLogout")
    expect(provider).toContain("invalidateAnalyticsBrowserIdentity()")
    expect(provider).toContain("identityGenerationRef.current += 1")
    expect(provider).toContain("generation !== identityGenerationRef.current")
    expect(provider).toContain("providerGeneration === identityGenerationRef.current")
    expect(provider).toContain("if (!isCurrentGeneration()) return")
    expect(provider).toContain('document.addEventListener("visibilitychange", refreshOnVisibility)')
    expect(provider).toContain("supabase.auth.onAuthStateChange")
    expect(provider).toContain('event === "SIGNED_OUT"')
    expect(provider).toContain('window.removeEventListener("focus", refreshOnFocus)')
    expect(provider).toContain(
      'document.removeEventListener("visibilitychange", refreshOnVisibility)'
    )
    expect(provider).toContain("unsubscribeFromAuth?.()")
    const scriptIndex = provider.indexOf('<Script id="posthog"')
    const bootstrapIndex = provider.indexOf("void bootstrapIdentity(0)")
    const logoutSubscriptionIndex = provider.indexOf("() =>\n      subscribeToAnalyticsLogout")
    expect(logoutSubscriptionIndex).toBeGreaterThan(-1)
    expect(logoutSubscriptionIndex).toBeLessThan(bootstrapIndex)
    expect(bootstrapIndex).toBeLessThan(scriptIndex)
    expect(provider).toContain("IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS")
    expect(provider).toContain("identityRetryDelay(attempt + 1)")
    expect(provider).toContain("else setPostHogCaptureEnabled(false)")
    expect(provider).toContain("window.__sselfiePostHogLoadedClient = client")
    expect(provider).not.toContain("if (window.posthog) void initializeLoadedClient")
    expect(provider).toContain("normalizePostHogApiHost(apiHost)")
    expect(provider).toContain("setTimeout(() => void bootstrapIdentity(attempt + 1)")
    expect(provider).toContain(
      "loaded:function(ph){if(window.__sselfiePostHogLoaded)window.__sselfiePostHogLoaded(ph)}"
    )
    expect(provider).not.toContain("onReady=")
    const loadedCallbackIndex = provider.indexOf("const onLoaded = async")
    const resetIndex = provider.indexOf("client.reset()", loadedCallbackIndex)
    const acknowledgeIndex = provider.indexOf("await acknowledgePostHogReset()", resetIndex)
    const captureEnabledIndex = provider.indexOf(
      "setPostHogCaptureEnabled(true, client)",
      loadedCallbackIndex
    )
    expect(resetIndex).toBeGreaterThan(loadedCallbackIndex)
    expect(resetIndex).toBeLessThan(acknowledgeIndex)
    expect(acknowledgeIndex).toBeLessThan(captureEnabledIndex)
    expect(provider.indexOf("setLoadedCallbackReady(true)")).toBeLessThan(scriptIndex)
    expect(provider).toContain("if (window.__sselfiePostHogLoadedClient)")
    expect(provider).toContain("}, [pathname, ready, identityGenerationRef])")
    expect(provider).toContain(
      "<PostHogPageviews ready={ready} identityGenerationRef={identityGenerationRef} />"
    )
    expect(provider).toContain("window.location.origin}${safePathname}")
    expect(provider).not.toContain("useSearchParams")

    const analyticsClient = readFileSync(join(process.cwd(), "lib/analytics/client.ts"), "utf8")
    expect(analyticsClient).toContain("rotate_anonymous=1")
    expect(analyticsClient).toContain('method: "POST"')
    expect(analyticsClient).toContain('"x-sselfie-posthog-reset-ack": "1"')
    expect(analyticsClient).toContain("await ensureAnalyticsBrowserIdentity()")

    const middleware = readFileSync(join(process.cwd(), "middleware.ts"), "utf8")
    expect(middleware).toContain("https://eu-assets.i.posthog.com")
    expect(middleware).toContain("https://eu.i.posthog.com")
  })

  it("records presets purchase analytics immediately after the durable payment write", () => {
    const handler = readFileSync(join(process.cwd(), "lib/payments/handlers/presets.ts"), "utf8")
    const paymentRecorded = handler.indexOf("paymentRecorded = true")
    const purchaseEvent = handler.indexOf('eventName: "presets_checkout_success"')
    const collectionLookup = handler.indexOf("await getDefaultPresetCollection()")
    const accessCreation = handler.indexOf("await upsertPresetOrderForPurchase")
    const delivery = handler.indexOf("await sendEmail")

    expect(paymentRecorded).toBeGreaterThan(handler.indexOf("INSERT INTO stripe_payments"))
    expect(purchaseEvent).toBeGreaterThan(paymentRecorded)
    expect(purchaseEvent).toBeLessThan(collectionLookup)
    expect(purchaseEvent).toBeLessThan(accessCreation)
    expect(purchaseEvent).toBeLessThan(delivery)
    expect(handler).toContain("if (paymentRecorded)")
    expect(handler.slice(paymentRecorded, purchaseEvent)).toContain("schedulePurchaseObservation({")
    expect(handler.slice(purchaseEvent, collectionLookup)).toContain(
      "checkoutMetadata: session.metadata"
    )
    expect(handler).toContain("checkout_session_id: session.id")
  })

  it.each([
    ["prompt-vault.ts", "prompt_vault_checkout_success"],
    ["starter-kit.ts", "starter_kit_checkout_success"],
    ["masterclass.ts", "masterclass_checkout_success"],
    ["brand-strategy-pack.ts", "brand_strategy_pack_checkout_success"],
    ["selfie-guide.ts", "selfie_guide_checkout_success"],
    ["selfie-ai-photos-kit.ts", "selfie_ai_photos_kit_checkout_success"],
    ["selfie-to-brand-shoot.ts", "selfie_to_brand_shoot_checkout_success"],
  ])("records %s purchase analytics before fallible fulfillment", (file, eventName) => {
    const handler = readFileSync(join(process.cwd(), "lib/payments/handlers", file), "utf8")
    const paymentRecorded = handler.indexOf("paymentRecorded = true")
    const purchaseEvent = handler.indexOf(`eventName: "${eventName}"`)
    const subscriptionWrite = handler.indexOf("INSERT INTO subscriptions")
    const entitlementWrite = handler.indexOf("await upsertPurchaseEntitlement")
    const delivery = handler.indexOf("await sendEmail")

    expect(paymentRecorded).toBeGreaterThan(handler.indexOf("INSERT INTO stripe_payments"))
    expect(purchaseEvent).toBeGreaterThan(paymentRecorded)
    for (const fulfillmentStep of [subscriptionWrite, entitlementWrite, delivery]) {
      if (fulfillmentStep >= 0) expect(purchaseEvent).toBeLessThan(fulfillmentStep)
    }
    expect(handler).toContain("if (paymentRecorded)")
    expect(handler.slice(paymentRecorded, purchaseEvent)).toContain("schedulePurchaseObservation({")
    expect(handler.slice(purchaseEvent, purchaseEvent + 700)).toContain(
      "checkoutMetadata: session.metadata"
    )
    expect(handler.match(new RegExp(`eventName: \\"${eventName}\\"`, "g"))).toHaveLength(1)
  })

  it("keeps the shared purchase observation detached and provider-safe", () => {
    const helper = readFileSync(
      join(process.cwd(), "lib/payments/handlers/purchase-analytics.ts"),
      "utf8"
    )

    expect(helper).toContain("void logAnalyticsEvent({")
    expect(helper).toContain("stripe_session_id: input.sessionId")
    expect(helper).toContain("stripe_payment_id: input.paymentId")
    expect(helper).toContain("is_test_mode: input.isTestMode")
    expect(helper).toContain("idempotencyKey: `purchase:${input.paymentId || input.sessionId}`")
    expect(helper).toContain("source: input.checkoutMetadata?.utm_source ?? null")
    expect(helper).toContain("medium: input.checkoutMetadata?.utm_medium ?? null")
    expect(helper).toContain("campaign: input.checkoutMetadata?.utm_campaign ?? null")
    expect(helper).toContain("content: input.checkoutMetadata?.utm_content ?? null")
    expect(helper).toContain("term: input.checkoutMetadata?.utm_term ?? null")
    expect(helper).not.toContain("await logAnalyticsEvent({")

    const events = readFileSync(join(process.cwd(), "lib/analytics/events.ts"), "utf8")
    const schema = readFileSync(join(process.cwd(), "lib/analytics/schema.ts"), "utf8")
    expect(events).toContain("ON CONFLICT (idempotency_key)")
    expect(events).toContain('createHash("sha256")')
    expect(schema).toContain("analytics_events_idempotency_key_unique")
  })

  it("forwards attribution and stable keys from direct purchase emitters", () => {
    const campaign = readFileSync(
      join(process.cwd(), "lib/payments/handlers/campaign-outcome.ts"),
      "utf8"
    )
    const invoice = readFileSync(
      join(process.cwd(), "lib/payments/lifecycle/invoice-paid.ts"),
      "utf8"
    )

    expect(campaign).toContain("source: ctx.session.metadata?.utm_source || null")
    expect(campaign).toContain("idempotencyKey: `purchase:${stripeObjectId")
    expect(invoice).toContain("source: checkoutAttribution?.utm_source || null")
    expect(invoice).toContain("idempotencyKey: `purchase:${paymentId}`")
  })

  it("records the Selfie Guide brand-strategy add-on after its durable payment write", () => {
    const handler = readFileSync(
      join(process.cwd(), "lib/payments/handlers/selfie-guide.ts"),
      "utf8"
    )
    const paymentRecorded = handler.indexOf("brandStrategyPaymentRecorded = true")
    const purchaseEvent = handler.indexOf('eventName: "brand_strategy_pack_checkout_success"')
    const subscriptionWrite = handler.indexOf("INSERT INTO subscriptions", purchaseEvent)
    const entitlementWrite = handler.indexOf("await upsertPurchaseEntitlement", purchaseEvent)
    const delivery = handler.indexOf("await sendEmail", purchaseEvent)

    expect(paymentRecorded).toBeGreaterThan(handler.indexOf("INSERT INTO stripe_payments"))
    expect(purchaseEvent).toBeGreaterThan(paymentRecorded)
    expect(handler.slice(paymentRecorded, purchaseEvent)).toContain("schedulePurchaseObservation({")
    expect(handler.slice(purchaseEvent, purchaseEvent + 700)).toContain(
      "checkoutMetadata: session.metadata"
    )
    expect(purchaseEvent).toBeLessThan(subscriptionWrite)
    expect(purchaseEvent).toBeLessThan(entitlementWrite)
    expect(purchaseEvent).toBeLessThan(delivery)
  })

  it("records Work With Me purchase analytics at the central ledger boundary", () => {
    const handler = readFileSync(
      join(process.cwd(), "lib/payments/handlers/work-with-me.ts"),
      "utf8"
    )
    expect(handler).not.toContain('eventName: "work_with_me_checkout_success"')

    const lifecycle = readFileSync(
      join(process.cwd(), "lib/payments/lifecycle/checkout-session-completed.ts"),
      "utf8"
    )
    const ledgerWrite = lifecycle.indexOf(
      "const revenueRecord = await recordCheckoutSessionRevenue"
    )
    const purchaseEvent = lifecycle.indexOf('"work_with_me_checkout_success"')
    const accountSetup = lifecycle.indexOf("Creating new account for landing page purchase")
    const handlerDispatch = lifecycle.indexOf("await handleWorkWithMeCheckout")

    expect(purchaseEvent).toBeGreaterThan(ledgerWrite)
    expect(purchaseEvent).toBeLessThan(accountSetup)
    expect(purchaseEvent).toBeLessThan(handlerDispatch)
    expect(lifecycle).toContain("centralPurchaseEvent && productType && isPaymentPaid")
    expect(lifecycle).toContain("revenueRecord.recorded")
    expect(lifecycle.match(/"work_with_me_checkout_success"/g)).toHaveLength(1)
  })

  it("observes central-ledger one-time products before account and fulfillment work", () => {
    const lifecycle = readFileSync(
      join(process.cwd(), "lib/payments/lifecycle/checkout-session-completed.ts"),
      "utf8"
    )
    const ledgerWrite = lifecycle.indexOf(
      "const revenueRecord = await recordCheckoutSessionRevenue"
    )
    const purchaseSchedule = lifecycle.indexOf("schedulePurchaseObservation({", ledgerWrite)
    const accountSetup = lifecycle.indexOf("Creating new account for landing page purchase")
    const academyDispatch = lifecycle.indexOf("await handleAcademyProductCheckout")
    const bundleDispatch = lifecycle.indexOf("await handleSelfieVisibilityBundleCheckout")

    for (const productType of [
      "selfie_visibility_bundle",
      "visibility_suite",
      "academy_mini_product",
    ]) {
      expect(lifecycle).toContain(`  "${productType}",`)
    }
    expect(lifecycle).toContain('? "purchase"')
    expect(lifecycle).toContain("Object.hasOwn(ACADEMY_PRODUCTS, session.metadata.product_id)")
    expect(lifecycle).toContain("productType: observedProductType")
    expect(lifecycle.slice(purchaseSchedule, accountSetup)).toContain(
      "checkoutMetadata: session.metadata"
    )
    expect(purchaseSchedule).toBeGreaterThan(ledgerWrite)
    expect(purchaseSchedule).toBeLessThan(accountSetup)
    expect(purchaseSchedule).toBeLessThan(academyDispatch)
    expect(purchaseSchedule).toBeLessThan(bundleDispatch)
  })

  it("records the membership checkout start only on checkout-page arrival", () => {
    const landing = readFileSync(
      join(process.cwd(), "components/sselfie/landing-page-new.tsx"),
      "utf8"
    )
    const checkout = readFileSync(join(process.cwd(), "app/checkout/page.tsx"), "utf8")

    expect(landing).not.toContain("trackCheckoutStart(")
    expect(checkout).toContain("trackCheckoutStart(productType")
  })

  it("emits guided completion only after receiving a real image URL", () => {
    const flow = readFileSync(
      join(process.cwd(), "components/sselfie/maya/welcome-first-generation-flow.tsx"),
      "utf8"
    )
    const missingResultGuard = flow.indexOf("if (!imageUrl) throw")
    const completionEvent = flow.indexOf('trackEvent("first_generation_guided_complete"')

    expect(flow).toContain(
      "const imageUrl = firstGeneratedImageUrl(check?.imageUrl ?? check?.output)"
    )
    expect(missingResultGuard).toBeGreaterThan(-1)
    expect(completionEvent).toBeGreaterThan(missingResultGuard)
  })

  it("emits guided generation start only after a valid generate action", () => {
    const flow = readFileSync(
      join(process.cwd(), "components/sselfie/maya/welcome-first-generation-flow.tsx"),
      "utf8"
    )
    const generateHandler = flow.indexOf("const handleGenerate = async () =>")
    const missingSelfieGuard = flow.indexOf(
      'if (selectedMode === "pro" && !selfieFile) return',
      generateHandler
    )
    const startEvent = flow.indexOf('trackEvent("first_generation_guided_start"', generateHandler)

    expect(generateHandler).toBeGreaterThan(-1)
    expect(startEvent).toBeGreaterThan(missingSelfieGuard)
    expect(flow.slice(0, generateHandler)).not.toContain(
      'trackEvent("first_generation_guided_start"'
    )
  })
})
