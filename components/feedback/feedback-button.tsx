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
        className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-14 h-14 bg-stone-950 text-white rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 group"
        aria-label="Send feedback"
      >
        <MessageCircle size={24} strokeWidth={2} className="group-hover:rotate-12 transition-transform duration-300" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full animate-pulse" />
      </button>

      <FeedbackModal open={isOpen} onOpenChange={setIsOpen} userId={userId} userEmail={userEmail} userName={userName} />
    </>
  )
}
