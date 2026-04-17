"use client"

import { useState } from "react"

type EnergyState = "high" | "managing" | "survival"

interface EnergyOption {
  value: EnergyState
  label: string
  description: string
}

const OPTIONS: EnergyOption[] = [
  {
    value: "high",
    label: "I'm ready to push",
    description: "Bold ideas, full week plan",
  },
  {
    value: "managing",
    label: "I'll do what I can",
    description: "3 solid posts, keep it achievable",
  },
  {
    value: "survival",
    label: "Just keep me visible",
    description: "One post. That's the win.",
  },
]

interface MayaEnergyCheckInProps {
  onSelect: (state: EnergyState) => void
}

export function MayaEnergyCheckIn({ onSelect }: MayaEnergyCheckInProps) {
  const [selected, setSelected] = useState<EnergyState | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSelect(state: EnergyState) {
    setSelected(state)
    setSaving(true)
    try {
      await fetch("/api/maya/energy-state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ energyState: state }),
      })
      onSelect(state)
    } catch (err) {
      console.error("[MayaEnergyCheckIn] Failed to save energy state:", err)
      setSaving(false)
      setSelected(null)
    }
  }

  return (
    <div
      style={{
        margin: "0 0 1rem",
        padding: "1rem 1.25rem",
        background: "#f5f5f5",
        borderLeft: "2px solid #0a0a0a",
      }}
    >
      <p
        style={{
          margin: "0 0 0.75rem",
          fontSize: "0.72rem",
          fontFamily: "var(--font-sans, Inter, sans-serif)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#666666",
        }}
      >
        How are you feeling about showing up this week?
      </p>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}
      >
        {OPTIONS.map((opt) => {
          const isActive = selected === opt.value
          return (
            <button
              key={opt.value}
              onClick={() => !saving && handleSelect(opt.value)}
              disabled={saving}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                padding: "0.625rem 0.875rem",
                background: isActive ? "#0a0a0a" : "#ffffff",
                color: isActive ? "#ffffff" : "#0a0a0a",
                border: `1px solid ${isActive ? "#0a0a0a" : "#e5e5e5"}`,
                borderRadius: 0,
                cursor: saving ? "default" : "pointer",
                textAlign: "left",
                transition: "background 0.15s, color 0.15s, border-color 0.15s",
                opacity: saving && !isActive ? 0.4 : 1,
              }}
            >
              <span
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  lineHeight: 1.4,
                  fontFamily: "var(--font-sans, Inter, sans-serif)",
                }}
              >
                {opt.label}
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  lineHeight: 1.5,
                  color: isActive ? "rgba(255,255,255,0.6)" : "#666666",
                  fontFamily: "var(--font-sans, Inter, sans-serif)",
                }}
              >
                {opt.description}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
