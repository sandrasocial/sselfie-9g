// @vitest-environment node
import fs from "fs"
import path from "path"
import { describe, expect, it } from "vitest"

const ROOT = process.cwd()

const FEED_IMPORT_MIGRATION_FILES = [
  "app/api/blueprint/generate-grid/route.ts",
  "app/api/blueprint/generate-paid/route.ts",
  "app/api/feed-planner/create-from-strategy/route.ts",
  "app/api/feed-planner/v2/variations/route.ts",
  "app/api/feed/[feedId]/generate-single/route.ts",
  "app/api/feed/[feedId]/regenerate-post/route.ts",
  "app/api/feed/[feedId]/update-style/route.ts",
  "app/api/feed/create-free-example/route.ts",
  "app/api/feed/create-manual/route.ts",
]

const AUTH_WRAPPED_FILES = [
  "app/api/feed-planner/access/route.ts",
  "app/api/feed-planner/enhance-goal/route.ts",
  "app/api/feed-planner/delete-strategy/route.ts",
  "app/api/feed-planner/generate-all-images/route.ts",
  "app/api/feed-planner/queue-all-images/route.ts",
  "app/api/images/lookup/route.ts",
  "app/api/gallery/images/route.ts",
  "app/api/stripe/create-checkout-session/route.ts",
  "app/api/stripe/create-portal-session/route.ts",
  "app/api/feed/create-free-example/route.ts",
  "app/api/feed/create-manual/route.ts",
  "app/api/feed/[feedId]/update-style/route.ts",
  "app/api/feed/[feedId]/regenerate-post/route.ts",
]

describe("phase 4 route hygiene", () => {
  it("removes feed-planner-v2 imports from active API routes", () => {
    for (const relPath of FEED_IMPORT_MIGRATION_FILES) {
      const contents = fs.readFileSync(path.join(ROOT, relPath), "utf8")
      expect(contents).not.toContain("feed-planner-v2")
      expect(contents).toContain("@/lib/feed-planner/")
    }
  })

  it("uses withAuth wrapper on high-traffic authenticated routes", () => {
    for (const relPath of AUTH_WRAPPED_FILES) {
      const contents = fs.readFileSync(path.join(ROOT, relPath), "utf8")
      expect(contents).toContain("withAuth(")
      expect(contents).not.toContain("supabase.auth.getUser")
    }
  })

  it("keeps v2 compatibility shims as re-exports only", () => {
    const shimFiles = [
      "lib/feed-planner-v2/prompt-loader.ts",
      "lib/feed-planner-v2/generation.ts",
      "lib/feed-planner-v2/feature-flag.ts",
      "lib/feed-planner-v2/maya-prompts.ts",
    ]

    for (const relPath of shimFiles) {
      const contents = fs.readFileSync(path.join(ROOT, relPath), "utf8").trim()
      expect(contents.startsWith('export * from "@/lib/feed-planner/')).toBe(true)
    }
  })
})
