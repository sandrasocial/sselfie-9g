"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import {
  POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE,
  sanitizePostHogPathname,
  shouldResetPostHogIdentity,
} from "@/lib/analytics/posthog-browser"
import {
  acknowledgePostHogReset,
  ensureAnalyticsBrowserIdentity,
  type BrowserAnalyticsIdentity,
} from "@/lib/analytics/client"

type PostHogBrowserClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void
  get_distinct_id?: () => string
  identify: (distinctId: string) => void
  reset: () => void
  set_config: (config: Record<string, unknown>) => void
  startSessionRecording: () => void
  stopSessionRecording: () => void
}

const IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS = [0, 1_000, 3_000, 10_000] as const

declare global {
  interface Window {
    posthog?: PostHogBrowserClient
    __sselfiePostHogLoaded?: (client: PostHogBrowserClient) => void
  }
}

function setPostHogCaptureEnabled(
  enabled: boolean,
  client: PostHogBrowserClient | undefined = window.posthog
) {
  if (!client) return
  client.set_config({
    autocapture: enabled,
    capture_exceptions: enabled,
    disable_session_recording: !enabled,
  })
  if (enabled) client.startSessionRecording()
  else client.stopSessionRecording()
}

function PostHogPageviews({ ready }: Readonly<{ ready: boolean }>) {
  const pathname = usePathname()
  const identifiedAs = useRef<string | null>(null)

  useEffect(() => {
    const safePathname = pathname ? sanitizePostHogPathname(pathname) : null
    if (!ready || !safePathname || !window.posthog) return
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    // Suspend automatic capture while the server-owned identity/reset signal
    // is refreshed. If identity resolution fails, capture stays disabled.
    setPostHogCaptureEnabled(false)

    const readIdentity = (rotateAnonymous = false, refresh = true) =>
      ensureAnalyticsBrowserIdentity({ refresh, rotateAnonymous })

    // On a full-page load, reuse the same bootstrap request as any analytics
    // event mounted alongside this provider. Later route transitions refresh
    // authentication state through the serialized identity queue.
    const refreshIdentity = async (attempt: number) => {
      try {
        const identity = await readIdentity(false, identifiedAs.current !== null || attempt > 0)
        let distinctId = identity.distinctId
        if (!active || !window.posthog) return
        if (!distinctId) {
          scheduleIdentityRetry(attempt)
          return
        }

        const previousId = identifiedAs.current ?? window.posthog.get_distinct_id?.() ?? null
        if (identity.resetPostHog) {
          window.posthog.reset()
          await acknowledgePostHogReset()
        } else if (shouldResetPostHogIdentity(previousId, distinctId)) {
          if (distinctId.startsWith("anon:")) {
            const rotatedIdentity = await readIdentity(true)
            if (!rotatedIdentity.distinctId) {
              scheduleIdentityRetry(attempt)
              return
            }
            distinctId = rotatedIdentity.distinctId
          }
          if (!active || !window.posthog) return
          window.posthog.reset()
        }

        if (!active || !window.posthog) return
        window.posthog.identify(distinctId)
        identifiedAs.current = distinctId
        window.posthog.capture("$pageview", {
          $current_url: `${window.location.origin}${safePathname}`,
          $pathname: safePathname,
        })
        setPostHogCaptureEnabled(true)
      } catch {
        scheduleIdentityRetry(attempt)
      }
    }

    function scheduleIdentityRetry(attempt: number) {
      const nextDelay = IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS[attempt + 1]
      if (!active || nextDelay === undefined) return
      retryTimer = setTimeout(() => void refreshIdentity(attempt + 1), nextDelay)
    }

    void refreshIdentity(0)

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [pathname, ready])

  return null
}

function postHogSnippet(apiKey: string, apiHost: string): string {
  return `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify reset set_config startSessionRecording stopSessionRecording captureException".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(apiKey)},{api_host:${JSON.stringify(apiHost)},defaults:"2026-05-30",capture_pageview:false,autocapture:false,person_profiles:"identified_only",mask_all_text:true,mask_all_element_attributes:true,capture_exceptions:false,disable_session_recording:true,enable_recording_console_log:false,session_recording:{maskAllInputs:true,maskAllElementAttributes:true,recordCanvas:false,collectFonts:false,networkPayloadCapture:{recordBody:false,recordHeaders:false}},loaded:function(ph){if(window.__sselfiePostHogLoaded)window.__sselfiePostHogLoaded(ph)},before_send:function(event){function scrub(value){if(Array.isArray(value))return value.map(scrub);if(value&&typeof value==="object"){Object.keys(value).forEach(function(key){value[key]=scrub(value[key])});return value}if(typeof value!=="string")return value;var clean=value.replace(new RegExp(${JSON.stringify(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE)},"g"),"$1[token]");if(!/^https?:\\/\\//i.test(clean)&&clean.charAt(0)!=="/")return clean;try{var absolute=/^https?:\\/\\//i.test(clean);var parsed=new URL(clean,"https://sselfie.invalid");return(absolute?parsed.origin:"")+parsed.pathname}catch(e){return clean.split(/[?#]/,1)[0]}}try{event=scrub(event)}catch(e){return null}if(event&&event.event!=="$exception"&&event.properties){Object.keys(event.properties).forEach(function(key){if(/^\\$exception_/i.test(key))delete event.properties[key]})}if(event&&event.event==="$exception"&&event.properties){Object.keys(event.properties).forEach(function(key){if(/exception|error|message|stack/i.test(key))delete event.properties[key]})}if(event&&event.event==="$autocapture"&&event.properties){Object.keys(event.properties).forEach(function(key){if(/text|element|attr/i.test(key))delete event.properties[key]})}if(event&&event.properties){delete event.properties.$search_engine;delete event.properties.$referrer;delete event.properties.$referring_domain}return event;}});`
}

export function PostHogProvider({
  apiKey,
  apiHost,
}: Readonly<{ apiKey: string; apiHost: string }>) {
  const [ready, setReady] = useState(false)
  const [identity, setIdentity] = useState<BrowserAnalyticsIdentity | null>(null)
  const [loadedCallbackReady, setLoadedCallbackReady] = useState(false)

  useEffect(() => {
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null

    const bootstrapIdentity = async (attempt: number) => {
      const result = await ensureAnalyticsBrowserIdentity({ refresh: attempt > 0 })
      if (!active) return
      if (result.distinctId) {
        setIdentity(result)
        return
      }

      const nextDelay = IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS[attempt + 1]
      if (nextDelay !== undefined) {
        retryTimer = setTimeout(() => void bootstrapIdentity(attempt + 1), nextDelay)
      }
    }

    void bootstrapIdentity(0)
    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [])

  useEffect(() => {
    if (!identity?.distinctId) return
    let active = true
    const initializeLoadedClient = async (client: PostHogBrowserClient) => {
      if (!active) return
      const persistedDistinctId = client.get_distinct_id?.() ?? null
      if (
        identity.resetPostHog ||
        shouldResetPostHogIdentity(persistedDistinctId, identity.distinctId as string)
      ) {
        client.reset()
        if (identity.resetPostHog) await acknowledgePostHogReset()
      }
      if (!active) return
      client.identify(identity.distinctId as string)
      setPostHogCaptureEnabled(true, client)
      setReady(true)
    }
    const onLoaded = (client: PostHogBrowserClient) => {
      void initializeLoadedClient(client)
    }

    window.__sselfiePostHogLoaded = onLoaded
    setLoadedCallbackReady(true)
    return () => {
      active = false
      if (window.__sselfiePostHogLoaded === onLoaded) delete window.__sselfiePostHogLoaded
    }
  }, [identity])

  if (!apiKey || !identity?.distinctId || !loadedCallbackReady) return null

  return (
    <>
      <Script id="posthog" strategy="afterInteractive">
        {postHogSnippet(apiKey, apiHost)}
      </Script>
      <PostHogPageviews ready={ready} />
    </>
  )
}
