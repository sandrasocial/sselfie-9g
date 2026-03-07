"use client"

import Image from "next/image"
import { useRouter } from "next/navigation"
import { FormEvent, useState } from "react"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

const SELFIE_GUIDE_CAPTURE_IMAGE_URL =
  "https://kcnmiu7u3eszdkja.public.blob.vercel-storage.com/maya-pro-generations/6vc2ty3vndrmr0cwr8r9p1rd6w-z3vkF7lRWhn2aoxEQRyAZoVkBfOGOL.png"

export default function SelfieGuideLanding() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [accessToken, setAccessToken] = useState("")
  const [tokenError, setTokenError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) return

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/freebie/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          source: "selfie-guide",
          utm_source: new URLSearchParams(window.location.search).get("utm_source"),
          utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      })

      const data = await response.json().catch(() => ({}))
      if (!response.ok) {
        throw new Error(data?.error || "Failed to unlock your guide")
      }

      const accessToken = data?.accessToken || data?.access_token
      if (!accessToken) {
        throw new Error("Missing access token in response")
      }

      router.push(`/selfie-guide/access/${accessToken}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  const handleAccessTokenSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const normalized = accessToken.trim()
    if (!normalized) {
      setTokenError("Enter your guide token to continue.")
      return
    }

    setTokenError(null)
    router.push(`/selfie-guide/access/${encodeURIComponent(normalized)}`)
  }

  return (
    <main className={`selfie-guide-page ${inter.className}`}>
      <header className="site-header">
        <a href="https://sselfie.ai" className={`logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="header-label">FREEBIE · SELFIE GUIDE</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image src="/assets/brand-strategy/hero.png" alt="Hero background" fill priority sizes="100vw" className="hero-bg" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">FREE GUIDE</p>
          <h1 className={`hero-title ${cormorant.className}`}>BECOME A SELFIE QUEEN</h1>
          <p className="hero-copy">
            Learn the exact selfie framework Sandra uses to create confident brand photos with just your phone and
            natural light.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — GET INSTANT ACCESS</p>

        <div className="capture-split">
          <div className="intro-panel">
            <div className="intro-image-wrap">
              <Image
                src={SELFIE_GUIDE_CAPTURE_IMAGE_URL}
                alt="Portrait"
                fill
                sizes="(max-width: 700px) 100vw, 40vw"
                className="cover-image"
              />
            </div>
            <div className="intro-body">
              <p className="intro-eyebrow">WHAT'S INSIDE</p>
              <h2 className={`intro-heading ${cormorant.className}`}>6 core chapters to elevate your selfie content.</h2>
              <ul className="intro-list">
                <li>Lighting setups that flatter every face</li>
                <li>Camera angles and pose formulas</li>
                <li>Natural expressions that look confident</li>
                <li>Simple editing workflow for polished results</li>
                <li>How to build a reusable content library</li>
              </ul>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-panel">
            <label className="field-label" htmlFor="name">
              Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Your name"
              required
              autoComplete="name"
            />

            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="your@email.com"
              required
              autoComplete="email"
            />

            {error ? <p className="error-msg">{error}</p> : null}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="loading-wrap">
                  <span className="spinner" aria-hidden="true" />
                  <span>UNLOCKING...</span>
                </span>
              ) : (
                "GET INSTANT ACCESS →"
              )}
            </button>

            <p className="form-note">Instant access. No spam. Unsubscribe anytime.</p>
          </form>
        </div>
      </section>

      <section className="section section-journey">
        <p className="section-label">02 — WHAT HAPPENS NEXT</p>
        <div className="journey-grid">
          <article className="journey-card">
            <p className="journey-step">STEP 1</p>
            <h3 className={`journey-title ${cormorant.className}`}>Learn the selfie system</h3>
            <p className="journey-copy">Follow the interactive chapter flow and apply each lesson in real time.</p>
          </article>
          <article className="journey-card">
            <p className="journey-step">STEP 2</p>
            <h3 className={`journey-title ${cormorant.className}`}>Unlock your brand strategy</h3>
            <p className="journey-copy">Get the EUR 17 personalized strategy so your selfies become a clear growth engine.</p>
          </article>
          <article className="journey-card">
            <p className="journey-step">STEP 3</p>
            <h3 className={`journey-title ${cormorant.className}`}>Create weekly with Maya</h3>
            <p className="journey-copy">Join membership and generate on-brand content in Studio with Maya.</p>
          </article>
        </div>

        <form className="token-panel" onSubmit={handleAccessTokenSubmit}>
          <p className="token-title">Already have your guide link?</p>
          <div className="token-row">
            <input
              value={accessToken}
              onChange={(event) => setAccessToken(event.target.value)}
              placeholder="Paste token"
              aria-label="Access token"
            />
            <button type="submit" className="btn-token">
              OPEN GUIDE
            </button>
          </div>
          {tokenError ? <p className="error-msg">{tokenError}</p> : null}
        </form>
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style jsx>{`
        .selfie-guide-page {
          background: #0d0c0b;
          color: #f0ede8;
          min-height: 100vh;
        }

        .site-header {
          padding: 28px 48px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid rgba(195, 190, 182, 0.15);
          position: sticky;
          top: 0;
          background: rgba(13, 12, 11, 0.92);
          backdrop-filter: blur(50px);
          z-index: 100;
        }

        .logo {
          font-weight: 300;
          font-size: 17px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #f0ede8;
          text-decoration: none;
        }

        .header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #8a8780;
        }

        .hero {
          position: relative;
          min-height: 72vh;
          display: flex;
          flex-direction: column;
          justify-content: flex-end;
          padding: 80px 56px;
          overflow: hidden;
        }

        .hero-bg-wrap {
          position: absolute;
          inset: 0;
        }

        .hero-bg {
          object-fit: cover;
          object-position: center 26%;
          filter: brightness(0.45);
        }

        .hero-overlay {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            to bottom,
            rgba(13, 12, 11, 0.15) 0%,
            rgba(13, 12, 11, 0.05) 38%,
            rgba(13, 12, 11, 0.72) 74%,
            rgba(13, 12, 11, 1) 100%
          );
        }

        .hero-content {
          position: relative;
          z-index: 2;
          max-width: 900px;
        }

        .hero-eyebrow {
          margin: 0 0 20px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #8a8780;
        }

        .hero-title {
          margin: 0;
          font-weight: 300;
          font-size: clamp(46px, 8vw, 92px);
          line-height: 1;
          letter-spacing: -0.02em;
          text-transform: uppercase;
          color: #f0ede8;
        }

        .hero-copy {
          margin: 24px 0 0;
          font-size: 16px;
          line-height: 1.8;
          color: #8a8780;
          max-width: 680px;
        }

        .section {
          padding: 80px 56px;
          max-width: 1120px;
          margin: 0 auto;
        }

        .section-label {
          margin: 0 0 40px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: #8a8780;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(175, 170, 162, 0.12);
        }

        .capture-split {
          display: grid;
          grid-template-columns: 1fr 1.3fr;
          border: 1px solid rgba(195, 190, 182, 0.25);
          border-radius: 16px;
          overflow: hidden;
        }

        .intro-panel {
          border-right: 1px solid rgba(195, 190, 182, 0.25);
          display: flex;
          flex-direction: column;
        }

        .intro-image-wrap {
          position: relative;
          min-height: 280px;
          overflow: hidden;
          border-bottom: 1px solid rgba(195, 190, 182, 0.25);
        }

        .cover-image {
          object-fit: cover;
          object-position: center top;
        }

        .intro-body {
          background: rgba(175, 170, 162, 0.08);
          padding: 32px 30px;
          flex: 1;
        }

        .intro-eyebrow {
          margin: 0 0 14px;
          font-size: 9px;
          font-weight: 500;
          letter-spacing: 0.45em;
          text-transform: uppercase;
          color: #8a8780;
        }

        .intro-heading {
          margin: 0;
          font-size: clamp(22px, 2.2vw, 30px);
          font-weight: 300;
          line-height: 1.3;
          letter-spacing: -0.01em;
          color: #f0ede8;
        }

        .intro-list {
          list-style: none;
          margin: 18px 0 0;
          padding: 0;
        }

        .intro-list li {
          font-size: 14px;
          color: #8a8780;
          line-height: 1.75;
          padding: 6px 0 6px 18px;
          position: relative;
          border-bottom: 1px solid rgba(175, 170, 162, 0.12);
        }

        .intro-list li:last-child {
          border-bottom: none;
        }

        .intro-list li::before {
          content: "→";
          position: absolute;
          left: 0;
          color: #a8a49c;
        }

        .form-panel {
          background: rgba(175, 170, 162, 0.05);
          padding: 34px 32px 30px;
          display: grid;
          gap: 12px;
          align-content: start;
        }

        .field-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #8a8780;
        }

        input {
          width: 100%;
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.08);
          color: #f0ede8;
          padding: 13px 14px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.6;
          outline: none;
          transition: border-color 0.16s ease;
          border-radius: 8px;
        }

        input::placeholder {
          color: #8a8780;
        }

        input:focus {
          border-color: rgba(195, 190, 182, 0.5);
        }

        .error-msg {
          margin: 2px 0 0;
          color: #fca5a5;
          font-size: 13px;
        }

        .btn-primary {
          margin-top: 8px;
          border: none;
          background: #c8c4bb;
          color: #0d0c0b;
          padding: 16px 18px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.2s;
          border-radius: 9999px;
        }

        .btn-primary:hover:enabled {
          background: #f0ede8;
        }

        .btn-primary:disabled {
          cursor: default;
          opacity: 0.75;
        }

        .loading-wrap {
          display: inline-flex;
          align-items: center;
          gap: 10px;
        }

        .spinner {
          width: 12px;
          height: 12px;
          border-radius: 9999px;
          border: 2px solid rgba(13, 12, 11, 0.25);
          border-top-color: rgba(13, 12, 11, 1);
          animation: spin 0.8s linear infinite;
        }

        .form-note {
          margin: 2px 0 0;
          font-size: 12px;
          color: #8a8780;
        }

        .footer {
          border-top: 1px solid rgba(175, 170, 162, 0.12);
          padding: 30px 24px;
          text-align: center;
        }

        .section-journey {
          padding-top: 24px;
        }

        .journey-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .journey-card {
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.08);
          border-radius: 14px;
          padding: 20px;
        }

        .journey-step {
          margin: 0;
          font-size: 9px;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #8a8780;
        }

        .journey-title {
          margin: 8px 0 6px;
          font-size: 26px;
          line-height: 1.1;
          text-transform: uppercase;
          color: #f0ede8;
          font-weight: 300;
        }

        .journey-copy {
          margin: 0;
          font-size: 14px;
          line-height: 1.7;
          color: #8a8780;
        }

        .token-panel {
          margin-top: 14px;
          border: 1px solid rgba(195, 190, 182, 0.25);
          border-radius: 14px;
          background: rgba(175, 170, 162, 0.06);
          padding: 18px;
        }

        .token-title {
          margin: 0 0 10px;
          font-size: 12px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          color: #8a8780;
        }

        .token-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        .btn-token {
          border: 1px solid rgba(195, 190, 182, 0.28);
          background: rgba(175, 170, 162, 0.16);
          color: #f0ede8;
          padding: 0 16px;
          border-radius: 999px;
          font-size: 10px;
          letter-spacing: 0.22em;
          text-transform: uppercase;
          cursor: pointer;
        }

        .footer-note {
          font-size: 12px;
          color: #8a8780;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 900px) {
          .capture-split {
            grid-template-columns: 1fr;
          }

          .intro-panel {
            border-right: none;
            border-bottom: 1px solid rgba(195, 190, 182, 0.25);
          }

          .journey-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 700px) {
          .site-header {
            padding: 20px 24px;
          }

          .hero {
            min-height: 68vh;
            padding: 48px 28px;
          }

          .section {
            padding: 56px 28px;
          }

          .intro-image-wrap {
            min-height: 220px;
          }

          .intro-body,
          .form-panel {
            padding: 24px;
          }

          .token-row {
            grid-template-columns: 1fr;
          }

          .btn-token {
            min-height: 44px;
          }
        }
      `}</style>
    </main>
  )
}
