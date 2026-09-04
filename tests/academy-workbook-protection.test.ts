// @vitest-environment node

import { createHash } from "node:crypto"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"

import { beforeEach, describe, expect, it, vi } from "vitest"

const requireAcademyProductAccessMock = vi.fn()

vi.mock("server-only", () => ({}))
vi.mock("@/lib/academy-server-access", () => ({
  requireAcademyProductAccess: requireAcademyProductAccessMock,
}))

type WorkbookId = "what_to_say" | "show_up" | "get_paid"

const WORKBOOKS: Array<{
  id: WorkbookId
  path: string
  privateSource: string
  sha256: string
  marker: string
}> = [
  {
    id: "what_to_say",
    path: "/academy/what_to_say",
    privateSource: "server/academy-workbooks/what_to_say/index.html",
    sha256: "4c33ac88ef72768bf0cb550c376963bddf02c3e97e5f34f8c661673bfd74c1bc",
    marker: "const MAYA_PRODUCT_ID = 'what_to_say'",
  },
  {
    id: "show_up",
    path: "/academy/show_up",
    privateSource: "server/academy-workbooks/show_up/index.html",
    sha256: "ae8907f3157f491d8be6eeb72a049d656cd6fa1fecf3ef596d7520a38e1fa91f",
    marker: "const MAYA_PRODUCT_ID = 'show_up'",
  },
  {
    id: "get_paid",
    path: "/academy/get_paid",
    privateSource: "server/academy-workbooks/get_paid/index.html",
    sha256: "63ec48f93345ced33172efe666678daceb7ec36e0a7d49c57209b98996e37e32",
    marker: "const MAYA_PRODUCT_ID = 'get_paid'",
  },
]

function academyError(status: number, body: Record<string, unknown>) {
  return Object.assign(new Error(String(body.error || "Academy error")), { status, body })
}

async function loadRoute(id: WorkbookId) {
  if (id === "what_to_say") return import("@/app/academy/what_to_say/route")
  if (id === "show_up") return import("@/app/academy/show_up/route")
  return import("@/app/academy/get_paid/route")
}

function requestFor(pathname: string, init?: RequestInit) {
  return new Request(`https://sselfie.ai${pathname}`, init)
}

const REQUIRED_HEADERS: Record<string, string> = {
  "cache-control": "private, no-store, max-age=0, must-revalidate",
  "vercel-cdn-cache-control": "no-store",
  "cdn-cache-control": "no-store",
  pragma: "no-cache",
  vary: "Cookie",
  "x-robots-tag": "noindex,nofollow,noarchive",
  "x-content-type-options": "nosniff",
  "x-frame-options": "SAMEORIGIN",
  "referrer-policy": "same-origin",
  "cross-origin-resource-policy": "same-origin",
}

function expectSecurityHeaders(response: Response) {
  for (const [name, value] of Object.entries(REQUIRED_HEADERS)) {
    expect(response.headers.get(name), name).toBe(value)
  }
  expect(response.headers.get("access-control-allow-origin")).toBeNull()
  const csp = response.headers.get("content-security-policy") || ""
  expect(csp).toContain("script-src 'self' 'unsafe-inline'")
  expect(csp).toContain("style-src 'self' 'unsafe-inline' https://fonts.googleapis.com")
  expect(csp).toContain("font-src https://fonts.gstatic.com")
  expect(csp).toContain("connect-src 'self'")
  expect(csp).toContain("object-src 'none'")
  expect(csp).toContain("base-uri 'none'")
  expect(csp).toContain("frame-ancestors 'self'")
}

