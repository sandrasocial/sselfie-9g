"use client"

import { useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { X } from "lucide-react"

import { CalendarPlanSettingsCard } from "./calendar-plan-settings-card"
import type { CalendarPlanSettings } from "@/lib/feed-planner/calendar-plan-settings"

interface CalendarContentContextModalProps {
  open: boolean
  settings: CalendarPlanSettings
  onClose: () => void
  onSave: (settings: CalendarPlanSettings) => Promise<void>
}

export function CalendarContentContextModal({
  open,
  settings,
  onClose,
  onSave,
}: CalendarContentContextModalProps) {
  const [mounted, setMounted] = useState(false)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => setMounted(true), [])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    closeButtonRef.current?.focus()

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener("keydown", handleKeyDown)
    }
  }, [onClose, open])

  if (!mounted || !open) return null

  return createPortal(
    <div className="fixed inset-0 z-[120] flex items-end justify-center bg-black/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close content context"
        onClick={onClose}
      />
      <dialog
        open
        aria-labelledby="calendar-context-title"
        className="relative z-[1] m-0 flex max-h-[94dvh] w-full max-w-4xl flex-col overflow-hidden rounded-t-[28px] border border-white/60 bg-[#f8f8f6] p-0 text-[#111] shadow-[0_30px_100px_rgba(0,0,0,0.30)] sm:max-h-[90dvh] sm:rounded-[28px]"
      >
        <header className="flex shrink-0 items-start justify-between gap-5 border-b border-black/10 px-5 py-5 sm:px-8 sm:py-7">
          <div className="min-w-0">
            <p className="text-[10px] font-medium uppercase tracking-[0.22em] text-black/50">
              Content context
            </p>
            <h2
              id="calendar-context-title"
              className="mt-2 text-[34px] font-light leading-none sm:text-[48px]"
              style={{ fontFamily: "'Cormorant Garamond', serif" }}
            >
              What Maya knows
            </h2>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-black/60 sm:text-[15px]">
              This is what Maya uses when she plans, writes and creates with you.
            </p>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close what Maya knows"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-black/15 bg-white text-black transition-colors hover:bg-black hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          >
            <X size={18} aria-hidden />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-8 sm:py-6">
          <CalendarPlanSettingsCard
            settings={settings}
            onSave={onSave}
            onConfirm={onClose}
          />
        </div>
      </dialog>
    </div>,
    document.body
  )
}
