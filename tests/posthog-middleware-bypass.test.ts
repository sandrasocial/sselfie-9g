// @vitest-environment node

import { beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest, NextResponse } from "next/server"

const mocks = vi.hoisted(() => ({
  updateSession: vi.fn(),
}))

vi.mock("@/lib/debug", () => ({ DEBUG_LOGS: false }))
vi.mock("@/lib/supabase/middleware", () => ({ updateSession: mocks.updateSession }))

import { middleware } from "@/middleware"

describe("retired PostHog ingestion proxy boundary", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.updateSession.mockResolvedValue(NextResponse.next())
  })

  it.each([
    "/ingest/static/array.js",
    "/ingest/i/v0/e/",
    "/ingest/decide/",
    "/ingest/batch/",
    "/ingest",
    "/ingest/",
    "/ingest/admin",
    "/ingestion",
    "/ingest-other",
  ])(
    "preserves normal auth middleware for the retired proxy path %s",
    async pathname => {
      await middleware(new NextRequest(`https://sselfie.ai${pathname}`))
      expect(mocks.updateSession).toHaveBeenCalledOnce()
    }
  )
})
