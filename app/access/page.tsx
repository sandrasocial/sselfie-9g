"use client"

import { Cormorant_Garamond, Inter } from "next/font/google"
import { FormEvent, useState } from "react"
import Link from "next/link"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

type Status = "idle" | "loading" | "sent" | "error"

export default function AccessRecoveryPage() {
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState<Status>("idle")

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    const trimmed = email.trim()
    if (!trimmed || !trimmed.includes("@")) return

    setStatus("loading")

    try {
      await fetch("/api/access-recovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      })
      // Always show "sent" - API never reveals whether email existed
      setStatus("sent")
    } catch {
      setStatus("error")
    }
  }

  return (
    <main className={`min-h-screen bg-[#0d0c0b] text-[#f0ede8] ${inter.className}`}>
      <div className="mx-auto max-w-[480px] px-6 py-16 sm:py-24">
        {/* Logo */}
        <div className="mb-12">
          <Link
            href="https://sselfie.ai"
            className={`${cormorant.className} text-[26px] font-light uppercase tracking-[0.28em] text-[#f0ede8]`}
          >
            SSELFIE
          </Link>
        </div>

        {status === "sent" ? (
          <div className="space-y-6">
            <p className="text-[10px] uppercase tracking-[0.42em] text-[#a8a49c]">Access Recovery</p>
            <h1
              className={`${cormorant.className} text-[clamp(40px,8vw,64px)] font-light uppercase leading-[0.92] tracking-[0.04em] text-[#f0ede8]`}
            >
              Check your inbox
            </h1>
            <p className="text-[15px] font-light leading-7 text-[rgba(240,237,232,0.74)]">
              If that email has a purchase on file, we just sent you the access links. Check your inbox
              and spam folder - it arrives within a minute.
            </p>
            <p className="text-[13px] font-light leading-6 text-[#8a8780]">
              Still stuck?{" "}
              <a
                href="mailto:support@sselfie.ai?subject=Access%20recovery%20help"
                className="underline text-[#a8a49c] hover:text-[#f0ede8] transition-colors"
              >
                Email support@sselfie.ai
              </a>{" "}
              and we&apos;ll sort it.
            </p>
            <button
              onClick={() => {
                setStatus("idle")
                setEmail("")
              }}
              className="text-[11px] font-medium uppercase tracking-[0.26em] text-[#8a8780] underline underline-offset-4 hover:text-[#f0ede8] transition-colors"
            >
              Try a different email
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="space-y-4">
              <p className="text-[10px] uppercase tracking-[0.42em] text-[#a8a49c]">Access Recovery</p>
              <h1
                className={`${cormorant.className} text-[clamp(40px,8vw,64px)] font-light uppercase leading-[0.92] tracking-[0.04em] text-[#f0ede8]`}
              >
                Recover your access
              </h1>
              <p className="text-[15px] font-light leading-7 text-[rgba(240,237,232,0.74)]">
                Enter the email you used to purchase. We&apos;ll send your access links - presets,
                guide, and everything else - straight to your inbox.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label
                  htmlFor="email"
                  className="block text-[10px] uppercase tracking-[0.34em] text-[#8a8780]"
                >
                  Purchase email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  autoComplete="email"
                  className="w-full min-h-[52px] rounded-full border border-[rgba(240,237,232,0.16)] bg-[rgba(240,237,232,0.04)] px-5 text-[15px] font-light text-[#f0ede8] outline-none transition placeholder:text-[#8a8780] focus:border-[rgba(240,237,232,0.34)]"
                />
              </div>

              {status === "error" && (
                <p className="text-[13px] text-[#fca5a5]">
                  Something went wrong. Please try again or email{" "}
                  <a href="mailto:support@sselfie.ai" className="underline">
                    support@sselfie.ai
                  </a>
                  .
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full min-h-[52px] rounded-full bg-[#f0ede8] px-6 text-[11px] font-medium uppercase tracking-[0.26em] text-[#0d0c0b] transition hover:bg-white disabled:opacity-60"
              >
                {status === "loading" ? "Sending..." : "Send my access links"}
              </button>
            </form>

            <div className="border-t border-[rgba(195,190,182,0.14)] pt-6 space-y-3">
              <p className="text-[11px] uppercase tracking-[0.3em] text-[#8a8780]">
                Or go straight to
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/starter-kit"
                  className="inline-flex items-center rounded-full border border-[rgba(240,237,232,0.14)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#a8a49c] transition hover:border-[rgba(240,237,232,0.32)] hover:text-[#f0ede8]"
                >
                  Starter Kit
                </Link>
                <Link
                  href="/selfie-guide"
                  className="inline-flex items-center rounded-full border border-[rgba(240,237,232,0.14)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#a8a49c] transition hover:border-[rgba(240,237,232,0.32)] hover:text-[#f0ede8]"
                >
                  Selfie Guide
                </Link>
                <Link
                  href="/auth/login"
                  className="inline-flex items-center rounded-full border border-[rgba(240,237,232,0.14)] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.24em] text-[#a8a49c] transition hover:border-[rgba(240,237,232,0.32)] hover:text-[#f0ede8]"
                >
                  Sign in
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}
