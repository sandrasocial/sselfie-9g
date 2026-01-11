"use client"

import type React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { FileText, ChevronRight, X } from "lucide-react"
import Image from "next/image"
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
            className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[100]"
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
            <div className={`w-full max-w-2xl max-h-[90vh] overflow-y-auto ${ComponentClasses.card} ${DesignClasses.spacing.padding.lg} relative bg-stone-950/95 backdrop-blur-xl border border-stone-800 rounded-2xl shadow-2xl`}>
              {/* Close Button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-lg transition-colors z-10 hover:bg-stone-800 text-white/80 hover:text-white"
                  aria-label="Close"
                >
                  <X size={18} />
                </button>
              )}

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center space-y-6"
              >
                {/* Logo/Icon */}
                <div className="w-20 h-20 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full flex items-center justify-center mx-auto shadow-2xl">
                  <FileText className="w-12 h-12 text-white" strokeWidth={2} />
                </div>

                {/* Welcome Message */}
                <div className="space-y-3">
                  <h2 className={`${DesignClasses.typography.heading.h2} text-white`}>
                    Welcome{userName ? `, ${userName}` : ""}!
                  </h2>
                  <p className={`${DesignClasses.typography.body.medium} text-white/90 max-w-md mx-auto`}>
                    Let's create your Brand Blueprint. Answer a few questions to get your custom brand strategy, content calendar, and a free Instagram grid.
                  </p>
                </div>

                {/* Features List */}
                <div className="space-y-3 pt-4">
                  <div className="flex items-center justify-center gap-3 text-white/80">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    <span className="text-sm">Custom brand strategy</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white/80">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    <span className="text-sm">Content calendar</span>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white/80">
                    <div className="w-1.5 h-1.5 bg-white/40 rounded-full"></div>
                    <span className="text-sm">Free Instagram grid</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button
                  onClick={onComplete}
                  className="group relative bg-white text-stone-950 px-6 py-3 rounded-lg font-medium min-h-[52px] overflow-hidden hover:bg-stone-100 transition-all w-full max-w-xs mx-auto"
                >
                  <div className="absolute inset-0 bg-stone-950/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    Get Started
                    <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                  </span>
                </button>
              </motion.div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
