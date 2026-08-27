// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
}))

vi.mock("@/lib/debug", () => ({ DEBUG_LOGS: false }))
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: mocks.updateSession }))

import { isPostHogIngestPath, middleware } from "@/middleware"

describe("PostHog ingestion middleware boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateSession.mockResolvedValue(NextResponse.next())
  })

  it.each(["/ingest/static/array.js", "/ingest/i/v0/e/", "/ingest/decide/", "/ingest/batch/"])(
    "bypasses auth for the exact ingestion proxy path %s",
    async pathname => {
      expect(isPostHogIngestPath(pathname)).toBe(true)
      await middleware(new NextRequest(`https://sselfie.ai${pathname}`))
      expect(mocks.updateSession).not.toHaveBeenCalled()
    }
  )

  it.each(["/ingest", "/ingest/", "/ingest/admin", "/ingestion", "/ingest-other", "/app"])(
    "preserves normal auth middleware for %s",
    async pathname => {
      expect(isPostHogIngestPath(pathname)).toBe(false)
      await middleware(new NextRequest(`https://sselfie.ai${pathname}`))
      expect(mocks.updateSession).toHaveBeenCalledOnce()
    }
  )
})
