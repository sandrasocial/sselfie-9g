"use client"

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
    <main className={`freebie-form-page ${inter.className}`}>
      <div className="freebie-form-wrap">
        <p className="header-label">FREE BRAND STRATEGY</p>
        <h1 className={`headline ${cormorant.className}`}>YOUR BRAND STRATEGY — BY MAYA</h1>
        <p className="subheading">
          Answer 5 quick questions. Maya will build you a personalised brand strategy — your positioning, content
          pillars, voice guide and caption starters. Free. No login.
        </p>

        <form onSubmit={handleSubmit} className="form-shell">
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
            placeholder="e.g. female entrepreneurs 30-45 who want to build their brand online"
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
            placeholder="What's your why? What changed for you? What do you help people overcome? (optional but makes the strategy MUCH better)"
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

          <button type="submit" disabled={loading}>
            {loading ? (
              <span className="loading-wrap">
                <span className="spinner" aria-hidden="true" />
                <span>MAYA IS THINKING...</span>
              </span>
            ) : (
              "GET MY STRATEGY →"
            )}
          </button>
        </form>

        <p className="form-note">No spam. Just your strategy. Unsubscribe any time.</p>
      </div>

      <style jsx>{`
        .freebie-form-page {
          min-height: 100vh;
          background: #0a0a0a;
          color: rgba(255, 255, 255, 0.75);
          padding: 64px 48px;
          display: flex;
          justify-content: center;
        }

        .freebie-form-wrap {
          width: 100%;
          max-width: 760px;
        }

        .header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 24px;
        }

        .headline {
          margin: 0;
          font-size: clamp(42px, 7vw, 56px);
          font-weight: 300;
          line-height: 1.02;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          color: #ffffff;
        }

        .subheading {
          margin: 22px 0 0;
          font-size: 16px;
          line-height: 1.8;
          max-width: 680px;
        }

        .form-shell {
          margin-top: 40px;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.02);
          padding: 32px;
          display: grid;
          gap: 16px;
        }

        .field-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.34em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.5);
        }

        input,
        textarea {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          padding: 14px 15px;
          font-size: 15px;
          font-family: inherit;
          line-height: 1.6;
          outline: none;
          transition: border-color 0.16s ease;
          resize: vertical;
        }

        input::placeholder,
        textarea::placeholder {
          color: rgba(255, 255, 255, 0.44);
        }

        input:focus,
        textarea:focus {
          border-color: rgba(255, 255, 255, 0.24);
        }

        fieldset {
          border: none;
          margin: 4px 0 0;
          padding: 0;
        }

        .vibe-grid {
          margin-top: 12px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 10px;
        }

        .vibe-pill {
          border: 1px solid rgba(255, 255, 255, 0.09);
          background: rgba(255, 255, 255, 0.04);
          color: rgba(255, 255, 255, 0.75);
          padding: 12px 14px;
          cursor: pointer;
          font-size: 14px;
          line-height: 1.4;
          transition: border-color 0.16s ease, background 0.16s ease;
        }

        .vibe-pill input {
          display: none;
        }

        .vibe-pill.selected {
          border-color: rgba(255, 255, 255, 0.26);
          background: rgba(255, 255, 255, 0.09);
          color: #ffffff;
        }

        .error-msg {
          margin: 2px 0 2px;
          color: #ff9898;
          font-size: 14px;
        }

        button {
          margin-top: 6px;
          background: #ffffff;
          color: #0a0a0a;
          border: none;
          padding: 15px 18px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: background 0.16s ease;
        }

        button:hover:enabled {
          background: #e5e5e5;
        }

        button:disabled {
          cursor: default;
          opacity: 0.84;
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
          border: 2px solid rgba(10, 10, 10, 0.25);
          border-top-color: rgba(10, 10, 10, 1);
          animation: spin 0.8s linear infinite;
        }

        .form-note {
          margin-top: 16px;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 700px) {
          .freebie-form-page {
            padding: 42px 24px;
          }

          .form-shell {
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
