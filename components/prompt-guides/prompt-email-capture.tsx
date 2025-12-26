"use client"

import { useState, useEffect } from "react"
import { X, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { trackEvent } from "@/lib/analytics"

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

  // Track modal open
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

      // Track successful email signup with guide name
      trackEvent("prompt_guide_email_signup", {
        guide_id: pageId,
        guide_title: guideTitle || "unknown",
        email_list_tag: emailListTag || "none",
        source: "prompt_guide_modal",
      })

      // Show success message
      setShowSuccess(true)

      // Auto-close after 2 seconds
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
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <CheckCircle className="text-green-600" size={48} />
            </div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950">
              Check Your Email!
            </h2>
            <p className="text-sm text-stone-600 font-light">
              We've sent you instant access to this guide. Check your inbox for the link.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-950 transition-colors"
          aria-label="Close"
          disabled={isSubmitting}
        >
          <X size={20} />
        </button>

        <div className="space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-2">
              Unlock This Guide
            </h2>
            <p className="text-sm text-stone-600 font-light">
              Enter your email to access this exclusive prompt guide.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                type="text"
                placeholder="Your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>
            <div>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
                className="w-full"
              />
            </div>

            <p className="text-xs text-stone-500 font-light text-center">
              We'll only send you valuable content, never spam.
            </p>

            {error && (
              <p className="text-sm text-red-600 font-light">{error}</p>
            )}

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-stone-950 text-white hover:bg-stone-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Subscribing..." : "Get Access"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
