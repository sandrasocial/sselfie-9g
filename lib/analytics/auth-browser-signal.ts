"use client"

import { rotateAnalyticsBrowserIdentity } from "@/lib/analytics/client"
import {
  bindCurrentSupabaseSessionGeneration,
  clearCurrentSupabaseSessionGeneration,
} from "@/lib/supabase/client"

const AUTH_CHANNEL_NAME = "sselfie-analytics-auth"
const AUTH_STORAGE_KEY = "sselfie_analytics_auth_signal"
const AUTH_WINDOW_EVENT = "sselfie:analytics-auth-logout"
const LOGOUT_MESSAGE = "logout"

export function notifyAnalyticsLogout(
  options: Readonly<{
    preserveSupabaseSessionGeneration?: boolean
    rotateAnalyticsGeneration?: boolean
  }> = {}
): void {
  if (typeof window === "undefined") return

  if (options.preserveSupabaseSessionGeneration === false) {
    // Account deletion removes the auth identity entirely. Do not leave a
    // marker that a future credential-based sign-in could mistake for a
    // recovered pre-deletion session.
    clearCurrentSupabaseSessionGeneration()
  } else {
    // Existing sessions created before generation tagging may not have a marker
    // yet. Bind them to the pre-logout generation before rotating the shared
    // analytics cookie so a cross-tab refresh cannot inherit the new value.
    bindCurrentSupabaseSessionGeneration()
  }

  if (options.rotateAnalyticsGeneration !== false) {
    // Rotate synchronously before the logout request begins. Older in-flight
    // analytics responses can then write only their previous generation's
    // versioned anonymous cookie and cannot reconnect the signed-out browser.
    rotateAnalyticsBrowserIdentity()
  }

  // Revalidate the current tab before its navigation completes.
  window.dispatchEvent(new Event(AUTH_WINDOW_EVENT))

  try {
    if (typeof window.BroadcastChannel === "function") {
      const channel = new window.BroadcastChannel(AUTH_CHANNEL_NAME)
      channel.postMessage(LOGOUT_MESSAGE)
      channel.close()
      return
    }
  } catch {
    // Fall back to a transient storage event for older or restricted browsers.
  }

  try {
    window.localStorage.setItem(AUTH_STORAGE_KEY, String(Date.now()))
    window.localStorage.removeItem(AUTH_STORAGE_KEY)
  } catch {
    // Focus/visibility checks remain as the final fail-closed fallback.
  }
}

export function subscribeToAnalyticsLogout(onLogout: () => void): () => void {
  if (typeof window === "undefined") return () => undefined

  const handleCurrentTabLogout = () => onLogout()
  const handleStorageLogout = (event: StorageEvent) => {
    if (event.key === AUTH_STORAGE_KEY && event.newValue) onLogout()
  }
  const handleBroadcastLogout = (event: MessageEvent<unknown>) => {
    if (event.data === LOGOUT_MESSAGE) onLogout()
  }

  window.addEventListener(AUTH_WINDOW_EVENT, handleCurrentTabLogout)

  let channel: BroadcastChannel | null = null
  try {
    if (typeof window.BroadcastChannel === "function") {
      channel = new window.BroadcastChannel(AUTH_CHANNEL_NAME)
      channel.addEventListener("message", handleBroadcastLogout)
    }
  } catch {
    channel = null
  }

  if (!channel) window.addEventListener("storage", handleStorageLogout)

  return () => {
    window.removeEventListener(AUTH_WINDOW_EVENT, handleCurrentTabLogout)
    window.removeEventListener("storage", handleStorageLogout)
    if (channel) {
      channel.removeEventListener("message", handleBroadcastLogout)
      channel.close()
    }
  }
}
