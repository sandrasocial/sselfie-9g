"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

const HERO_IMAGE = "/images/selfie-guide/window-editorial-portrait.jpg"

export default function SelfieGuideLanding() {
  const router = useRouter()
  const [accessToken, setAccessToken] = useState("")
  const [tokenError, setTokenError] = useState<string | null>(null)

  const handleAccessTokenSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const normalized = accessToken.trim()
    if (!normalized) {
      setTokenError("Paste your guide token to continue.")
      return
    }

    setTokenError(null)
    router.push(`/selfie-guide/access/${encodeURIComponent(normalized)}`)
  }

  return (
    <main className={`min-h-screen bg-[#0d0c0b] text-[#f0ede8] ${inter.className}`}>
      <section className="relative overflow-hidden border-b border-[rgba(195,190,182,0.16)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(240,237,232,0.08),transparent_48%)]" />
        <div className="relative mx-auto grid min-h-[100svh] max-w-[1600px] lg:grid-cols-[1.02fr_0.98fr]">
          <div className="flex flex-col justify-between px-6 pb-10 pt-6 sm:px-10 sm:pb-14 sm:pt-8 lg:px-14 lg:pb-16 lg:pt-10">
            <div className="flex items-center justify-between gap-4">
              <Link
                href="https://sselfie.ai"
                className={`${cormorant.className} text-[30px] font-light uppercase tracking-[0.28em] text-[#f0ede8]`}
              >
                SSELFIE
              </Link>
              <p className="text-[10px] uppercase tracking-[0.4em] text-[#8a8780]">Guide Preview</p>
            </div>

            <div className="max-w-[640px] py-14 sm:py-16 lg:py-20">
              <p className="text-[11px] uppercase tracking-[0.42em] text-[#a8a49c]">Selfie Guide · 2026 Edition</p>
              <h1
                className={`${cormorant.className} mt-5 max-w-[12ch] text-[clamp(52px,8vw,110px)] font-light uppercase leading-[0.9] tracking-[0.05em] text-[#f0ede8]`}
              >
                One guide. Better selfies. Clearer content.
              </h1>
              <p className="mt-6 max-w-[31ch] text-[18px] font-light leading-8 text-[rgba(240,237,232,0.78)] sm:text-[20px]">
                The paid guide, the better typography, the stronger image direction, and the next step into Brand
                Strategy are now one clean flow.
              </p>

              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[28px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.08)] p-6 backdrop-blur-[30px]">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780]">Guide only</p>
                  <p className={`${cormorant.className} mt-3 text-[34px] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
                    $17
                  </p>
                  <p className="mt-3 text-sm font-light leading-7 text-[rgba(240,237,232,0.74)]">
                    Full course access and the 7-day challenge.
                  </p>
                  <Link
                    href="/selfie-guide"
                    className="mt-6 inline-flex min-h-[50px] w-full items-center justify-center rounded-full border border-[rgba(240,237,232,0.16)] px-6 text-[11px] font-medium uppercase tracking-[0.26em] text-[#f0ede8] transition hover:border-[rgba(240,237,232,0.42)] hover:bg-[rgba(240,237,232,0.06)]"
                  >
                    Get the free guide
                  </Link>
                </div>

                <div className="rounded-[28px] border border-[rgba(240,237,232,0.24)] bg-[linear-gradient(180deg,rgba(240,237,232,0.14),rgba(175,170,162,0.08))] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.28)] backdrop-blur-[30px]">
                  <p className="text-[10px] uppercase tracking-[0.34em] text-[#8a8780]">Next step</p>
                  <p className={`${cormorant.className} mt-3 text-[34px] font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
                    $19
                  </p>
                  <p className="mt-3 text-sm font-light leading-7 text-[rgba(240,237,232,0.8)]">
                    Add the Brand Strategy Pack when you want the message and content direction behind the visuals.
                  </p>
                  <Link
                    href="/masterclass"
                    className="mt-6 inline-flex min-h-[50px] w-full items-center justify-center rounded-full bg-[#f0ede8] px-6 text-[11px] font-medium uppercase tracking-[0.26em] text-[#0d0c0b] transition hover:bg-white"
                  >
                    See the Masterclass
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-4 border-t border-[rgba(195,190,182,0.14)] pt-6 text-sm font-light leading-6 text-[#a8a49c] sm:grid-cols-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Read</p>
                <p className="mt-2">Move chapter by chapter through Sandra&apos;s actual selfie framework.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Practice</p>
                <p className="mt-2">Use the challenge cards and image references while you shoot.</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Build</p>
                <p className="mt-2">Take the bundle if you want the strategy behind the visuals at the same time.</p>
              </div>
            </div>
          </div>

          <div className="relative min-h-[420px] border-t border-[rgba(195,190,182,0.14)] lg:min-h-full lg:border-l lg:border-t-0">
            <Image
              src={HERO_IMAGE}
              alt="Sandra beside the window in editorial black styling"
              fill
              priority
              sizes="(max-width: 1024px) 100vw, 48vw"
              className="object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0d0c0b] via-transparent to-transparent lg:bg-gradient-to-l lg:from-transparent lg:via-transparent lg:to-[#0d0c0b]/24" />

            <div className="absolute bottom-0 left-0 right-0 p-6 sm:p-8">
              <form
                onSubmit={handleAccessTokenSubmit}
                className="max-w-[420px] rounded-[26px] border border-[rgba(240,237,232,0.16)] bg-[rgba(13,12,11,0.56)] p-5 backdrop-blur-xl"
              >
                <p className="text-[10px] uppercase tracking-[0.32em] text-[#a8a49c]">Already bought?</p>
                <p className={`${cormorant.className} mt-3 text-3xl font-light uppercase tracking-[0.08em] text-[#f0ede8]`}>
                  Open your guide
                </p>
                <p className="mt-3 text-sm font-light leading-6 text-[rgba(240,237,232,0.78)]">
                  Paste your access token and jump straight back into the course.
                </p>

                <div className="mt-5 grid gap-3">
                  <input
                    value={accessToken}
                    onChange={(event) => setAccessToken(event.target.value)}
                    placeholder="Paste token"
                    aria-label="Access token"
                    className="min-h-[48px] rounded-full border border-[rgba(240,237,232,0.16)] bg-[rgba(240,237,232,0.04)] px-5 text-sm font-light text-[#f0ede8] outline-none transition placeholder:text-[#8a8780] focus:border-[rgba(240,237,232,0.34)]"
                  />
                  <button
                    type="submit"
                    className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-[#f0ede8] px-6 text-[11px] font-medium uppercase tracking-[0.26em] text-[#0d0c0b] transition hover:bg-white"
                  >
                    Open guide
                  </button>
                </div>

                {tokenError ? <p className="mt-3 text-sm text-[#fca5a5]">{tokenError}</p> : null}
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
