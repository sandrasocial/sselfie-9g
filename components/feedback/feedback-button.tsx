"use client"

import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { FeedbackModal } from "./feedback-modal"

interface FeedbackButtonProps {
  userId: string
  userEmail?: string | null
  userName?: string | null
}

export function FeedbackButton({ userId, userEmail, userName }: FeedbackButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed right-4 sm:right-6 z-40 flex items-center justify-center w-12 h-12 sm:w-14 sm:h-14 bg-stone-950 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group"
        aria-label="Send feedback"
        style={{
          bottom: "calc(var(--sselfie-bottom-nav-height, 96px) + max(0.75rem, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6 group-hover:rotate-12 transition-transform duration-300" strokeWidth={2} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
      </button>

      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} userId={userId} userEmail={userEmail} userName={userName} />
    </>
  )
}
