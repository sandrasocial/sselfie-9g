"use client"

import Image from "next/image"
import Link from "next/link"
import { useEffect, useState } from "react"
import { trackAnalyticsEvent } from "@/lib/analytics/client"

type SinglePromptGateProps = {
  promptNumber: string
  promptId: string
  promptTitle: string
  promptMood?: string
  whenToUse: string
  promptText: string
  exampleImage?: string
  promptPageUrl: string
  checkoutHref: string
  vaultCount: number
}

const PROMPT_INTENT_OPTIONS = [
  {
    value: "brand_photos",
    label: "Brand photos",
    copy: "I want photos that look like my personal brand, not random AI.",
  },
  {
    value: "reel_cover",
    label: "Reel cover",
    copy: "I need one image strong enough to stop the scroll.",
  },
  {
    value: "content_week",
    label: "Content week",
    copy: "I want a small set I can turn into posts, stories, and captions.",
  },
] as const

type PromptIntent = (typeof PROMPT_INTENT_OPTIONS)[number]["value"]

function readAttributionParams(promptNumber: string): Record<string, string> {
  if (typeof window === "undefined") return {}
  const p = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {
    utm_source: p.get("utm_source") || "instagram",
    utm_medium: p.get("utm_medium") || "manychat",
    utm_campaign: p.get("utm_campaign") || "numbered_prompt",
    utm_content: p.get("utm_content") || `prompt_${promptNumber}`,
    checkout_source: p.get("checkout_source") || "single_prompt_page",
    cta_keyword: p.get("cta_keyword") || promptNumber,
  }
  const quizResult = p.get("quiz_result")
  if (quizResult) result.quiz_result = quizResult
  const entryPostSlug = p.get("entry_post_slug")
  if (entryPostSlug) result.entry_post_slug = entryPostSlug
  result.landing_path = `${window.location.pathname}${window.location.search}`
  if (document.referrer) result.referrer = document.referrer
  return result
}

function appendIntentToHref(href: string, promptIntent: PromptIntent): string {
  const url = new URL(href, "https://www.sselfie.ai")
  url.searchParams.set("quiz_result", promptIntent)
  url.searchParams.set("buyer_stage", "lead")
  return `${url.pathname}?${url.searchParams.toString()}`
}

function promptReturnUrl(promptPageUrl: string, promptIntent: PromptIntent): string {
  if (typeof window === "undefined") return promptPageUrl
  const url = new URL(promptPageUrl, window.location.origin)
  const current = new URLSearchParams(window.location.search)
  for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_content", "checkout_source", "cta_keyword"]) {
    const value = current.get(key)
    if (value) url.searchParams.set(key, value)
  }
  url.searchParams.set("quiz_result", promptIntent)
  url.searchParams.set("prompt_access", "email")
  return url.toString()
}