describe("protected Academy workbook routes", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    requireAcademyProductAccessMock.mockReset()
    requireAcademyProductAccessMock.mockResolvedValue({})
  })

  it.each(WORKBOOKS)("serves the owned $id workbook from its existing path", async workbook => {
    const route = await loadRoute(workbook.id)
    const response = await route.GET(requestFor(workbook.path))

    expect(requireAcademyProductAccessMock).toHaveBeenCalledWith(workbook.id)
    expect(response.status).toBe(200)
    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
    expect(await response.text()).toContain(workbook.marker)
    expectSecurityHeaders(response)
  })

  it.each(WORKBOOKS)(
    "redirects anonymous $id requests to login with exact returnTo",
    async workbook => {
      const route = await loadRoute(workbook.id)
      const variants = [
        workbook.path,
        `${workbook.path}?from=email`,
        `${workbook.path}?_rsc=test`,
        `${workbook.path}?prefetch=1`,
      ]

      for (const pathname of variants) {
        requireAcademyProductAccessMock.mockRejectedValueOnce(
          academyError(401, { error: "Unauthorized", hasAccess: false })
        )
        const response = await route.GET(
          requestFor(pathname, {
            headers: pathname.includes("_rsc")
              ? { RSC: "1" }
              : pathname.includes("prefetch")
                ? { "Next-Router-Prefetch": "1" }
                : undefined,
          })
        )

        expect(response.status).toBe(307)
        const requestedSearch = new URL(`https://sselfie.ai${pathname}`).search
        expect(response.headers.get("location")).toBe(
          `https://sselfie.ai/auth/login?returnTo=${encodeURIComponent(`${workbook.path}${requestedSearch}`)}`
        )
        expectSecurityHeaders(response)
      }
    }
  )

  it.each(WORKBOOKS)("authorizes HEAD for $id but never returns a body", async workbook => {
    const route = await loadRoute(workbook.id)
    const response = await route.HEAD(requestFor(workbook.path, { method: "HEAD" }))

    expect(response.status).toBe(200)
    expect(await response.text()).toBe("")
    expectSecurityHeaders(response)
  })

  it.each(WORKBOOKS)("keeps anonymous HEAD for $id bodyless", async workbook => {
    requireAcademyProductAccessMock.mockRejectedValueOnce(
      academyError(401, { error: "Unauthorized", hasAccess: false })
    )
    const route = await loadRoute(workbook.id)
    const response = await route.HEAD(requestFor(workbook.path, { method: "HEAD" }))

    expect(response.status).toBe(307)
    expect(await response.text()).toBe("")
    expectSecurityHeaders(response)
  })

  it.each(WORKBOOKS)(
    "returns the existing 403 body for unowned $id without HTML",
    async workbook => {
      requireAcademyProductAccessMock.mockRejectedValueOnce(
        academyError(403, {
          error: "Academy product access required",
          hasAccess: false,
          requiredProductId: workbook.id,
        })
      )
      const route = await loadRoute(workbook.id)
      const response = await route.GET(requestFor(workbook.path))

      expect(response.status).toBe(403)
      expect(await response.json()).toEqual({
        error: "Academy product access required",
        hasAccess: false,
        requiredProductId: workbook.id,
      })
      expectSecurityHeaders(response)
    }
  )

  it("never leaks one purchased workbook into another route", async () => {
    requireAcademyProductAccessMock.mockImplementation(async (id: WorkbookId) => {
      if (id === "what_to_say") return {}
      throw academyError(403, {
        error: "Academy product access required",
        hasAccess: false,
        requiredProductId: id,
      })
    })

    const owned = await (await loadRoute("what_to_say")).GET(requestFor("/academy/what_to_say"))
    const unowned = await (await loadRoute("show_up")).GET(requestFor("/academy/show_up"))

    expect(owned.status).toBe(200)
    expect(unowned.status).toBe(403)
    expect(await unowned.text()).not.toContain("const MAYA_PRODUCT_ID")
  })

  it("allows visibility-suite or membership access exactly when the canonical resolver allows it", async () => {
    requireAcademyProductAccessMock.mockResolvedValue({ accessSource: "membership_or_suite" })

    for (const workbook of WORKBOOKS) {
      const route = await loadRoute(workbook.id)
      expect((await route.GET(requestFor(workbook.path))).status).toBe(200)
    }
  })

  it.each(WORKBOOKS)("fails closed on unexpected auth or DB failure for $id", async workbook => {
    requireAcademyProductAccessMock.mockRejectedValueOnce(new Error("database unavailable"))
    const route = await loadRoute(workbook.id)
    const response = await route.GET(requestFor(workbook.path))

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Workbook unavailable" })
    expectSecurityHeaders(response)
  })

  it("fails closed without HTML when a traced private file is unavailable", async () => {
    const { respondWithProtectedAcademyWorkbook } = await import("@/lib/academy-workbook-response")
    const response = await respondWithProtectedAcademyWorkbook({
      request: requestFor("/academy/what_to_say"),
      productId: "what_to_say",
      canonicalPath: "/academy/what_to_say",
      readWorkbook: async () => {
        throw new Error("missing traced file")
      },
    })

    expect(response.status).toBe(500)
    expect(await response.json()).toEqual({ error: "Workbook unavailable" })
    expectSecurityHeaders(response)
  })

  it("keeps denied and unexpected-failure HEAD responses bodyless", async () => {
    const route = await loadRoute("get_paid")
    requireAcademyProductAccessMock.mockRejectedValueOnce(
      academyError(403, {
        error: "Academy product access required",
        hasAccess: false,
        requiredProductId: "get_paid",
      })
    )
    const denied = await route.HEAD(requestFor("/academy/get_paid", { method: "HEAD" }))

    requireAcademyProductAccessMock.mockRejectedValueOnce(new Error("database unavailable"))
    const failed = await route.HEAD(requestFor("/academy/get_paid", { method: "HEAD" }))

    expect(denied.status).toBe(403)
    expect(await denied.text()).toBe("")
    expect(failed.status).toBe(500)
    expect(await failed.text()).toBe("")
    expectSecurityHeaders(denied)
    expectSecurityHeaders(failed)
  })
})

