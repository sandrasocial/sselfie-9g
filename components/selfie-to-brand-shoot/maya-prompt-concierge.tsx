"use client"

import { useEffect, useMemo, useState } from "react"

import { CopyPromptButton } from "@/components/selfie-to-brand-shoot/copy-prompt-button"
import {
  buildFallbackPromptPack,
  type SelfieToBrandShootPromptCard,
  type SelfieToBrandShootPromptPack,
  type SelfieToBrandShootVisualCode,
} from "@/lib/selfie-to-brand-shoot/visual-code"

const emptyVisualCode: SelfieToBrandShootVisualCode = {
  signatureVisualWorld: "",
  mainColors: "",
  lighting: "",
  wardrobeDirection: "",
  backgroundWorld: "",
  emotionalSignal: "",
  desiredFeeling: "",
  repeatRules: "",
  avoidRules: "",
  firstShootDirection: "",
}

const codeFields: Array<{ key: keyof SelfieToBrandShootVisualCode; label: string }> = [
  { key: "signatureVisualWorld", label: "Signature Visual World" },
  { key: "mainColors", label: "Main colors" },
  { key: "lighting", label: "Lighting" },
  { key: "wardrobeDirection", label: "Wardrobe direction" },
  { key: "backgroundWorld", label: "Background world" },
  { key: "emotionalSignal", label: "Emotional signal" },
]

const useCases = [
  "Profile photo",
  "Reel cover",
  "Lifestyle image",
  "Story image",
  "Offer image",
  "Website / about image",
]

const defaultSelectedUseCases = ["Profile photo", "Reel cover", "Lifestyle image"]

