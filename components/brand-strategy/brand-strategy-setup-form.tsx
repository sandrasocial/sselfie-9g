"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({ subsets: ["latin"], weight: ["300"] })
const inter = Inter({ subsets: ["latin"], weight: ["300", "500"] })

const BRAND_VIBE_OPTIONS = [
  { value: "warm", label: "Warm & approachable" },
  { value: "bold", label: "Bold & direct" },
  { value: "minimalist", label: "Clean & minimal" },
  { value: "editorial", label: "Editorial & refined" },
]

interface Props {
  setupToken: string
  email: string
  displayName: string
}

export default function BrandStrategySetupForm({ setupToken, email, displayName }: Props) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    name: displayName || "",
    businessType: "",
    targetAudience: "",
    transformationStory: "",
    brandVibe: "warm",
  })

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim() || !form.businessType.trim() || !form.targetAudience.trim()) {
      setError("Please fill in your name, business type, and target audience.")
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/brand-strategy/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          setupToken,
          name: form.name.trim(),
          businessType: form.businessType.trim(),
          targetAudience: form.targetAudience.trim(),
          transformationStory: form.transformationStory.trim() || undefined,
          brandVibe: form.brandVibe,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to generate strategy. Please try again.")
      }

      const { accessToken } = await res.json()
      router.push(`/strategy/${accessToken}`)
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <main className={`setup-page ${inter.className}`}>
      <header className="setup-header">
        <a href="https://sselfie.ai" className={`setup-logo ${cormorant.className}`}>
          SSELFIE
        </a>
        <span className="setup-header-label">BRAND STRATEGY SETUP</span>
      </header>

      <div className="setup-container">
        <div className="setup-intro">
          <p className="setup-eyebrow">STEP 1 OF 1</p>
          <h1 className={`setup-title ${cormorant.className}`}>Tell Maya about your brand</h1>
          <p className="setup-subtitle">
            Four questions. Two minutes. Your strategy will be ready the moment you submit.
          </p>
          {email && (
            <p className="setup-email-note">Building strategy for: {email}</p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="setup-form">
          <div className="form-field">
            <label className="form-label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              className="form-input"
              placeholder="Sandra"
              value={form.name}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="businessType">
              What do you do? <span className="form-label-hint">(your business in one sentence)</span>
            </label>
            <input
              id="businessType"
              name="businessType"
              type="text"
              className="form-input"
              placeholder="I'm a personal stylist helping professional women dress with confidence"
              value={form.businessType}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="targetAudience">
              Who is your ideal audience?
            </label>
            <input
              id="targetAudience"
              name="targetAudience"
              type="text"
              className="form-input"
              placeholder="Women 30–50 in corporate jobs who feel stuck in their wardrobe"
              value={form.targetAudience}
              onChange={handleChange}
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="transformationStory">
              What transformation do you create?{" "}
              <span className="form-label-hint">(optional — makes the strategy richer)</span>
            </label>
            <textarea
              id="transformationStory"
              name="transformationStory"
              className="form-textarea"
              placeholder="I help women go from feeling invisible in their wardrobe to walking into a room with presence"
              value={form.transformationStory}
              onChange={handleChange}
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div className="form-field">
            <label className="form-label" htmlFor="brandVibe">
              What&apos;s your brand vibe?
            </label>
            <select
              id="brandVibe"
              name="brandVibe"
              className="form-select"
              value={form.brandVibe}
              onChange={handleChange}
              disabled={isLoading}
            >
              {BRAND_VIBE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="form-submit" disabled={isLoading}>
            {isLoading ? "MAYA IS BUILDING YOUR STRATEGY…" : "BUILD MY STRATEGY →"}
          </button>

          {isLoading && (
            <p className="form-loading-note">
              This usually takes 30–60 seconds. Please don&apos;t close this tab.
            </p>
          )}
        </form>
      </div>

      <style jsx>{`
        .setup-page {
          background: #0d0c0b;
          color: #f0ede8;
          min-height: 100vh;
        }
        .setup-header {
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
        .setup-logo {
          font-weight: 300;
          font-size: 17px;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          color: #f0ede8;
          text-decoration: none;
        }
        .setup-header-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          color: #8a8780;
        }
        .setup-container {
          max-width: 600px;
          margin: 0 auto;
          padding: 72px 24px 80px;
        }
        .setup-intro {
          margin-bottom: 48px;
        }
        .setup-eyebrow {
          margin: 0 0 16px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          color: #8a8780;
        }
        .setup-title {
          margin: 0 0 14px;
          font-size: clamp(36px, 6vw, 54px);
          font-weight: 300;
          line-height: 1.05;
          letter-spacing: 0.02em;
          color: #f0ede8;
        }
        .setup-subtitle {
          margin: 0 0 10px;
          font-size: 15px;
          line-height: 1.7;
          color: #a8a49c;
          font-weight: 300;
        }
        .setup-email-note {
          margin: 0;
          font-size: 12px;
          color: #6b6762;
          letter-spacing: 0.04em;
        }
        .setup-form {
          display: flex;
          flex-direction: column;
          gap: 28px;
        }
        .form-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .form-label {
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: #c3beb6;
        }
        .form-label-hint {
          text-transform: none;
          letter-spacing: 0;
          font-weight: 300;
          color: #6b6762;
          font-size: 11px;
        }
        .form-input,
        .form-textarea,
        .form-select {
          background: #1c1b19;
          border: 1px solid rgba(195, 190, 182, 0.18);
          border-radius: 4px;
          padding: 14px 16px;
          font-size: 14px;
          font-weight: 300;
          color: #f0ede8;
          outline: none;
          transition: border-color 0.15s;
          font-family: inherit;
          width: 100%;
          box-sizing: border-box;
        }
        .form-input:focus,
        .form-textarea:focus,
        .form-select:focus {
          border-color: rgba(195, 190, 182, 0.45);
        }
        .form-input::placeholder,
        .form-textarea::placeholder {
          color: #6b6762;
        }
        .form-textarea {
          resize: vertical;
          min-height: 80px;
        }
        .form-select option {
          background: #1c1b19;
        }
        .form-error {
          margin: 0;
          font-size: 13px;
          color: #e87070;
          font-weight: 300;
        }
        .form-submit {
          background: #f0ede8;
          color: #0d0c0b;
          border: none;
          padding: 18px 32px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.2em;
          text-transform: uppercase;
          border-radius: 2px;
          cursor: pointer;
          transition: opacity 0.15s;
          font-family: inherit;
        }
        .form-submit:hover:not(:disabled) {
          opacity: 0.88;
        }
        .form-submit:disabled {
          opacity: 0.55;
          cursor: not-allowed;
        }
        .form-loading-note {
          margin: 0;
          font-size: 12px;
          color: #6b6762;
          text-align: center;
          font-weight: 300;
        }
        @media (max-width: 600px) {
          .setup-header {
            padding: 20px 20px;
          }
          .setup-container {
            padding: 48px 20px 64px;
          }
        }
      `}</style>
    </main>
  )
}
