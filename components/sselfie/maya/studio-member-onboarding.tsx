"use client"

import { useEffect, useState } from "react"

interface StudioMemberOnboardingProps {
  open: boolean
  creditBalance: number
  onClose: () => void
  onShowSelfieMode: () => void
  onUploadSelfie: () => void
  onStartTraining: () => void
}

type OnboardingStep = 1 | 2 | 3

export default function StudioMemberOnboarding({
  open,
  creditBalance,
  onClose,
  onShowSelfieMode,
  onUploadSelfie,
  onStartTraining,
}: StudioMemberOnboardingProps) {
  const [step, setStep] = useState<OnboardingStep>(1)

  useEffect(() => {
    if (open) {
      setStep(1)
    }
  }, [open])

  if (!open) {
    return null
  }

  return (
    <div className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-[rgba(255,255,255,0.15)] bg-[rgba(10,10,10,0.95)] text-[#ffffff] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[rgba(255,255,255,0.1)]">
          <h2
            className="text-xs tracking-[0.2em] uppercase text-[#e5e5e5]"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Studio Onboarding
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full border border-[rgba(255,255,255,0.2)] flex items-center justify-center hover:bg-[rgba(255,255,255,0.1)] transition-colors"
            aria-label="Close onboarding"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#e5e5e5]">Close</span>
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex gap-1.5 mb-5">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[#ffffff]" : "bg-[rgba(255,255,255,0.2)]"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[#ffffff]" : "bg-[rgba(255,255,255,0.2)]"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-[#ffffff]" : "bg-[rgba(255,255,255,0.2)]"}`} />
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3
                className="text-lg uppercase tracking-[0.12em] text-[#ffffff]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Your Studio Is Ready
              </h3>
              <div className="rounded-xl border border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.05)] p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#e5e5e5]">Credits</p>
                  <p className="text-sm text-[#ffffff] mt-1">{Math.round(creditBalance)}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#e5e5e5]">SELFIE</p>
                  <p className="text-sm text-[#ffffff] mt-1">On</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-[0.12em] text-[#e5e5e5]">Training</p>
                  <p className="text-sm text-[#ffffff] mt-1">Ready</p>
                </div>
              </div>
              <p className="text-sm text-[#e5e5e5] leading-relaxed">
                Two ways to create photos that look like you. Start with the fastest.
              </p>
              <button
                type="button"
                onClick={() => {
                  onShowSelfieMode()
                  setStep(2)
                }}
                className="w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.25)] text-xs uppercase tracking-[0.14em] hover:bg-[rgba(255,255,255,0.16)] transition-colors"
              >
                Show Me SELFIE Mode →
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3
                className="text-lg uppercase tracking-[0.12em] text-[#ffffff]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                This Is SELFIE Mode
              </h3>
              <p className="text-sm text-[#e5e5e5] leading-relaxed">
                Upload one selfie here. Maya does the rest.
              </p>
              <button
                type="button"
                onClick={() => {
                  onUploadSelfie()
                  setStep(3)
                }}
                className="w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.25)] text-xs uppercase tracking-[0.14em] hover:bg-[rgba(255,255,255,0.16)] transition-colors"
              >
                Upload a Selfie →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-[rgba(255,255,255,0.2)] text-xs uppercase tracking-[0.14em] text-[#e5e5e5] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                I&apos;ll Explore First
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3
                className="text-lg uppercase tracking-[0.12em] text-[#ffffff]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                Want Even Better Results?
              </h3>
              <p className="text-sm text-[#e5e5e5] leading-relaxed">
                Train AI on 10-15 photos. Around 30 minutes. Your model runs forever.
              </p>
              <button
                type="button"
                onClick={() => {
                  onStartTraining()
                  onClose()
                }}
                className="w-full py-3 rounded-xl bg-[rgba(255,255,255,0.1)] border border-[rgba(255,255,255,0.25)] text-xs uppercase tracking-[0.14em] hover:bg-[rgba(255,255,255,0.16)] transition-colors"
              >
                Start Training →
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl border border-[rgba(255,255,255,0.2)] text-xs uppercase tracking-[0.14em] text-[#e5e5e5] hover:bg-[rgba(255,255,255,0.08)] transition-colors"
              >
                Not Now - I&apos;ll Explore
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
