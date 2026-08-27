"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import {
  normalizePostHogApiHost,
  POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE,
  sanitizePostHogEventPayload,
  sanitizePostHogPathname,
  shouldResetPostHogIdentity,
} from "@/lib/analytics/posthog-browser"
import {
  acknowledgePostHogReset,
  ensureAnalyticsBrowserIdentity,
  invalidateAnalyticsBrowserIdentity,
  type BrowserAnalyticsIdentity,
} from "@/lib/analytics/client"
import { subscribeToAnalyticsLogout } from "@/lib/analytics/auth-browser-signal"
import { createClient as createBrowserSupabaseClient } from "@/lib/supabase/client"

type PostHogBrowserClient = {
  capture: (event: string, properties?: Record<string, unknown>) => void
  get_distinct_id?: () => string
  identify: (distinctId: string) => void
  reset: () => void
  set_config: (config: Record<string, unknown>) => void
  startSessionRecording: () => void
  stopSessionRecording: () => void
}

const IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS = [0, 1_000, 3_000, 10_000, 30_000] as const

function identityRetryDelay(attempt: number): number {
  return IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS[
    Math.min(attempt, IDENTITY_BOOTSTRAP_RETRY_DELAYS_MS.length - 1)
  ]
}

declare global {
  interface Window {
    posthog?: PostHogBrowserClient
    __sselfiePostHogLoaded?: (client: PostHogBrowserClient) => void
    __sselfiePostHogLoadedClient?: PostHogBrowserClient
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
    before_send: sanitizePostHogEventPayload,
  })
  if (enabled) client.startSessionRecording()
  else client.stopSessionRecording()
}

function PostHogPageviews({
  ready,
  identityGenerationRef,
}: Readonly<{
  ready: boolean
  identityGenerationRef: { readonly current: number }
}>) {
  const pathname = usePathname()
  const identifiedAs = useRef<string | null>(null)

  useEffect(() => {
    const safePathname = pathname ? sanitizePostHogPathname(pathname) : null
    if (!ready || !safePathname || !window.posthog) return
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let refreshGeneration = 0
    let unsubscribeFromAuth: (() => void) | null = null
    const providerGeneration = identityGenerationRef.current

    const isCurrentGeneration = () => active && providerGeneration === identityGenerationRef.current

    const readIdentity = (rotateAnonymous = false, refresh = true) =>
      ensureAnalyticsBrowserIdentity({ refresh, rotateAnonymous })

    // On a full-page load, reuse the same bootstrap request as any analytics
    // event mounted alongside this provider. Later route transitions refresh
    // authentication state through the serialized identity queue.
    const refreshIdentity = async (
      attempt: number,
      generation: number,
      capturePageview: boolean
    ) => {
      try {
        const identity = await readIdentity(false, identifiedAs.current !== null || attempt > 0)
        let distinctId = identity.distinctId
        if (!isCurrentGeneration() || generation !== refreshGeneration || !window.posthog) return
        if (!distinctId) {
          scheduleIdentityRetry(attempt, generation, capturePageview)
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
              scheduleIdentityRetry(attempt, generation, capturePageview)
              return
            }
            distinctId = rotatedIdentity.distinctId
          }
          if (!isCurrentGeneration() || generation !== refreshGeneration || !window.posthog) return
          window.posthog.reset()
        }

        if (!isCurrentGeneration() || generation !== refreshGeneration || !window.posthog) return
        window.posthog.identify(distinctId)
        identifiedAs.current = distinctId
        if (capturePageview) {
          window.posthog.capture("$pageview", {
            $current_url: `${window.location.origin}${safePathname}`,
            $pathname: safePathname,
          })
        }
        setPostHogCaptureEnabled(true)
      } catch {
        scheduleIdentityRetry(attempt, generation, capturePageview)
      }
    }

    function scheduleIdentityRetry(attempt: number, generation: number, capturePageview: boolean) {
      const nextDelay = identityRetryDelay(attempt + 1)
      if (!isCurrentGeneration() || generation !== refreshGeneration) return
      retryTimer = setTimeout(
        () => void refreshIdentity(attempt + 1, generation, capturePageview),
        nextDelay
      )
    }

    const startIdentityRefresh = (capturePageview: boolean) => {
      if (!isCurrentGeneration()) return
      refreshGeneration += 1
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      // Suspend automatic capture before checking the server-owned identity.
      // A failed refresh remains fail-closed until a later bounded retry.
      setPostHogCaptureEnabled(false)
      void refreshIdentity(0, refreshGeneration, capturePageview)
    }

    const refreshOnFocus = () => startIdentityRefresh(false)
    const refreshOnVisibility = () => {
      if (document.visibilityState === "visible") startIdentityRefresh(false)
      else setPostHogCaptureEnabled(false)
    }

    window.addEventListener("focus", refreshOnFocus)
    document.addEventListener("visibilitychange", refreshOnVisibility)

    try {
      const supabase = createBrowserSupabaseClient()
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(event => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED" ||
          event === "PASSWORD_RECOVERY"
        ) {
          startIdentityRefresh(false)
        }
      })
      unsubscribeFromAuth = () => subscription.unsubscribe()
    } catch {
      // Focus and visibility revalidation remain available if auth setup is unavailable.
    }

    startIdentityRefresh(true)

    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener("focus", refreshOnFocus)
      document.removeEventListener("visibilitychange", refreshOnVisibility)
      unsubscribeFromAuth?.()
    }
  }, [pathname, ready, identityGenerationRef])

  return null
}

