"use client"

// SSELFIE Studio 3.0 - floating Maya launcher (CLAUDE-MAYA-UI-UX-01 Workstream A).
// Maya is the relationship, so when the drawer is closed she stays reachable as her own face,
// framed in obsidian with a small chat badge. One tap reopens the current conversation, or
// starts a blank general session (handled by ConciergeProvider.open). No second chat system.

import Image from "next/image"
import { MessageCircle } from "lucide-react"
import { useConcierge } from "./concierge-context"

// Same portrait the chat thread uses for Maya, so the launcher unmistakably reads as "her".
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

export function MayaFloatingLauncher() {
  const { isOpen, open } = useConcierge()

  if (isOpen) return null

  return (
    <button
      type="button"
      onClick={open}
      aria-label="Open Maya"
      className="group fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#0D0E10] p-[3px] shadow-[0_10px_30px_rgba(13,14,16,0.28)] transition-transform duration-200 hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-[#0D0E10] focus:ring-offset-2 focus:ring-offset-[#F8FAFA] animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none sm:right-6"
    >
      <span className="relative block h-full w-full overflow-hidden rounded-full">
        <Image src={MAYA_AVATAR} alt="" fill sizes="56px" className="object-cover" />
      </span>
      <span className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#F8FAFA] bg-[#0D0E10] text-white">
        <MessageCircle aria-hidden size={11} strokeWidth={2} />
      </span>
    </button>
  )
}
