"use client"

import Image from "next/image"
import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "500"],
})

type BrandVibe = "warm" | "bold" | "minimal" | "playful" | "soft"

const VIBE_OPTIONS: Array<{ value: BrandVibe; label: string }> = [
  { value: "warm", label: "Warm & Real" },
  { value: "bold", label: "Bold & Edgy" },
  { value: "minimal", label: "Minimal & Refined" },
  { value: "playful", label: "Playful & Fun" },
  { value: "soft", label: "Soft & Feminine" },
]

export default function FreebieBrandStrategyPage() {
  const router = useRouter()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [businessType, setBusinessType] = useState("")
  const [targetAudience, setTargetAudience] = useState("")
  const [transformationStory, setTransformationStory] = useState("")
  const [brandVibe, setBrandVibe] = useState<BrandVibe>("warm")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (loading) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/freebie/brand-strategy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          business_type: businessType,
          target_audience: targetAudience,
          transformation_story: transformationStory,
          brand_vibe: brandVibe,
        }),
      })

      const data = await response.json().catch(() => ({}))

      if (!response.ok) {
        throw new Error(data?.error || "Failed to generate your strategy")
      }

      if (!data?.accessToken) {
        throw new Error("Missing access token in response")
      }

      router.push(`/strategy/${data.accessToken}`)
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Something went wrong. Please try again.")
      setLoading(false)
    }
  }

  return (
    <main className={`freebie-page ${inter.className}`}>
      <header className="site-header">
        <a href="https://sselfie.ai" className={`logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="header-label">FREEBIE · BRAND STRATEGY</span>
      </header>

      <section className="hero">
        <div className="hero-bg-wrap">
          <Image src="/assets/brand-strategy/hero.png" alt="Hero background" fill priority sizes="100vw" className="hero-bg" />
        </div>
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-eyebrow">MAYA FREEBIE</p>
          <h1 className={`hero-title ${cormorant.className}`}>YOUR FREE BRAND STRATEGY</h1>
          <p className="hero-copy">
            Answer a few quick questions and Maya will create your positioning, content pillars, voice guide, and
            caption starters.
          </p>
        </div>
      </section>

      <section className="section">
        <p className="section-label">01 — TELL MAYA ABOUT YOUR BRAND</p>

        <div className="form-split">
          <div className="intro-panel">
            <div className="intro-image-wrap">
              <Image src="/assets/brand-strategy/journals.png" alt="Journals" fill sizes="(max-width: 700px) 100vw, 40vw" className="cover-image" />
            </div>
            <div className="intro-body">
              <p className="intro-eyebrow">WHAT YOU GET</p>
              <h2 className={`intro-heading ${cormorant.className}`}>A complete, personalized strategy in minutes.</h2>
              <ul className="intro-list">
                <li>Positioning statement options</li>
                <li>Content pillars with post ideas</li>
                <li>Voice and messaging direction</li>
                <li>Caption starters and example posts</li>
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
              placeholder="Your first name"
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

            <label className="field-label" htmlFor="business_type">
              What do you do?
            </label>
            <input
              id="business_type"
              name="business_type"
              type="text"
              value={businessType}
              onChange={(event) => setBusinessType(event.target.value)}
              placeholder="e.g. business coach, photographer, virtual assistant"
              required
            />

            <label className="field-label" htmlFor="target_audience">
              Who is your audience?
            </label>
            <textarea
              id="target_audience"
              name="target_audience"
              rows={2}
              value={targetAudience}
              onChange={(event) => setTargetAudience(event.target.value)}
              placeholder="e.g. female entrepreneurs 30-45 building their brand online"
              required
            />

            <label className="field-label" htmlFor="transformation_story">
              Your story (optional)
            </label>
            <textarea
              id="transformation_story"
              name="transformation_story"
              rows={3}
              value={transformationStory}
              onChange={(event) => setTransformationStory(event.target.value)}
              placeholder="What changed for you, and what do you help people overcome?"
            />

            <fieldset>
              <legend className="field-label">Brand vibe</legend>
              <div className="vibe-grid">
                {VIBE_OPTIONS.map((option) => (
                  <label key={option.value} className={`vibe-pill ${brandVibe === option.value ? "selected" : ""}`}>
                    <input
                      type="radio"
                      name="brand_vibe"
                      value={option.value}
                      checked={brandVibe === option.value}
                      onChange={() => setBrandVibe(option.value)}
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            {error ? <p className="error-msg">{error}</p> : null}

            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="loading-wrap">
                  <span className="spinner" aria-hidden="true" />
                  <span>MAYA IS THINKING...</span>
                </span>
              ) : (
                "GET MY STRATEGY →"
              )}
            </button>

            <p className="form-note">No spam. Just your strategy. Unsubscribe any time.</p>
          </form>
        </div>
      </section>

      <footer className="footer">
        <span className="footer-note">© 2026 SSELFIE Studio · sselfie.ai</span>
      </footer>

      <style jsx>{`
        .freebie-page {
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
          object-position: center 30%;
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

        .form-split {
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
          min-height: 100%;
        }

        .intro-image-wrap {
          position: relative;
          min-height: 280px;
          overflow: hidden;
          border-bottom: 1px solid rgba(195, 190, 182, 0.25);
        }

        .cover-image {
          object-fit: cover;
          object-position: center;
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
        }

        .field-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: #8a8780;
        }

        input,
        textarea {
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
          resize: vertical;
          border-radius: 8px;
        }

        input::placeholder,
        textarea::placeholder {
          color: #8a8780;
        }

        input:focus,
        textarea:focus {
          border-color: rgba(195, 190, 182, 0.5);
        }

        fieldset {
          border: none;
          margin: 2px 0 0;
          padding: 0;
        }

        .vibe-grid {
          margin-top: 10px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .vibe-pill {
          border: 1px solid rgba(195, 190, 182, 0.25);
          background: rgba(175, 170, 162, 0.08);
          color: #8a8780;
          padding: 10px 12px;
          cursor: pointer;
          font-size: 13px;
          line-height: 1.4;
          transition: border-color 0.16s ease, background 0.16s ease;
          border-radius: 8px;
        }

        .vibe-pill input {
          display: none;
        }

        .vibe-pill.selected {
          border-color: #a8a49c;
          background: rgba(168, 164, 156, 0.15);
          color: #f0ede8;
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
          .form-split {
            grid-template-columns: 1fr;
          }

          .intro-panel {
            border-right: none;
            border-bottom: 1px solid rgba(195, 190, 182, 0.25);
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

          .vibe-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </main>
  )
}
