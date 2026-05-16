"use client"

import { useState } from "react"

export function OptInForm() {
  const [status, setStatus] = useState<"idle" | "submitted">("idle")

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setStatus("submitted")
  }

  if (status === "submitted") {
    return (
      <div className="opt-confirmation">
        <p className="opt-confirmation-text">
          Coming soon. This form will connect in the next batch.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="opt-form" noValidate>
      <p className="opt-form-header">Where should I send them?</p>
      <div className="opt-fields">
        <div className="opt-field">
          <label htmlFor="ai-firstName" className="opt-label">
            First name
          </label>
          <input
            id="ai-firstName"
            name="firstName"
            type="text"
            autoComplete="given-name"
            className="opt-input"
            placeholder="First name"
            required
          />
        </div>
        <div className="opt-field">
          <label htmlFor="ai-email" className="opt-label">
            Email address
          </label>
          <input
            id="ai-email"
            name="email"
            type="email"
            autoComplete="email"
            className="opt-input"
            placeholder="Email address"
            required
          />
        </div>
      </div>
      <button type="submit" className="opt-submit">
        Send me the prompts
      </button>
      <p className="opt-trust">Use your own photo. No spam. Unsubscribe anytime.</p>
    </form>
  )
}
