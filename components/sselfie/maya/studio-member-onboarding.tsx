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
    <div className="fixed inset-0 z-[9999] bg-[rgba(13,12,11,0.80)] backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.15)] backdrop-blur-[70px] overflow-hidden">
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-[rgba(195,190,182,0.20)]">
          <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.5em] text-[#8a8780]">
            Studio Onboarding
          </p>
          <button
            type="button"
            onClick={onClose}
            className="h-8 px-3 rounded-full border border-[rgba(195,190,182,0.25)] flex items-center justify-center hover:bg-[rgba(175,170,162,0.18)] transition-colors"
            aria-label="Close onboarding"
          >
            <span className="text-[10px] uppercase tracking-[0.18em] text-[#8a8780]">Close</span>
          </button>
        </div>

        <div className="px-5 py-5">
          <div className="flex gap-1.5 mb-5">
            <div className={`h-1.5 flex-1 rounded-full ${step >= 1 ? "bg-[#c8c4bb]" : "bg-[rgba(175,170,162,0.25)]"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 2 ? "bg-[#c8c4bb]" : "bg-[rgba(175,170,162,0.25)]"}`} />
            <div className={`h-1.5 flex-1 rounded-full ${step >= 3 ? "bg-[#c8c4bb]" : "bg-[rgba(175,170,162,0.25)]"}`} />
          </div>

          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-['Cormorant_Garamond'] font-light text-xl tracking-wide text-[#f0ede8] uppercase">
                Your Studio Is Ready
              </h3>
              <div className="rounded-xl border border-[rgba(195,190,182,0.20)] bg-[rgba(175,170,162,0.10)] p-3 grid grid-cols-3 gap-2 text-center">
                <div>
                  <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Credits</p>
                  <p className="text-sm text-[#f0ede8] mt-1">{Math.round(creditBalance)}</p>
                </div>
                <div>
                  <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">SELFIE</p>
                  <p className="text-sm text-[#f0ede8] mt-1">On</p>
                </div>
                <div>
                  <p className="font-['Inter'] font-medium text-[10px] uppercase tracking-[0.3em] text-[#8a8780]">Training</p>
                  <p className="text-sm text-[#f0ede8] mt-1">Ready</p>
                </div>
              </div>
              <p className="text-sm text-[#8a8780] leading-relaxed">
                Two ways to create photos that look like you. Start with the fastest.
              </p>
              <button
                type="button"
                onClick={() => {
                  onShowSelfieMode()
                  setStep(2)
                }}
                className="w-full py-3 rounded-full bg-[#c8c4bb] text-[#0d0c0b] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#f0ede8] transition-colors"
              >
                Show Me SELFIE Mode
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-['Cormorant_Garamond'] font-light text-xl tracking-wide text-[#f0ede8] uppercase">
                This Is SELFIE Mode
              </h3>
              <p className="text-sm text-[#8a8780] leading-relaxed">
                Upload one selfie here. Maya does the rest.
              </p>
              <button
                type="button"
                onClick={() => {
                  onUploadSelfie()
                  setStep(3)
                }}
                className="w-full py-3 rounded-full bg-[#c8c4bb] text-[#0d0c0b] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#f0ede8] transition-colors"
              >
                Upload a Selfie
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-full border border-[rgba(195,190,182,0.30)] text-xs uppercase tracking-[0.14em] text-[#8a8780] hover:text-[#f0ede8] hover:border-[rgba(195,190,182,0.55)] transition-colors"
              >
                I&apos;ll Explore First
              </button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-['Cormorant_Garamond'] font-light text-xl tracking-wide text-[#f0ede8] uppercase">
                Want Even Better Results?
              </h3>
              <p className="text-sm text-[#8a8780] leading-relaxed">
                Train AI on 10-15 photos. Around 30 minutes. Your model runs forever.
              </p>
              <button
                type="button"
                onClick={() => {
                  onStartTraining()
                  onClose()
                }}
                className="w-full py-3 rounded-full bg-[#c8c4bb] text-[#0d0c0b] text-xs font-medium uppercase tracking-[0.14em] hover:bg-[#f0ede8] transition-colors"
              >
                Start Training
              </button>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-full border border-[rgba(195,190,182,0.30)] text-xs uppercase tracking-[0.14em] text-[#8a8780] hover:text-[#f0ede8] hover:border-[rgba(195,190,182,0.55)] transition-colors"
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