export function MayaPromptConcierge({ headingClassName = "" }: { headingClassName?: string }) {
  const [visualCode, setVisualCode] = useState<SelfieToBrandShootVisualCode>(emptyVisualCode)
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>(defaultSelectedUseCases)
  const [referenceNotes, setReferenceNotes] = useState("")
  const [promptPack, setPromptPack] = useState<SelfieToBrandShootPromptPack>(() =>
    buildFallbackPromptPack(emptyVisualCode)
  )
  const [status, setStatus] = useState<"idle" | "loading" | "building" | "ready" | "error">(
    "loading"
  )
  const [message, setMessage] = useState("")

  useEffect(() => {
    let cancelled = false

    async function loadVisualCode() {
      try {
        const response = await fetch("/api/selfie-to-brand-shoot/visual-code")
        if (!response.ok) {
          if (!cancelled) setStatus("idle")
          return
        }

        const data = await response.json()
        if (cancelled) return

        const nextCode = { ...emptyVisualCode, ...(data?.visualCode || {}) }
        setVisualCode(nextCode)
        setPromptPack(buildFallbackPromptPack(nextCode, defaultSelectedUseCases))
        setStatus("idle")
      } catch {
        if (!cancelled) setStatus("idle")
      }
    }

    loadVisualCode()

    return () => {
      cancelled = true
    }
  }, [])

  const hasVisualCode = useMemo(
    () => Object.values(visualCode).some(value => typeof value === "string" && value.trim()),
    [visualCode]
  )

  function toggleUseCase(useCase: string) {
    setSelectedUseCases(current =>
      current.includes(useCase) ? current.filter(item => item !== useCase) : [...current, useCase]
    )
  }

  async function buildPromptPack() {
    if (!hasVisualCode) {
      setStatus("error")
      setMessage("Paste your Visual Consistency Code first.")
      return
    }

    setStatus("building")
    setMessage("")

    try {
      const saveResponse = await fetch("/api/selfie-to-brand-shoot/visual-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualCode }),
      })

      if (!saveResponse.ok) {
        const saveData = await saveResponse.json().catch(() => null)
        throw new Error(saveData?.error || "Could not save your visual code.")
      }

      const response = await fetch("/api/selfie-to-brand-shoot/prompt-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visualCode,
          useCases: selectedUseCases,
          notes: referenceNotes,
        }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Maya could not build your prompt pack right now.")
      }

      if (data?.promptPack) {
        setPromptPack(data.promptPack)
      } else {
        setPromptPack(buildFallbackPromptPack(visualCode, selectedUseCases))
      }

      setStatus("ready")
      setMessage("Your prompt pack is ready.")
    } catch (error) {
      setPromptPack(buildFallbackPromptPack(visualCode, selectedUseCases))
      setStatus("error")
      setMessage(
        error instanceof Error ? error.message : "Maya could not build your prompt pack right now."
      )
    }
  }

  return (
    <div className="sbs-concierge">
      <div className="sbs-concierge-form">
        <div>
          <p className="sbs-kicker">MAYA BRAND SHOOT CONCIERGE</p>
          <h4 className={headingClassName}>Let Maya Build Your Brand Shoot Prompts</h4>
          <p>
            Maya takes the visual world you chose in Module 2 and turns it into prompts you can copy
            into ChatGPT with your source selfie.
          </p>
        </div>
        <div className="sbs-concierge-step">
          <span>Step 01</span>
          <h5 className={headingClassName}>Paste your Visual Consistency Code</h5>
          <p>
            Paste your Visual Consistency Code from Module 2. Maya will turn it into a custom prompt
            set for your first brand shoot.
          </p>
          <div className="sbs-concierge-input-grid">
            {codeFields.map(field => (
              <label key={field.key}>
                <span>{field.label}</span>
                <textarea
                  value={visualCode[field.key] || ""}
                  onChange={event =>
                    setVisualCode(current => ({
                      ...current,
                      [field.key]: event.target.value,
                    }))
                  }
                  rows={2}
                />
              </label>
            ))}
          </div>
        </div>
        <div className="sbs-concierge-step">
          <span>Step 02</span>
          <h5 className={headingClassName}>Choose what you need</h5>
          <div className="sbs-use-case-grid">
            {useCases.map(useCase => (
              <label key={useCase}>
                <input
                  type="checkbox"
                  checked={selectedUseCases.includes(useCase)}
                  onChange={() => toggleUseCase(useCase)}
                />
                <span>{useCase}</span>
              </label>
            ))}
          </div>
        </div>
        <div className="sbs-concierge-step">
          <span>Step 03</span>
          <h5 className={headingClassName}>Add anything Maya should know</h5>
          <div className="sbs-concierge-input-grid">
            <label>
              <span>Optional inspiration or reference notes</span>
              <textarea
                value={referenceNotes}
                onChange={event => setReferenceNotes(event.target.value)}
                rows={4}
                placeholder="Example: I want this to feel like a quiet city morning, coffee in hand, clean white interior, soft founder energy."
              />
            </label>
          </div>
        </div>
        <button
          type="button"
          className="sbs-concierge-build-button"
          onClick={buildPromptPack}
          disabled={status === "building"}
        >
          {status === "building" ? "Building" : "Build My Brand Shoot Prompts"}
        </button>
        <div className="sbs-concierge-note">
          <span>{status === "ready" ? "Ready" : "Coming next"}</span>
          <p>{message || "Save your prompts as a styled PDF prompt pack."}</p>
        </div>
      </div>
      <div className="sbs-concierge-output">
        <div>
          <p className="sbs-kicker">YOUR PROMPT PACK</p>
          <h5 className={headingClassName}>Your Prompt Pack</h5>
          <p>
            Copy these into ChatGPT with your source selfie. Start with the first three, then use
            the extras when you need more content from the same visual world.
          </p>
        </div>
        <ConciergeOutputGroup
          title="Your 3-Image Starter Shoot"
          cards={promptPack.starterShoot}
          variant="primary"
        />
        <ConciergeOutputGroup title="Extra Brand Images" cards={promptPack.extraImages} />
        <ConciergeOutputGroup
          title="Fix Prompts"
          cards={promptPack.fixPrompts}
          intro="If the image is close, do not start over. Fix the detail that feels off."
        />
      </div>
    </div>
  )
}

function ConciergeOutputGroup({
  title,
  cards,
  intro,
  variant = "secondary",
}: {
  title: string
  cards: SelfieToBrandShootPromptCard[]
  intro?: string
  variant?: "primary" | "secondary"
}) {
  return (
    <section className={`sbs-concierge-output-group is-${variant}`}>
      <div>
        <h6>{title}</h6>
        {intro ? <p>{intro}</p> : null}
      </div>
      <div>
        {cards.map(card => (
          <article key={card.title}>
            <div>
              <h4>{card.title}</h4>
              <span>{card.purpose}</span>
            </div>
            {card.copy ? <p>{card.copy}</p> : null}
            <details className="sbs-prompt-text">
              <summary>Read prompt</summary>
              <p>{card.prompt}</p>
            </details>
            <CopyPromptButton
              text={card.prompt}
              label={variant === "primary" ? "Copy prompt" : "Copy"}
              className={variant === "primary" ? "sbs-copy-button" : "sbs-copy-button is-secondary"}
            />
          </article>
        ))}
      </div>
    </section>
  )
}
