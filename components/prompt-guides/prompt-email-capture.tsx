"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle } from "lucide-react"
import { trackEvent } from "@/lib/analytics"
import { Cormorant_Garamond, Inter } from "next/font/google"

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300"],
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
})

interface PromptEmailCaptureProps {
  onSuccess: () => void
  onClose: () => void
  emailListTag: string | null
  pageId: number
  guideTitle?: string
}

export default function PromptEmailCapture({
  onSuccess,
  onClose,
  emailListTag,
  pageId,
  guideTitle,
}: PromptEmailCaptureProps) {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [showSuccess, setShowSuccess] = useState(false)

  useEffect(() => {
    trackEvent("prompt_guide_email_modal_open", {
      guide_id: pageId,
      guide_title: guideTitle || "unknown",
    })
  }, [pageId, guideTitle])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/prompt-guide/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          name,
          emailListTag,
          pageId,
          utm_source: new URLSearchParams(window.location.search).get("utm_source"),
          utm_medium: new URLSearchParams(window.location.search).get("utm_medium"),
          utm_campaign: new URLSearchParams(window.location.search).get("utm_campaign"),
          referrer: document.referrer,
          user_agent: navigator.userAgent,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || "Something went wrong")
      }

      trackEvent("prompt_guide_email_signup", {
        guide_id: pageId,
        guide_title: guideTitle || "unknown",
        email_list_tag: emailListTag || "none",
        source: "prompt_guide_modal",
      })

      setShowSuccess(true)

      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error("[PromptGuide] Subscribe error:", err)
      setError(err instanceof Error ? err.message : "Failed to subscribe. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (showSuccess) {
    return (
      <div className={`overlay ${inter.className}`}>
        <div className="panel success-panel">
          <div className="icon-wrap" aria-hidden="true">
            <CheckCircle size={44} />
          </div>
          <p className="label">ACCESS UNLOCKED</p>
          <h2 className={`title ${cormorant.className}`}>Check Your Email</h2>
          <p className="copy">We sent your instant-access link. Open your inbox and you&apos;re in.</p>
        </div>

        <style jsx>{`
          .overlay {
            position: fixed;
            inset: 0;
            z-index: 200;
            background: rgba(10, 10, 10, 0.68);
            backdrop-filter: blur(8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
          }

          .panel {
            width: 100%;
            max-width: 520px;
            border: 1px solid rgba(255, 255, 255, 0.14);
            background: rgba(10, 10, 10, 0.92);
            padding: 38px 32px;
          }

          .success-panel {
            text-align: center;
          }

          .icon-wrap {
            color: #a7efc3;
            margin-bottom: 18px;
            display: flex;
            justify-content: center;
          }

          .label {
            margin: 0 0 10px;
            font-size: 10px;
            font-weight: 500;
            letter-spacing: 0.5em;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.45);
          }

          .title {
            margin: 0;
            font-size: clamp(34px, 8vw, 48px);
            font-weight: 300;
            text-transform: uppercase;
            letter-spacing: -0.01em;
            color: #ffffff;
            line-height: 1;
          }

          .copy {
            margin: 16px 0 0;
            font-size: 15px;
            line-height: 1.8;
            color: rgba(255, 255, 255, 0.75);
          }
        `}</style>
      </div>
    )
  }

  return (
    <div className={`overlay ${inter.className}`}>
      <div className="panel">
        <button onClick={onClose} className="close" aria-label="Close" disabled={isSubmitting}>
          <X size={18} />
        </button>

        <p className="label">FREE ACCESS</p>
        <h2 className={`title ${cormorant.className}`}>Unlock This Guide</h2>
        <p className="copy">Enter your details to access this full prompt guide instantly.</p>

        <form onSubmit={handleSubmit} className="form">
          <label className="field-label" htmlFor="name">
            Name
          </label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            required
            disabled={isSubmitting}
          />

          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your@email.com"
            required
            disabled={isSubmitting}
          />

          <p className="note">No spam. Only useful prompts and relevant updates.</p>

          {error ? <p className="error">{error}</p> : null}

          <button type="submit" disabled={isSubmitting} className="submit">
            {isSubmitting ? "SUBSCRIBING..." : "GET INSTANT ACCESS"}
          </button>
        </form>
      </div>

      <style jsx>{`
        .overlay {
          position: fixed;
          inset: 0;
          z-index: 200;
          background: rgba(10, 10, 10, 0.68);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 20px;
        }

        .panel {
          position: relative;
          width: 100%;
          max-width: 560px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          background: rgba(10, 10, 10, 0.95);
          padding: 38px 32px;
        }

        .close {
          position: absolute;
          top: 12px;
          right: 12px;
          border: none;
          background: transparent;
          color: rgba(255, 255, 255, 0.5);
          padding: 6px;
          cursor: pointer;
          transition: color 0.2s;
        }

        .close:hover:enabled {
          color: #ffffff;
        }

        .label {
          margin: 0 0 10px;
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.5em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        .title {
          margin: 0;
          font-size: clamp(34px, 8vw, 50px);
          font-weight: 300;
          text-transform: uppercase;
          letter-spacing: -0.01em;
          color: #ffffff;
          line-height: 1;
        }

        .copy {
          margin: 14px 0 0;
          font-size: 15px;
          line-height: 1.8;
          color: rgba(255, 255, 255, 0.72);
        }

        .form {
          margin-top: 24px;
          display: grid;
          gap: 10px;
        }

        .field-label {
          font-size: 10px;
          font-weight: 500;
          letter-spacing: 0.4em;
          text-transform: uppercase;
          color: rgba(255, 255, 255, 0.45);
        }

        input {
          width: 100%;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
          color: #ffffff;
          padding: 13px 14px;
          font-size: 14px;
          font-family: inherit;
          line-height: 1.5;
          outline: none;
          transition: border-color 0.16s ease;
        }

        input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        input:focus {
          border-color: rgba(255, 255, 255, 0.28);
        }

        .note {
          margin: 4px 0 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.45);
        }

        .error {
          margin: 6px 0 0;
          color: #ff9a9a;
          font-size: 13px;
        }

        .submit {
          margin-top: 8px;
          border: none;
          background: #ffffff;
          color: #0a0a0a;
          padding: 14px 16px;
          font-size: 11px;
          font-weight: 500;
          letter-spacing: 0.28em;
          text-transform: uppercase;
          cursor: pointer;
          transition: opacity 0.2s;
        }

        .submit:hover:enabled {
          opacity: 0.88;
        }

        .submit:disabled {
          opacity: 0.7;
          cursor: default;
        }

        @media (max-width: 700px) {
          .panel {
            padding: 30px 22px;
          }
        }
      `}</style>
    </div>
  )
}
