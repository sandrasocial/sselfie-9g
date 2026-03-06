import { describe, expect, it } from "vitest"

import {
  resolveStudioTab,
  resolvePostAuthRedirect,
  DEFAULT_STUDIO_AUTH_REDIRECT,
  readStudioTabFromSearchParams,
  readStudioTabFromHash,
  type StudioTab,
} from "@/lib/studio/tab-routing"

describe("studio tab routing", () => {
  it("prefers explicit initial tab when valid", () => {
    const tab = resolveStudioTab({
      initialTab: "academy",
      searchTab: "maya",
      hashTab: "gallery",
      isMembership: false,
    })
    expect(tab).toBe("academy")
  })

  it("syncs to search param tab when initial tab is absent", () => {
    const tab = resolveStudioTab({
      searchTab: "feed-planner",
      hashTab: "maya",
      isMembership: false,
    })
    expect(tab).toBe("feed-planner")
  })

  it("falls back to hash tab when query tab is not valid", () => {
    const tab = resolveStudioTab({
      searchTab: "invalid",
      hashTab: "gallery",
      isMembership: true,
    })
    expect(tab).toBe("gallery")
  })

  it("returns membership fallback when no route hint is valid", () => {
    const tab = resolveStudioTab({
      searchTab: null,
      hashTab: "",
      isMembership: true,
    })
    expect(tab).toBe("maya")
  })

  it("reads tab from URLSearchParams safely", () => {
    const params = new URLSearchParams("tab=account&product=get_paid")
    expect(readStudioTabFromSearchParams(params)).toBe("account")
  })

  it("accepts studio hub tab from route inputs", () => {
    const params = new URLSearchParams("tab=studio")
    expect(readStudioTabFromSearchParams(params)).toBe("studio")
    expect(readStudioTabFromHash("#studio")).toBe("studio")
  })

  it("ignores invalid query tabs", () => {
    const params = new URLSearchParams("tab=blueprint")
    expect(readStudioTabFromSearchParams(params)).toBeNull()
  })

  it("reads tab from location hash", () => {
    expect(readStudioTabFromHash("#academy")).toBe("academy")
    expect(readStudioTabFromHash("gallery")).toBe("gallery")
  })

  it("ignores invalid hash values", () => {
    expect(readStudioTabFromHash("#maya/prompts")).toBeNull()
    expect(readStudioTabFromHash("#unknown") as StudioTab | null).toBeNull()
  })

  it("defaults post-auth redirect to Maya tab", () => {
    expect(resolvePostAuthRedirect(null)).toBe(DEFAULT_STUDIO_AUTH_REDIRECT)
    expect(resolvePostAuthRedirect("")).toBe(DEFAULT_STUDIO_AUTH_REDIRECT)
  })

  it("keeps valid relative post-auth redirects", () => {
    expect(resolvePostAuthRedirect("/studio?tab=academy")).toBe("/studio?tab=academy")
  })

  it("rejects non-relative post-auth redirects", () => {
    expect(resolvePostAuthRedirect("https://evil.example")).toBe(DEFAULT_STUDIO_AUTH_REDIRECT)
  })
})
