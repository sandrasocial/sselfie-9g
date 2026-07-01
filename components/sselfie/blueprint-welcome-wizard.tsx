"use client"

import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { DesignClasses, ComponentClasses } from "@/lib/design-tokens"

interface BlueprintWelcomeWizardProps {
  isOpen: boolean
  onComplete: () => void
  onDismiss?: () => void
  userName?: string | null
}

export default function BlueprintWelcomeWizard({
  isOpen,
  onComplete,
  onDismiss,
  userName,
}: BlueprintWelcomeWizardProps) {
  if (!isOpen) {
    return null
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-[rgba(13,12,11,0.80)] backdrop-blur-sm z-[100]"
            onClick={onDismiss}
          />

          {/* Wizard Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 pb-24 sm:pb-28 md:pb-32"
            onClick={(e) => e.stopPropagation()}
            style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 6rem)" }}
          >
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-[rgba(175,170,162,0.15)] backdrop-blur-[70px] border border-[rgba(195,190,182,0.25)] rounded-3xl p-6 sm:p-8 relative">
              {/* Close Button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 px-3 h-8 flex items-center justify-center rounded-lg transition-colors z-10 text-[#8a8780] hover:text-[#f0ede8] text-[11px] tracking-[0.12em] uppercase"
                  aria-label="Close"
                >
                  Close
                </button>
              )}

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                {/* Logo/Icon */}
                <div className="w-20 h-20 bg-[rgba(175,170,162,0.18)] backdrop-blur-sm border border-[rgba(195,190,182,0.25)] rounded-full flex items-center justify-center mx-auto">
                  <span className="text-[12px] tracking-[0.22em] uppercase text-[#a8a49c]">Maya</span>
                </div>

                {/* Welcome Message */}
                <div className="space-y-3">
                  <h2 className="font-['Cormorant_Garamond'] font-light text-3xl sm:text-4xl text-[#f0ede8] tracking-wide">
                    {userName ? `You're in, ${userName}.` : "You're in."}
                  </h2>
                  <p className="text-sm text-[#8a8780] max-w-md mx-auto leading-relaxed">
                    You have 60 credits. That&apos;s 30 AI brand photos. Let&apos;s use them - upload a selfie and Maya creates your first photo in under 2 minutes.
                  </p>
                </div>

                {/* What's next */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-center gap-3 text-[#8a8780]">
                    <div className="w-1.5 h-1.5 bg-[#a8a49c] rounded-full"></div>
                    <span className="text-sm">Upload one selfie → get a brand photo</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-[#8a8780]">
                    <div className="w-1.5 h-1.5 bg-[#a8a49c] rounded-full"></div>
                    <span className="text-sm">Train your personal AI for faster results</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-[#8a8780]">
                    <div className="w-1.5 h-1.5 bg-[#a8a49c] rounded-full"></div>
                    <span className="text-sm">Plan your feed once you have your photos</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={onComplete}
                  className="inline-flex items-center justify-center gap-2 bg-[#c8c4bb] text-[#0d0c0b] font-medium tracking-[0.15em] uppercase text-xs px-6 py-3 rounded-full hover:bg-[#f0ede8] transition-colors active:scale-[0.98] w-full max-w-xs mx-auto"
                >
                  Make my first photo
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
