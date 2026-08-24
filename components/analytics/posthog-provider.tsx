"use client"

import { useEffect, useState } from "react"
import { usePathname } from "next/navigation"
import Script from "next/script"

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void
    }
  }
}

function PostHogPageviews({ ready }: Readonly<{ ready: boolean }>) {
  const pathname = usePathname()

  useEffect(() => {
    if (!ready || !pathname || !window.posthog) return
    window.posthog.capture("$pageview", {
      $current_url: `${window.location.origin}${pathname}`,
      $pathname: pathname,
    })
  }, [pathname, ready])

  return null
}

function postHogSnippet(apiKey: string, apiHost: string): string {
  return `!function(t,e){var o,n,p,r;e.__SV||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="init capture register register_once unregister identify set_config startSessionRecording stopSessionRecording captureException".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);posthog.init(${JSON.stringify(apiKey)},{api_host:${JSON.stringify(apiHost)},defaults:"2026-05-30",capture_pageview:false,autocapture:true,person_profiles:"identified_only",mask_all_text:true,mask_all_element_attributes:true,capture_exceptions:true,enable_recording_console_log:false,session_recording:{maskAllInputs:true,maskAllElementAttributes:true,recordCanvas:false,collectFonts:false,networkPayloadCapture:{recordBody:false,recordHeaders:false}},before_send:function(event){if(event&&event.properties){delete event.properties.$search_engine;delete event.properties.$referrer;delete event.properties.$referring_domain;if(event.properties.$current_url){try{var current=new URL(event.properties.$current_url);event.properties.$current_url=current.origin+current.pathname}catch(e){delete event.properties.$current_url}}}return event;}});`
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