export function SinglePromptGate({
  promptNumber,
  promptId,
  promptTitle,
  promptMood,
  whenToUse,
  promptText,
  exampleImage,
  promptPageUrl,
  checkoutHref,
  vaultCount,
}: SinglePromptGateProps) {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<"idle" | "loading" | "revealed" | "error">("idle")
  const [copied, setCopied] = useState(false)
  const [promptIntent, setPromptIntent] = useState<PromptIntent>("brand_photos")

  useEffect(() => {
    if (typeof window === "undefined") return
    const params = new URLSearchParams(window.location.search)
    const returnAccess = params.get("prompt_access") === "email"
    if (returnAccess || window.sessionStorage.getItem(`sselfie_prompt_${promptNumber}_revealed`) === "1") {
      setStatus("revealed")
    }
  }, [promptNumber])

  useEffect(() => {
    const attribution = readAttributionParams(promptNumber)
    trackAnalyticsEvent({
      event: "prompt_vault_prompt_viewed",
      properties: {
        source: "single-prompt-page",
        prompt_id: promptId,
        prompt_title: promptTitle,
        prompt_number: promptNumber,
        mood: promptMood || null,
        ...attribution,
      },
    })
  }, [promptId, promptMood, promptNumber, promptTitle])

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmedEmail = email.trim()
    if (!trimmedEmail) {
      setStatus("error")
      return
    }

    setStatus("loading")
    try {
      const response = await fetch("/api/ai-prompts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: trimmedEmail,
          firstName: "there",
          delivery_context: "single_prompt",
          prompt_number: promptNumber,
          prompt_title: promptTitle,
          ...readAttributionParams(promptNumber),
          prompt_page_url: promptReturnUrl(promptPageUrl, promptIntent),
          prompt_checkout_url: appendIntentToHref(checkoutHref, promptIntent),
          prompt_intent: promptIntent,
          quiz_result: promptIntent,
        }),
      })

      if (!response.ok) {
        setStatus("error")
        return
      }

      const json = await response.json()
      if (!json?.success) {
        setStatus("error")
        return
      }

      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(`sselfie_prompt_${promptNumber}_revealed`, "1")
      }
      setStatus("revealed")
    } catch {
      setStatus("error")
    }
  }

  function copyPrompt() {
    const markCopied = () => {
      setCopied(true)
      const attribution = readAttributionParams(promptNumber)
      trackAnalyticsEvent({
        event: "ai_prompts_prompt_copied",
        properties: {
          source: "single-prompt-page",
          prompt_id: promptId,
          prompt_title: promptTitle,
          prompt_number: promptNumber,
          mood: promptMood || null,
          ...attribution,
        },
      })
      const storageKey = `sselfie_prompt_${promptNumber}_after_copy_vault_cta_viewed`
      if (window.sessionStorage.getItem(storageKey) !== "1") {
        window.sessionStorage.setItem(storageKey, "1")
        trackAnalyticsEvent({
          event: "ai_prompts_after_copy_vault_cta_view",
          properties: {
            source: "single-prompt-page",
            prompt_id: promptId,
            prompt_title: promptTitle,
            prompt_number: promptNumber,
            mood: promptMood || null,
            ...attribution,
          },
        })
      }
      window.setTimeout(() => setCopied(false), 1800)
    }

    navigator.clipboard.writeText(promptText).then(
      markCopied,
      () => {
        const el = document.createElement("textarea")
        el.value = promptText
        el.style.position = "absolute"
        el.style.left = "-9999px"
        document.body.appendChild(el)
        el.select()
        document.execCommand("copy")
        document.body.removeChild(el)
        markCopied()
      },
    )
  }

  const revealed = status === "revealed"
  const checkoutHrefWithIntent = appendIntentToHref(checkoutHref, promptIntent)

  return (
    <section className="sp-shell">
      <div className="sp-media">
        {exampleImage ? (
          <Image
            src={exampleImage}
            alt={`${promptTitle} example image`}
            fill
            priority
            sizes="(max-width: 900px) 100vw, 46vw"
            className={`sp-image ${revealed ? "" : "sp-image-locked"}`}
          />
        ) : (
          <div className="sp-image-fallback" />
        )}
      </div>

      <div className="sp-panel">
        <p className="sp-eyebrow">PROMPT #{promptNumber}</p>
        <h1>{promptTitle}</h1>
        <p className="sp-intro">{whenToUse}</p>

        {!revealed ? (
          <form className="sp-form" onSubmit={handleSubmit} noValidate>
            <p>Here&apos;s the exact prompt from the reel. Drop your email and it&apos;s yours (I&apos;ll send a copy too, so it doesn&apos;t get lost in your DMs).</p>
            <div className="sp-proof" aria-label="What this prompt helps you do">
              <span>1 selfie</span>
              <span>1 exact shoot direction</span>
              <span>1 image you can actually test today</span>
            </div>
            <fieldset className="sp-intent">
              <legend>What do you want this prompt for?</legend>
              {PROMPT_INTENT_OPTIONS.map(option => (
                <label key={option.value} className={promptIntent === option.value ? "sp-intent-active" : ""}>
                  <input
                    type="radio"
                    name="prompt_intent"
                    value={option.value}
                    checked={promptIntent === option.value}
                    onChange={() => setPromptIntent(option.value)}
                  />
                  <span>{option.label}</span>
                  <small>{option.copy}</small>
                </label>
              ))}
            </fieldset>
            <label htmlFor="single-prompt-email">Your email</label>
            <div className="sp-form-row">
              <input
                id="single-prompt-email"
                type="email"
                value={email}
                placeholder="you@example.com"
                autoComplete="email"
                onChange={event => setEmail(event.target.value)}
                disabled={status === "loading"}
                required
              />
              <button type="submit" disabled={status === "loading"}>
                {status === "loading" ? "Sending" : "Send me the prompt"}
              </button>
            </div>
            {status === "error" && (
              <p className="sp-error">Something went wrong. Try again or email hello@sselfie.ai.</p>
            )}
            <p className="sp-tiny">One prompt, free, yours. No spam, just the good stuff.</p>
          </form>
        ) : (
          <div className="sp-reveal">
            <p className="sp-reveal-title">Here it is.</p>
            <p>
              Paste this into ChatGPT with one of your own selfies attached. It&apos;s still you.
              Same features, same you, just your best light.
            </p>
            <pre>{promptText}</pre>
            <button type="button" className="sp-copy" onClick={copyPrompt}>
              {copied ? "Copied" : "Copy prompt"}
            </button>
            <p className="sp-tip">
              Start with a clear, well-lit selfie. After you generate, nudge the exposure to match
              your light. You finish it.
            </p>
            <p className="sp-tip">
              If this one gets close, the Vault is the shortcut: full shoot worlds, not one-off
              prompt hunting.
            </p>
          </div>
        )}

        <div className="sp-vault">
          <p className="sp-vault-eyebrow">NEXT STEP</p>
          <h2>Want the whole shoot world?</h2>
          <p>
            This is one exact prompt. The Vault gives you the full collection around it:
            hero shots, close-ups, outfit angles, street scenes, café moments, and new drops
            when your content needs to feel fresh again.
          </p>
          <p>
            One selfie can become a full editorial shoot library you actually want to post.
            {` ${vaultCount}`} prompts, $37, one time.
          </p>
          <Link
            href={checkoutHrefWithIntent}
            onClick={() => {
              trackAnalyticsEvent({
                event: "ai_prompts_prompt_vault_click",
                properties: {
                  source: "single-prompt-page",
                  prompt_id: promptId,
                  prompt_title: promptTitle,
                  prompt_number: promptNumber,
                  quiz_result: promptIntent,
                  ...readAttributionParams(promptNumber),
                },
              })
            }}
          >
            Get the full Vault
          </Link>
          <p className="sp-heart">
            You don&apos;t need a photographer or a perfect day. You need one selfie and somewhere
            to point it.
          </p>
        </div>
      </div>
    </section>
  )
}
