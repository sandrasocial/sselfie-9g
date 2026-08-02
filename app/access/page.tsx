"use client"

import { Cormorant_Garamond, Inter } from "next/font/google"
import Image from "next/image"
import { type FormEvent, useState } from "react"
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
    <main className={`min-h-screen bg-brand-porcelain text-stone-dark ${inter.className}`}>
      <section className="mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[0.96fr_1.04fr]">
        <div className="relative order-2 min-h-[38svh] overflow-hidden lg:order-1 lg:min-h-screen">
          <Image
            src="/images/ai-prompts/quiet-luxury-london-shot-2.jpg"
            alt="Editorial SSELFIE portrait"
            fill
            priority
            sizes="(min-width: 1024px) 48vw, 100vw"
            className="object-cover object-center"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          <p className="absolute bottom-6 left-6 text-[10px] font-medium uppercase tracking-[0.3em] text-white/80 sm:bottom-9 sm:left-9">
            Your purchases stay yours
          </p>
        </div>

        <div className="order-1 flex items-center px-6 py-12 sm:px-12 sm:py-16 lg:order-2 lg:px-16 xl:px-24">
          <div className="w-full max-w-xl">
            <Link
              href="https://sselfie.ai"
              className={`${cormorant.className} text-xl font-light uppercase tracking-[0.28em] text-stone-dark`}
            >
              SSELFIE
            </Link>

            {status === "sent" ? (
              <div className="mt-12">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-smoke">
                  Access recovery
                </p>
                <h1
                  className={`${cormorant.className} mt-5 text-[clamp(3.4rem,7vw,6.4rem)] font-light leading-[0.88] tracking-[-0.045em]`}
                >
                  Check your inbox.
                </h1>
                <p className="mt-7 max-w-lg text-[15px] font-light leading-7 text-stone-mid sm:text-base">
                  If that email matches a purchase, your private access links are on their way.
                  Check your spam folder too.
                </p>
                <button
                  onClick={() => {
                    setStatus("idle")
                    setEmail("")
                  }}
                  className="mt-8 min-h-12 rounded-full border border-stone-pale px-7 text-xs font-medium uppercase tracking-[0.14em] text-stone-dark transition hover:bg-white"
                >
                  Try a different email
                </button>
              </div>
            ) : (
              <div className="mt-12">
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-brand-smoke">
                  Access recovery
                </p>
                <h1
                  className={`${cormorant.className} mt-5 text-[clamp(3.4rem,7vw,6.4rem)] font-light leading-[0.88] tracking-[-0.045em]`}
                >
                  Recover your access.
                </h1>
                <p className="mt-7 max-w-lg text-[15px] font-light leading-7 text-stone-mid sm:text-base">
                  Enter the email address you used when you purchased. I&apos;ll send your private
                  access links to your inbox.
                </p>

                <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                  <div className="space-y-2">
                    <label
                      htmlFor="email"
                      className="block text-[10px] font-medium uppercase tracking-[0.26em] text-brand-smoke"
                    >
                      Purchase email
                    </label>
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={event => setEmail(event.target.value)}
                      placeholder="you@example.com"
                      required
                      autoComplete="email"
                      className="min-h-[54px] w-full rounded-full border border-stone-pale bg-white/60 px-5 text-[15px] font-light text-stone-dark outline-none transition placeholder:text-brand-smoke focus:border-stone-accent focus:bg-white"
                    />
                  </div>

                  {status === "error" ? (
                    <p className="text-[13px] text-red-700">
                      Something went wrong. Please try again or email{" "}
                      <a href="mailto:support@sselfie.ai" className="underline underline-offset-4">
                        support@sselfie.ai
                      </a>
                      .
                    </p>
                  ) : null}

                  <button
                    type="submit"
                    disabled={status === "loading"}
                    className="min-h-[54px] w-full rounded-full bg-stone-dark px-6 text-[11px] font-medium uppercase tracking-[0.2em] text-white transition hover:bg-stone-mid disabled:opacity-60"
                  >
                    {status === "loading" ? "Sending..." : "Send my access links"}
                  </button>
                </form>
              </div>
            )}

            <p className="mt-8 border-t border-stone-pale pt-6 text-xs leading-5 text-brand-smoke">
              If you still need help, email{" "}
              <a
                href="mailto:support@sselfie.ai?subject=Access%20recovery%20help"
                className="underline underline-offset-4"
              >
                support@sselfie.ai
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </main>
  )
}
