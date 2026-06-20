"use client"

import { MessageCircle } from "lucide-react"
import { useConcierge } from "./concierge-context"

export function MayaFloatingLauncher() {
  const { isOpen, open } = useConcierge()

  if (isOpen) return null

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open Maya chat"
      className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D0E10] text-white shadow-[0_12px_32px_rgba(13,14,16,0.24)] transition-transform hover:scale-[1.03] focus:outline-none focus:ring-2 focus:ring-[#0D0E10] focus:ring-offset-2 focus:ring-offset-[#F8FAFA] sm:right-6"
    >
      <MessageCircle aria-hidden size={22} strokeWidth={1.8} />
    </button>
  )
}
