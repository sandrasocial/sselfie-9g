"use client"

import { useEffect, useState } from "react"
import { Star, X } from "lucide-react"

import { trackAnalyticsEvent } from "@/lib/analytics/client"
import {
  dismissSuiteReviewPrompt,
  SUITE_REVIEW_ELIGIBLE_EVENT,
} from "@/lib/testimonials/review-capture-client"
import {
  SUITE_REVIEW_MAX_TEXT_LENGTH,
  SUITE_REVIEW_MIN_TEXT_LENGTH,
} from "@/lib/testimonials/review-contract"

type PromptStep = "invite" | "form" | "success"

export function PostSuccessReviewPrompt() {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState<PromptStep>("invite")
  const [rating, setRating] = useState(5)
  const [testimonial, setTestimonial] = useState("")
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const showPrompt = () => {
      setVisible(true)
      setStep("invite")
      setError(null)
    }
    window.addEventListener(SUITE_REVIEW_ELIGIBLE_EVENT, showPrompt)
    return () => window.removeEventListener(SUITE_REVIEW_ELIGIBLE_EVENT, showPrompt)
  }, [])

  function dismiss() {
    setVisible(false)
    void dismissSuiteReviewPrompt()
  }

  function openForm() {
    setStep("form")
    void trackAnalyticsEvent({
      event: "suite_review_prompt_opened",
      properties: { source: "post-success-prompt" },
    })
  }

  async function submitReview() {
    const cleanText = testimonial.trim()
    if (
      submitting ||
      !consent ||
      cleanText.length < SUITE_REVIEW_MIN_TEXT_LENGTH ||
      cleanText.length > SUITE_REVIEW_MAX_TEXT_LENGTH
    ) {
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      const response = await fetch("/api/testimonials/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testimonial: cleanText, rating, consent: true }),
        credentials: "include",
      })
      if (!response.ok) throw new Error("submit failed")
      setStep("success")
    } catch {
      setError("Failed to submit testimonial. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  if (!visible) return null

  return (
    <aside
      aria-live="polite"
      className="fixed inset-x-3 z-[65] mx-auto max-h-[min(72dvh,620px)] max-w-lg overflow-y-auto rounded-[10px] border border-[color:var(--color-whisper)] bg-[color:var(--color-porcelain)] p-5 shadow-[0_20px_70px_rgba(10,10,10,0.22)] sm:inset-x-5 sm:p-6"
      style={{ bottom: "calc(4.75rem + env(safe-area-inset-bottom))" }}
    >
      <button
        type="button"
        onClick={dismiss}
        aria-label="Close"
        className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full text-[color:var(--stone)] hover:bg-[color:var(--color-pearl)] hover:text-[color:var(--color-obsidian)]"
      >
        <X size={17} />
      </button>

      {step === "invite" && (
        <div className="pr-8">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--stone)]">Share Your Story</p>
          <h2 className="mt-2 font-serif text-[27px] font-light leading-tight text-[color:var(--color-obsidian)]">
            Share Your Story
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--color-smoke)]">
            Your experience inspires other women to start showing up confidently online.
          </p>
          <button
            type="button"
            onClick={openForm}
            className="mt-5 min-h-11 rounded-[4px] bg-[color:var(--color-obsidian)] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-white hover:bg-[color:var(--stone-dark)]"
          >
            Share Your Story
          </button>
        </div>
      )}

      {step === "form" && (
        <div className="space-y-5 pr-8">
          <div>
            <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--stone)]">Share Your Story</p>
            <h2 className="mt-2 font-serif text-[27px] font-light leading-tight text-[color:var(--color-obsidian)]">
              Share Your Story
            </h2>
          </div>

          <fieldset>
            <legend className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-smoke)]">
              How would you rate your experience?
            </legend>
            <div className="mt-2 flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  aria-label={`${star} star${star === 1 ? "" : "s"}`}
                  className="flex h-10 w-10 items-center justify-center"
                >
                  <Star
                    size={23}
                    className={
                      star <= rating
                        ? "fill-[color:var(--color-obsidian)] text-[color:var(--color-obsidian)]"
                        : "fill-none text-[color:var(--color-whisper)]"
                    }
                  />
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.14em] text-[color:var(--color-smoke)]">
              Your Testimonial
            </span>
            <textarea
              value={testimonial}
              onChange={event => setTestimonial(event.target.value)}
              maxLength={SUITE_REVIEW_MAX_TEXT_LENGTH}
              rows={5}
              placeholder="Share your favorite part of SSELFIE, how it's helped you, or the transformation you've experienced..."
              className="mt-2 w-full resize-none rounded-[4px] border border-[color:var(--color-whisper)] bg-[color:var(--color-pearl)] px-3 py-3 text-[14px] leading-relaxed text-[color:var(--color-obsidian)] outline-none focus:border-[color:var(--color-obsidian)]"
            />
            <span className="mt-1 block text-right text-[10px] text-[color:var(--stone)]">
              {testimonial.length}/{SUITE_REVIEW_MAX_TEXT_LENGTH}
            </span>
          </label>

          <label className="flex items-start gap-3 text-[12px] leading-relaxed text-[color:var(--color-smoke)]">
            <input
              type="checkbox"
              checked={consent}
              onChange={event => setConsent(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-[color:var(--color-obsidian)]"
            />
            <span>
              By submitting, you agree to let SSELFIE feature your testimonial on the website.
            </span>
          </label>

          {error && <p className="text-[12px] text-red-700">{error}</p>}

          <button
            type="button"
            onClick={submitReview}
            disabled={
              submitting ||
              !consent ||
              testimonial.trim().length < SUITE_REVIEW_MIN_TEXT_LENGTH
            }
            className="min-h-11 w-full rounded-[4px] bg-[color:var(--color-obsidian)] px-5 py-3 text-[11px] uppercase tracking-[0.16em] text-white hover:bg-[color:var(--stone-dark)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? "Submitting..." : "Share Your Story"}
          </button>
        </div>
      )}

      {step === "success" && (
        <div className="pr-8" role="status">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[color:var(--stone)]">Share Your Story</p>
          <h2 className="mt-2 font-serif text-[27px] font-light leading-tight text-[color:var(--color-obsidian)]">
            Thank You!
          </h2>
          <p className="mt-2 text-[14px] leading-relaxed text-[color:var(--color-smoke)]">
            Your story has been submitted successfully.
          </p>
        </div>
      )}
    </aside>
  )
}
