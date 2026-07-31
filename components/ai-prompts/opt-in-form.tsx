"use client"

import { useState } from "react"

function getAttributionParams(): Record<string, string> {
  if (typeof window === "undefined") return {}
  const p = new URLSearchParams(window.location.search)
  const result: Record<string, string> = {}
  const keys = [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_content",
    "checkout_source",
    "cta_keyword",
    "entry_post_slug",
  ]
  for (const key of keys) {
    const value = p.get(key)
    if (value) result[key] = value
  }
  result.landing_path = `${window.location.pathname}${window.location.search}`
  if (document.referrer) result.referrer = document.referrer
  return result
}

export function OptInForm() {
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [accessUrl, setAccessUrl] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus("loading")

    const form = e.currentTarget
    const data = new FormData(form)
    const firstName = String(data.get("firstName") || "").trim()
    const email = String(data.get("email") || "").trim()

    if (!firstName || !email) {
      setStatus("error")
      return
    }

    try {
      const res = await fetch("/api/ai-prompts/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, email, ...getAttributionParams() }),
      })

      if (!res.ok) {
        setStatus("error")
        return
      }

      const json = await res.json()

      if (json.success && json.accessUrl) {
        setAccessUrl(json.accessUrl)
        setStatus("success")
      } else {
        setStatus("error")
      }
    } catch {
      setStatus("error")
    }
  }

  if (status === "success") {
    return (
      <div className="opt-confirmation">
        <p className="opt-confirmation-text">It is on its way. Check your inbox.</p>
        {accessUrl && (
          <a href={accessUrl} className="opt-open-btn">
            Open your shoot preview
          </a>
        )}
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="opt-form" noValidate>
      <p className="opt-form-header">Where should I send your free prompts?</p>
      <div className="opt-fields">
        <div className="opt-field">
          <label htmlFor="ai-firstName" className="opt-label">
            First name
          </label>
          <input
            id="ai-firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="opt-input"
            placeholder="First name"
            required
            disabled={status === "loading"}
          />
        </div>
        <div className="opt-field">
          <label htmlFor="ai-email" className="opt-label">
            Email address
          </label>
          <input
            id="ai-email"
            name="email"
            type="email"
            autoComplete="email"
            className="opt-input"
            placeholder="Email address"
            required
            disabled={status === "loading"}
          />
        </div>
      </div>
      <button type="submit" className="opt-submit" disabled={status === "loading"}>
        {status === "loading" ? "Sending..." : "Send me the free prompts"}
      </button>
      {status === "error" && (
        <p className="opt-error">Something went wrong. Try again or email hello@sselfie.ai</p>
      )}
      <p className="opt-trust">
        You’ll also receive simple instructions showing you exactly how to use them. Unsubscribe
        anytime.
      </p>
    </form>
  )
}
