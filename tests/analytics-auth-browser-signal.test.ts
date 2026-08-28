// @vitest-environment jsdom

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { beforeEach, describe, expect, it, vi } from "vitest"

import {
  notifyAnalyticsLogout,
  subscribeToAnalyticsLogout,
} from "@/lib/analytics/auth-browser-signal"

class MockBroadcastChannel {
  static instances: MockBroadcastChannel[] = []

  readonly name: string
  readonly postMessage = vi.fn()
  readonly close = vi.fn()
  readonly addEventListener = vi.fn()
  readonly removeEventListener = vi.fn()

  constructor(name: string) {
    this.name = name
    MockBroadcastChannel.instances.push(this)
  }
}

describe("analytics logout browser signal", () => {
  beforeEach(() => {
    MockBroadcastChannel.instances = []
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel)
    document.cookie = "sselfie_analytics_generation=11111111-1111-4111-8111-111111111111; Path=/"
    document.cookie = "sselfie_supabase_session_generation=; Path=/; Max-Age=0"
  })

  it("notifies both the current tab and other tabs without sending identity data", () => {
    const currentTabLogout = vi.fn()
    const unsubscribe = subscribeToAnalyticsLogout(currentTabLogout)

    notifyAnalyticsLogout()

    expect(currentTabLogout).toHaveBeenCalledOnce()
    expect(MockBroadcastChannel.instances).toHaveLength(2)
    expect(MockBroadcastChannel.instances[1]).toMatchObject({
      name: "sselfie-analytics-auth",
    })
    expect(MockBroadcastChannel.instances[1].postMessage).toHaveBeenCalledWith("logout")
    expect(MockBroadcastChannel.instances[1].close).toHaveBeenCalledOnce()

    unsubscribe()
  })

  it("revalidates on a cross-tab logout and removes every listener on cleanup", () => {
    const onLogout = vi.fn()
    const unsubscribe = subscribeToAnalyticsLogout(onLogout)
    const channel = MockBroadcastChannel.instances[0]

    expect(channel.addEventListener).toHaveBeenCalledWith("message", expect.any(Function))
    const messageHandler = channel.addEventListener.mock.calls[0]?.[1] as (
      event: MessageEvent
    ) => void

    messageHandler(new MessageEvent("message", { data: "unrelated" }))
    expect(onLogout).not.toHaveBeenCalled()
    messageHandler(new MessageEvent("message", { data: "logout" }))
    expect(onLogout).toHaveBeenCalledOnce()

    unsubscribe()
    expect(channel.removeEventListener).toHaveBeenCalledWith("message", messageHandler)
    expect(channel.close).toHaveBeenCalledOnce()
  })

  it("resets analytics identity before every browser logout attempt", () => {
    const callers = [
      "components/app-v3/account-view.tsx",
      "components/sselfie/account-screen.tsx",
      "components/sselfie/academy-screen.tsx",
      "components/sselfie/b-roll-screen.tsx",
      "components/sselfie/maya-chat-screen.tsx",
      "components/sselfie/profile-screen.tsx",
      "components/sselfie/settings-screen.tsx",
      "components/sselfie/sselfie-app.tsx",
    ]

    for (const caller of callers) {
      const source = readFileSync(join(process.cwd(), caller), "utf8")
      const logoutRequest = source.indexOf("/api/auth/logout")
      const signal = source.lastIndexOf("notifyAnalyticsLogout()", logoutRequest)

      expect(source, caller).toContain("/api/auth/logout")
      expect(logoutRequest, caller).toBeGreaterThan(-1)
      expect(signal, caller).toBeGreaterThan(-1)
      expect(signal, caller).toBeLessThan(logoutRequest)
    }
  })

  it("binds an untagged auth session to the pre-logout generation", () => {
    notifyAnalyticsLogout()

    expect(document.cookie).toContain(
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111"
    )
    expect(document.cookie).not.toContain(
      "sselfie_analytics_generation=11111111-1111-4111-8111-111111111111"
    )
  })

  it("removes the deleted account marker before rotating analytics", () => {
    document.cookie =
      "sselfie_supabase_session_generation=11111111-1111-4111-8111-111111111111; Path=/"

    notifyAnalyticsLogout({ preserveSupabaseSessionGeneration: false })

    expect(document.cookie).not.toContain("sselfie_supabase_session_generation=")
    expect(document.cookie).not.toContain(
      "sselfie_analytics_generation=11111111-1111-4111-8111-111111111111"
    )
  })

  it("broadcasts account deletion only after the server confirms success", () => {
    const source = readFileSync(
      join(process.cwd(), "components/sselfie/account-screen.tsx"),
      "utf8"
    )
    const deleteRequest = source.indexOf('fetch("/api/user/delete"')
    const successCheck = source.indexOf("if (response.ok)", deleteRequest)
    const signal = source.indexOf(
      "notifyAnalyticsLogout({ preserveSupabaseSessionGeneration: false })",
      deleteRequest
    )

    expect(deleteRequest).toBeGreaterThan(-1)
    expect(successCheck).toBeGreaterThan(deleteRequest)
    expect(signal).toBeGreaterThan(successCheck)
  })
})
