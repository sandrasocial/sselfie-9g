"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"
import {
  POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE,
  sanitizePostHogPathname,
} from "@/lib/analytics/posthog-browser"
import { ensureAnalyticsBrowserIdentity } from "@/lib/analytics/client"

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
      identify: (distinctId: string) => void
      reset: () => void
    }
  }
}

function PostHogPageviews({ ready }: Readonly<{ ready: boolean }>) {
  const pathname = usePathname()
  const identifiedAs = useRef<string | null>(null)

  useEffect(() => {
    const safePathname = pathname ? sanitizePostHogPathname(pathname) : null
    if (!ready || !safePathname || !window.posthog) return
    let active = true

    const readIdentity = (rotateAnonymous = false, refresh = true) =>
      ensureAnalyticsBrowserIdentity({ refresh, rotateAnonymous })

    // On a full-page load, reuse the same bootstrap request as any analytics
    // event mounted alongside this provider. Later route transitions refresh
    // authentication state through the serialized identity queue.
    readIdentity(false, identifiedAs.current !== null)
      .then(async identity => {
        let distinctId = identity.distinctId
        if (!active || !distinctId || !window.posthog) return

        const previousId = identifiedAs.current
        if (identity.resetPostHog) {
          window.posthog.reset()
        } else if (previousId?.startsWith("user:") && distinctId !== previousId) {
          if (distinctId.startsWith("anon:")) {
            const rotatedIdentity = await readIdentity(true)
            if (!rotatedIdentity.distinctId) return
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
      })
      .catch(() => undefined)

    return () => {
      active = false
    }
  }, [pathname, ready])

  return null
}

function postHogSnippet(apiKey: string, apiHost: string): string {
  return `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify reset set_config startSessionRecording stopSessionRecording captureException".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(apiKey)},{api_host:${JSON.stringify(apiHost)},defaults:"2026-05-30",capture_pageview:false,autocapture:true,person_profiles:"identified_only",mask_all_text:true,mask_all_element_attributes:true,capture_exceptions:true,enable_recording_console_log:false,session_recording:{maskAllInputs:true,maskAllElementAttributes:true,recordCanvas:false,collectFonts:false,networkPayloadCapture:{recordBody:false,recordHeaders:false}},before_send:function(event){function scrub(value){if(Array.isArray(value))return value.map(scrub);if(value&&typeof value==="object"){Object.keys(value).forEach(function(key){value[key]=scrub(value[key])});return value}if(typeof value!=="string")return value;var clean=value.replace(new RegExp(${JSON.stringify(POSTHOG_TOKENIZED_PATH_PATTERN_SOURCE)},"g"),"$1[token]");if(!/^https?:\\/\\//i.test(clean)&&clean.charAt(0)!=="/")return clean;try{var absolute=/^https?:\\/\\//i.test(clean);var parsed=new URL(clean,"https://sselfie.invalid");return(absolute?parsed.origin:"")+parsed.pathname}catch(e){return clean.split(/[?#]/,1)[0]}}try{event=scrub(event)}catch(e){return null}if(event&&event.properties){delete event.properties.$search_engine;delete event.properties.$referrer;delete event.properties.$referring_domain}return event;}});`
}

export function PostHogProvider({
  apiKey,
  apiHost,
}: Readonly<{ apiKey: string; apiHost: string }>) {
  const [ready, setReady] = useState(false)

  if (!apiKey) return null

  return (
    <>
      <Script id="posthog" strategy="afterInteractive" onReady={() => setReady(true)}>
        {postHogSnippet(apiKey, apiHost)}
      </Script>
      <PostHogPageviews ready={ready} />
    </>
  )
}
