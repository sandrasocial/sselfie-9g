"use client"

import { Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"

function SkoolSetupContent() {
  const searchParams = useSearchParams()
  const [error, setError] = useState("")

  useEffect(() => {
    const membershipKey = searchParams.get("membership") || ""
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""))
    const token = fragment.get("token") || ""

    // Remove the bearer credential from the visible address bar immediately.
    if (window.location.hash) {
      window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`)
    }

    if (!membershipKey || !token) {
      setError("This setup link is incomplete. Please use the link from your SSELFIE email.")
      return
    }

    let active = true
    void fetch("/api/auth/skool-setup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ membershipKey, token }),
      cache: "no-store",
    })
      .then(async response => {
        const data = await response.json().catch(() => ({})) as {
          redirectUrl?: string
          error?: string
        }
        if (!response.ok || !data.redirectUrl) {
          throw new Error(data.error || "We could not start account setup.")
        }
        if (active) window.location.replace(data.redirectUrl)
      })
      .catch(cause => {
        if (active) {
          setError(
            cause instanceof Error
              ? cause.message
              : "We could not start account setup. Please try the link again.",
          )
        }
      })

    return () => {
      active = false
    }
  }, [searchParams])

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        background: "var(--ss-brand-paper, #ffffff)",
        color: "var(--ss-brand-obsidian, #0d0e10)",
        padding: "24px",
      }}
    >
      <div style={{ width: "100%", maxWidth: "480px", textAlign: "center" }}>
        <p
          style={{
            margin: "0 0 12px",
            fontFamily: "var(--ss-brand-sans, Manrope, Inter, sans-serif)",
            fontSize: "10px",
            letterSpacing: "0.42em",
            textTransform: "uppercase",
            color: "var(--ss-brand-steel, #6f7377)",
          }}
        >
          SSELFIE
        </p>
        <h1
          style={{
            margin: "0 0 14px",
            fontFamily: "'Cormorant Garamond', Georgia, serif",
            fontSize: "clamp(34px, 7vw, 52px)",
            lineHeight: 1.02,
            fontWeight: 300,
          }}
        >
          {error ? "We need a fresh setup link" : "Opening your SSELFIE account"}
        </h1>
        <p
          style={{
            margin: 0,
            fontFamily: "var(--ss-brand-sans, Manrope, Inter, sans-serif)",
            fontSize: "15px",
            lineHeight: 1.7,
            color: "var(--ss-brand-slate, #55595d)",
          }}
        >
          {error || "Your Skool membership is being verified, then we’ll take you straight to password setup."}
        </p>
        {error ? (
          <a
            href="mailto:hello@sselfie.ai"
            style={{
              display: "inline-block",
              marginTop: "24px",
              padding: "14px 22px",
              background: "var(--ss-brand-obsidian, #0d0e10)",
              color: "#ffffff",
              fontFamily: "Arial, Helvetica, sans-serif",
              fontSize: "12px",
              letterSpacing: "0.08em",
              textDecoration: "none",
            }}
          >
            CONTACT SSELFIE →
          </a>
        ) : null}
      </div>
    </main>
  )
}

export default function SkoolSetupPage() {
  return (
    <Suspense fallback={null}>
      <SkoolSetupContent />
    </Suspense>
  )
}
