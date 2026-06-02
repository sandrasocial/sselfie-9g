"use client"

import { useEffect, useMemo, useState } from "react"

import type { SelfieToBrandShootVisualCode } from "@/lib/selfie-to-brand-shoot/visual-code"

const fields: Array<{
  key: keyof SelfieToBrandShootVisualCode
  label: string
  helper: string
}> = [
  {
    key: "signatureVisualWorld",
    label: "My Signature Visual World",
    helper: "Name the world you want your audience to recognize.",
  },
  {
    key: "mainColors",
    label: "My main colors",
    helper: "Choose 2-4 colors or tones you want your images to repeat.",
  },
  {
    key: "lighting",
    label: "My lighting",
    helper: "Choose the light style you want people to associate with your brand.",
  },
  {
    key: "wardrobeDirection",
    label: "My wardrobe direction",
    helper: "Choose the clothing direction that makes the world feel consistent.",
  },
  {
    key: "backgroundWorld",
    label: "My background world",
    helper: "Choose the places, rooms, streets, or surfaces that belong in your world.",
  },
  {
    key: "emotionalSignal",
    label: "My emotional signal",
    helper: "Choose the feeling your visuals should create before anyone reads your caption.",
  },
  {
    key: "desiredFeeling",
    label: "What I want people to feel",
    helper: "Write the first impression your visuals should create.",
  },
  {
    key: "repeatRules",
    label: "What I will repeat",
    helper: "List the colors, lighting, crops, settings, or styling you will keep using.",
  },
  {
    key: "avoidRules",
    label: "What I will avoid",
    helper: "List what would make your brand visuals start feeling random.",
  },
  {
    key: "firstShootDirection",
    label: "My first 7-image brand shoot direction",
    helper: "Write the first cohesive shoot direction you will create before switching worlds.",
  },
]

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

export function VisualConsistencyCodeBuilder() {
  const [visualCode, setVisualCode] = useState<SelfieToBrandShootVisualCode>(emptyVisualCode)
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "saved" | "error">("loading")
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
        if (!cancelled && data?.visualCode) {
          setVisualCode({ ...emptyVisualCode, ...data.visualCode })
          setStatus("idle")
        }
      } catch {
        if (!cancelled) setStatus("idle")
      }
    }

    loadVisualCode()

    return () => {
      cancelled = true
    }
  }, [])

  const hasAnyValue = useMemo(
    () => Object.values(visualCode).some(value => typeof value === "string" && value.trim()),
    [visualCode]
  )

  async function saveVisualCode() {
    if (!hasAnyValue) {
      setStatus("error")
      setMessage("Add at least one field before saving.")
      return
    }

    setStatus("saving")
    setMessage("")

    try {
      const response = await fetch("/api/selfie-to-brand-shoot/visual-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visualCode }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) {
        throw new Error(data?.error || "Could not save your visual code.")
      }

      setStatus("saved")
      setMessage("Saved. Maya can now use this visual world in Module 3.")
    } catch (error) {
      setStatus("error")
      setMessage(error instanceof Error ? error.message : "Could not save your visual code.")
    }
  }

  return (
    <div className="sbs-code-builder">
      <div className="sbs-consistency-code">
        {fields.map(field => (
          <label key={field.key}>
            <span>{field.label}</span>
            <small>{field.helper}</small>
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
      <div className="sbs-code-builder-actions">
        <button type="button" onClick={saveVisualCode} disabled={status === "saving"}>
          {status === "saving" ? "Saving" : status === "saved" ? "Saved" : "Save My Visual Code"}
        </button>
        <p>{message || "Save this once. Module 3 and Maya will use the same visual direction."}</p>
      </div>
    </div>
  )
}
