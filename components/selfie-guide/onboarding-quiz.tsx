"use client"

import { useState } from "react"
import type { GuidePhoneType, GuidePostingFrequency } from "@/lib/selfie-guide/experience"

type QuizAnswers = {
  phone: GuidePhoneType
  frequency: GuidePostingFrequency
}

type OnboardingQuizProps = {
  onComplete: (answers: QuizAnswers) => void
}

const PHONE_OPTIONS: { value: GuidePhoneType; label: string }[] = [
  { value: "iphone-15-16", label: "iPhone 15 or newer" },
  { value: "iphone-13-14", label: "An older iPhone" },
  { value: "android", label: "Android" },
  { value: "not-sure", label: "Not sure" },
]

const FREQUENCY_OPTIONS: { value: GuidePostingFrequency; label: string }[] = [
  { value: "never", label: "Never. I avoid the camera" },
  { value: "sometimes", label: "Sometimes, when I feel ready" },
  { value: "regularly", label: "Regularly, but I want better results" },
]

export default function OnboardingQuiz({ onComplete }: OnboardingQuizProps) {
  const [step, setStep] = useState<1 | 2>(1)
  const [phone, setPhone] = useState<GuidePhoneType | null>(null)
  const [frequency, setFrequency] = useState<GuidePostingFrequency | null>(null)

  const handlePhoneSelect = (value: GuidePhoneType) => {
    setPhone(value)
    // Auto-advance after short delay so the selection is visible
    setTimeout(() => setStep(2), 260)
  }

  const handleFrequencySelect = (value: GuidePostingFrequency) => {
    setFrequency(value)
    setTimeout(() => {
      if (phone) {
        onComplete({ phone, frequency: value })
      }
    }, 300)
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0c0b",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 24px",
      }}
    >
      {/* Step indicator */}
      <p
        style={{
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "10px",
          fontWeight: 500,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "rgba(240,237,232,0.35)",
          marginBottom: "48px",
        }}
      >
        {step} of 2
      </p>

      {/* Question */}
      <h2
        style={{
          fontFamily: "'Cormorant Garamond', Georgia, serif",
          fontSize: "clamp(26px, 5vw, 34px)",
          fontWeight: 300,
          color: "#f0ede8",
          textAlign: "center",
          marginBottom: "36px",
          lineHeight: 1.25,
          maxWidth: "480px",
        }}
      >
        {step === 1 ? "Which phone do you use?" : "How often do you post selfies right now?"}
      </h2>

      {/* Answer options */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "10px",
          width: "100%",
          maxWidth: "400px",
        }}
      >
        {step === 1
          ? PHONE_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={phone === opt.value}
                onClick={() => handlePhoneSelect(opt.value)}
              />
            ))
          : FREQUENCY_OPTIONS.map((opt) => (
              <OptionButton
                key={opt.value}
                label={opt.label}
                selected={frequency === opt.value}
                onClick={() => handleFrequencySelect(opt.value)}
              />
            ))}
      </div>
    </div>
  )
}

function OptionButton({
  label,
  selected,
  onClick,
}: {
  label: string
  selected: boolean
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: "100%",
        padding: "16px 20px",
        background: selected
          ? "rgba(240,237,232,0.08)"
          : hovered
            ? "rgba(175,170,162,0.12)"
            : "rgba(175,170,162,0.06)",
        border: selected
          ? "1px solid rgba(240,237,232,0.55)"
          : "1px solid rgba(195,190,182,0.22)",
        borderRadius: "12px",
        color: selected ? "#f0ede8" : "rgba(240,237,232,0.7)",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: "15px",
        fontWeight: 300,
        textAlign: "left",
        cursor: "pointer",
        transition: "all 0.15s ease",
        letterSpacing: "0.01em",
      }}
    >
      {label}
    </button>
  )
}
