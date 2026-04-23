"use client"

import { useState, useTransition } from "react"

export function WorkWithMeInquiryForm() {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [instagram, setInstagram] = useState("")
  const [currentBlock, setCurrentBlock] = useState("")
  const [goal, setGoal] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [isPending, startTransition] = useTransition()

  return (
    <form
      className="public-card grid gap-4 p-6"
      onSubmit={(event) => {
        event.preventDefault()
        setError("")
        setSuccess(false)

        startTransition(async () => {
          try {
            const response = await fetch("/api/inquiry/submit", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                name,
                email,
                instagramHandle: instagram,
                currentChallenge: currentBlock,
                desiredOutcome: goal,
              }),
            })

            const payload = (await response.json().catch(() => null)) as { error?: string } | null

            if (!response.ok) {
              setError(payload?.error || "Something went wrong. Please try again.")
              return
            }

            setSuccess(true)
            setName("")
            setEmail("")
            setInstagram("")
            setCurrentBlock("")
            setGoal("")
          } catch {
            setError("Something went wrong. Please try again.")
          }
        })
      }}
    >
      <label className="public-form-field">
        <span>Name</span>
        <input value={name} onChange={(event) => setName(event.target.value)} required className="public-input" />
      </label>
      <label className="public-form-field">
        <span>Email</span>
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
          className="public-input"
        />
      </label>
      <label className="public-form-field">
        <span>Instagram handle</span>
        <input value={instagram} onChange={(event) => setInstagram(event.target.value)} className="public-input" />
      </label>
      <label className="public-form-field">
        <span>What&apos;s not working right now?</span>
        <textarea
          value={currentBlock}
          onChange={(event) => setCurrentBlock(event.target.value)}
          rows={5}
          required
          className="public-input min-h-32"
        />
      </label>
      <label className="public-form-field">
        <span>What do you want in the next 6 months?</span>
        <textarea
          value={goal}
          onChange={(event) => setGoal(event.target.value)}
          rows={5}
          required
          className="public-input min-h-32"
        />
      </label>
      <button
        type="submit"
        disabled={isPending}
        className="public-button-primary w-full justify-center disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
      >
        {isPending ? "Sending..." : "Send an inquiry"}
      </button>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {success ? (
        <p className="text-sm text-[var(--stone-400)]">
          Got it. Sandra reads every inquiry herself and will reply within 48 hours.
        </p>
      ) : null}
    </form>
  )
}
