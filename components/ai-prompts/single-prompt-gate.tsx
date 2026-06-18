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
  const entryPostSlug = p.get("entry_post_slug")
  if (entryPostSlug) result.entry_post_slug = entryPostSlug
  result.landing_path = `${window.location.pathname}${window.location.search}`
  if (document.referrer) result.referrer = document.referrer
  return result
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

  useEffect(() => {
    if (typeof window === "undefined") return
    if (window.sessionStorage.getItem(`sselfie_prompt_${promptNumber}_revealed`) === "1") {
      setStatus("revealed")
    }
  }, [promptNumber])

  useEffect(() => {
    trackAnalyticsEvent({
      event: "prompt_vault_prompt_viewed",
      properties: {
        source: "single-prompt-page",
        prompt_id: promptId,
        prompt_title: promptTitle,
        prompt_number: promptNumber,
        mood: promptMood || null,
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
          prompt_page_url: promptPageUrl,
          ...readAttributionParams(promptNumber),
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
      trackAnalyticsEvent({
        event: "ai_prompts_prompt_copied",
        properties: {
          source: "single-prompt-page",
          prompt_id: promptId,
          prompt_title: promptTitle,
          prompt_number: promptNumber,
          mood: promptMood || null,
        },
      })
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
            <p>Here&apos;s the exact prompt from the reel. Pop your email in and I&apos;ll unlock it here.</p>
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
              Paste this into ChatGPT with one of your own selfies attached. It keeps your face.
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
          </div>
        )}

        <div className="sp-vault">
          <p className="sp-vault-eyebrow">WANT THE REST?</p>
          <h2>This is 1 of {vaultCount}.</h2>
          <p>
            That&apos;s one shoot. The Vault is every shoot world I&apos;ve built, in one place, so
            one selfie becomes shoot after shoot, anytime your brand needs to show up. New drops
            added all the time. $27, one time, yours for good.
          </p>
          <Link
            href={checkoutHref}
            onClick={() => {
              trackAnalyticsEvent({
                event: "ai_prompts_prompt_vault_click",
                properties: {
                  source: "single-prompt-page",
                  prompt_id: promptId,
                  prompt_title: promptTitle,
                  prompt_number: promptNumber,
                },
              })
            }}
          >
            See what&apos;s inside the Vault
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