function postHogSnippet(apiKey: string, apiHost: string): string {
  return `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify reset set_config startSessionRecording stopSessionRecording captureException".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(apiKey)},{api_host:${JSON.stringify(apiHost)},defaults:"2026-05-30",capture_pageview:false,autocapture:false,person_profiles:"identified_only",mask_all_text:true,mask_all_element_attributes:true,capture_exceptions:false,disable_session_recording:true,enable_recording_console_log:false,session_recording:{maskAllInputs:true,maskAllElementAttributes:true,recordCanvas:false,collectFonts:false,networkPayloadCapture:{recordBody:false,recordHeaders:false}},loaded:function(ph){if(window.__sselfiePostHogLoaded)window.__sselfiePostHogLoaded(ph)},before_send:function(event){function scrub(value){if(Array.isArray(value))return value.map(scrub);if(value&&typeof value==="object"){Object.keys(value).forEach(function(key){value[key]=scrub(value[key])});return value}if(typeof value!=="string")return value;var clean=value.replace(new RegExp(${JSON.stringify(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE)},"g"),"$1[token]");if(!/^https?:\\/\\//i.test(clean)&&clean.charAt(0)!=="/")return clean;try{var absolute=/^https?:\\/\\//i.test(clean);var parsed=new URL(clean,"https://sselfie.invalid");return(absolute?parsed.origin:"")+parsed.pathname}catch(e){return clean.split(/[?#]/,1)[0]}}function exceptionDimension(value){if(typeof value!=="string")return null;var clean=value.trim();return/^[A-Za-z][A-Za-z0-9_.-]{0,79}$/.test(clean)?clean:null}try{event=scrub(event)}catch(e){return null}if(event&&event.event!=="$exception"&&event.properties){Object.keys(event.properties).forEach(function(key){if(/^\\$exception_/i.test(key))delete event.properties[key]})}if(event&&event.event==="$exception"&&event.properties){var list=Array.isArray(event.properties.$exception_list)?event.properties.$exception_list:[];var first=list[0]&&typeof list[0]==="object"&&!Array.isArray(list[0])?list[0]:null;var mechanism=first&&first.mechanism&&typeof first.mechanism==="object"&&!Array.isArray(first.mechanism)?first.mechanism:null;var type=exceptionDimension(event.properties.$exception_type||(first&&first.type));var source=exceptionDimension(event.properties.$exception_source||(first&&first.source)||(mechanism&&mechanism.type));Object.keys(event.properties).forEach(function(key){if(/exception|error|message|stack/i.test(key))delete event.properties[key]});if(type)event.properties.$exception_type=type;if(source)event.properties.$exception_source=source}if(event&&event.event==="$autocapture"&&event.properties){Object.keys(event.properties).forEach(function(key){if(/text|element|attr/i.test(key))delete event.properties[key]})}if(event&&event.properties){delete event.properties.$search_engine;delete event.properties.$referrer;delete event.properties.$referring_domain}return event;}});`
}