describe("Academy workbook private assets and routing contracts", () => {
  it.each(WORKBOOKS)("moves $id byte-for-byte out of public", workbook => {
    const privatePath = path.join(process.cwd(), workbook.privateSource)
    const publicPath = path.join(process.cwd(), "public", "academy", workbook.id, "index.html")

    expect(existsSync(privatePath)).toBe(true)
    expect(existsSync(publicPath)).toBe(false)
    expect(createHash("sha256").update(readFileSync(privatePath)).digest("hex")).toBe(
      workbook.sha256
    )
  })

  it("keeps explicit routes beside existing Academy static siblings and avoids a broad dynamic route", () => {
    for (const workbook of WORKBOOKS) {
      expect(existsSync(path.join(process.cwd(), "app", "academy", workbook.id, "route.ts"))).toBe(
        true
      )
    }
    expect(existsSync(path.join(process.cwd(), "app", "academy", "[workbookId]"))).toBe(false)
    expect(
      existsSync(path.join(process.cwd(), "app", "academy", "access", "[productSlug]", "page.tsx"))
    ).toBe(true)
    expect(
      existsSync(path.join(process.cwd(), "app", "academy", "products", "[productId]", "page.tsx"))
    ).toBe(true)
  })

  it("defines exact index.html redirects and output tracing for all three private files", () => {
    const config = readFileSync(path.join(process.cwd(), "next.config.mjs"), "utf8")
    const sharedResponse = readFileSync(
      path.join(process.cwd(), "lib/academy-workbook-response.ts"),
      "utf8"
    )

    for (const workbook of WORKBOOKS) {
      expect(config).toContain(`source: "${workbook.path}/index.html"`)
      expect(config).toContain(`destination: "${workbook.path}"`)
      expect(config).toContain(`source: "${workbook.path}"`)
      expect(config).toContain(`".${"/"}${workbook.privateSource}"`)

      const route = readFileSync(
        path.join(process.cwd(), "app", "academy", workbook.id, "route.ts"),
        "utf8"
      )
      expect(route).toContain(`"${workbook.privateSource}"`)
      expect(route).toContain('import { readFile } from "node:fs/promises"')
    }
    expect(sharedResponse).not.toContain("process.cwd()")
    expect(sharedResponse).not.toContain('from "node:fs/promises"')
    expect(config).not.toContain('source: "/academy/:path*"')
  })

  it("keeps the Studio iframe URLs and workbook API/localStorage contracts unchanged", () => {
    const screen = readFileSync(
      path.join(process.cwd(), "components/sselfie/academy-screen.tsx"),
      "utf8"
    )

    for (const workbook of WORKBOOKS) {
      expect(screen).toContain(`"${workbook.id.replaceAll("_", "-")}": "${workbook.path}/"`)
      const html = readFileSync(path.join(process.cwd(), workbook.privateSource), "utf8")
      expect(html).toContain("/api/academy/visibility-suite/workbook")
      expect(html).toContain("visibility_suite_workbook_output_")
    }
  })

  it("round-trips an anonymous workbook through login and password setup", () => {
    const courseLibrary = readFileSync(
      path.join(process.cwd(), "app/academy/_lib/course-library.ts"),
      "utf8"
    )
    const login = readFileSync(path.join(process.cwd(), "app/auth/login/page.tsx"), "utf8")
    const forgotPassword = readFileSync(
      path.join(process.cwd(), "app/auth/forgot-password/page.tsx"),
      "utf8"
    )
    const setupPassword = readFileSync(
      path.join(process.cwd(), "app/auth/setup-password/page.tsx"),
      "utf8"
    )

    expect(courseLibrary).toContain("/auth/login?returnTo=")
    expect(courseLibrary).not.toContain("/auth/login?redirect=")
    expect(login).toContain("`/auth/forgot-password?next=${encodeURIComponent(returnTo)}`")
    expect(login).toContain("href={forgotPasswordHref}")
    expect(forgotPassword).toContain('searchParams.get("next")')
    expect(forgotPassword).toContain(
      "/auth/setup-password?next=${encodeURIComponent(nextAfterReset)}"
    )
    expect(setupPassword).toContain('searchParams.get("next")')
    expect(setupPassword).toContain("router.push(nextAfterSetup)")

    const successPage = readFileSync(
      path.join(process.cwd(), "app/academy/success/page.tsx"),
      "utf8"
    )
    expect(successPage).toContain("/auth/login?returnTo=")
    expect(successPage).not.toContain("/auth/login?redirect=")
    expect(successPage).toContain("/academy/success?product=")

    const productPage = readFileSync(
      path.join(process.cwd(), "app/academy/products/[productId]/page.tsx"),
      "utf8"
    )
    const purchaseButton = readFileSync(
      path.join(process.cwd(), "app/academy/products/[productId]/purchase-button.tsx"),
      "utf8"
    )
    expect(productPage).toContain("PROTECTED_WORKBOOK_PATH_BY_PRODUCT")
    for (const workbook of WORKBOOKS) {
      expect(productPage).toContain(`${workbook.id}: "${workbook.path}"`)
    }
    expect(productPage).toContain("/auth/login?returnTo=")
    expect(productPage).not.toContain("/auth/login?redirect=")
    // Each workbook product still redirects into its protected workbook. The
    // `|| "/academy"` fallback was removed deliberately: a product with no workbook
    // path (the AI Photo Prompt Pack) was being bounced to the library, which told
    // an owner nothing. It now renders its own page instead. What matters here is
    // that a product WITH a workbook path is still redirected, never rendered.
    expect(productPage).toContain("const workbookPath = PROTECTED_WORKBOOK_PATH_BY_PRODUCT[product.id]")
    expect(productPage).toContain("redirect(workbookPath)")
    expect(purchaseButton).toContain("/auth/login?returnTo=")
    expect(purchaseButton).not.toContain("/auth/login?redirect=")
  })
})

describe("Academy service-worker cache exclusion", () => {
  it("bumps v3 to v4 and makes Academy navigations and workbook families network-only", () => {
    const sw = readFileSync(path.join(process.cwd(), "app/sw.js/route.ts"), "utf8")

    expect(sw).toContain('CACHE_VERSION = "sselfie-v4"')
    expect(sw).not.toContain('CACHE_VERSION = "sselfie-v3"')
    expect(sw).toContain("decodeURIComponent(url.pathname)")
    expect(sw).toContain('request.mode === "navigate"')
    expect(sw).toContain('normalizedPathname === "/academy"')
    expect(sw).toContain('normalizedPathname.startsWith("/academy/")')
    for (const workbook of WORKBOOKS) {
      expect(sw).toContain(`"${workbook.path}"`)
    }
    expect(sw.indexOf("isAcademyNetworkOnly")).toBeLessThan(
      sw.indexOf('url.pathname.startsWith("/api/")')
    )
    expect(sw).toContain('event.respondWith(fetch(request, { cache: "no-store" }))')
  })
})