export function PostHogProvider({
  apiKey,
  apiHost,
}: Readonly<{ apiKey: string; apiHost: string }>) {
  const approvedApiHost = normalizePostHogApiHost(apiHost)
  const [ready, setReady] = useState(false)
  const [identity, setIdentity] = useState<BrowserAnalyticsIdentity | null>(null)
  const [loadedCallbackReady, setLoadedCallbackReady] = useState(false)
  const [identityGeneration, setIdentityGeneration] = useState(0)
  const identityGenerationRef = useRef(0)

  useEffect(
    () =>
      subscribeToAnalyticsLogout(() => {
        identityGenerationRef.current += 1
        invalidateAnalyticsBrowserIdentity()
        setPostHogCaptureEnabled(false)
        setReady(false)
        setIdentity(null)
        setIdentityGeneration(identityGenerationRef.current)
      }),
    []
  )

  useEffect(() => {
    let active = true
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    const generation = identityGeneration

    const bootstrapIdentity = async (attempt: number) => {
      const result = await ensureAnalyticsBrowserIdentity({ refresh: attempt > 0 })
      if (!active || generation !== identityGenerationRef.current) return
      if (result.distinctId) {
        setIdentity(result)
        return
      }

      const nextDelay = identityRetryDelay(attempt + 1)
      retryTimer = setTimeout(() => void bootstrapIdentity(attempt + 1), nextDelay)
    }

    void bootstrapIdentity(0)
    return () => {
      active = false
      if (retryTimer) clearTimeout(retryTimer)
    }
  }, [identityGeneration])

  useEffect(() => {
    if (!identity?.distinctId) return
    let active = true
    const generation = identityGeneration
    const initializeLoadedClient = async (client: PostHogBrowserClient) => {
      if (!active || generation !== identityGenerationRef.current) return
      const persistedDistinctId = client.get_distinct_id?.() ?? null
      if (
        identity.resetPostHog ||
        shouldResetPostHogIdentity(persistedDistinctId, identity.distinctId as string)
      ) {
        client.reset()
        if (identity.resetPostHog) await acknowledgePostHogReset()
      }
      if (!active || generation !== identityGenerationRef.current) return
      client.identify(identity.distinctId as string)
      setPostHogCaptureEnabled(true, client)
      setReady(true)
    }
    const onLoaded = (client: PostHogBrowserClient) => {
      window.__sselfiePostHogLoadedClient = client
      void initializeLoadedClient(client)
    }

    window.__sselfiePostHogLoaded = onLoaded
    setLoadedCallbackReady(true)
    if (window.__sselfiePostHogLoadedClient) {
      void initializeLoadedClient(window.__sselfiePostHogLoadedClient)
    }
    return () => {
      active = false
      if (window.__sselfiePostHogLoaded === onLoaded) delete window.__sselfiePostHogLoaded
    }
  }, [identity, identityGeneration])

  if (!apiKey || !approvedApiHost || !identity?.distinctId || !loadedCallbackReady) return null

  return (
    <>
      <Script id="posthog" strategy="afterInteractive">
        {postHogSnippet(apiKey, approvedApiHost)}
      </Script>
      <PostHogPageviews ready={ready} identityGenerationRef={identityGenerationRef} />
    </>
  )
}
