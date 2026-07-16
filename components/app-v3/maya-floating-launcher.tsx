"use client"

// SSELFIE Studio 3.0 - floating Maya launcher (CLAUDE-MAYA-UI-UX-01 Workstream A).
// Maya is the relationship, so when the drawer is closed she stays reachable as her own face,
// framed in obsidian with a small chat badge. Saved sessions are continued by choice; a normal
// launch starts a clean guided Maya thread. No second chat system.

import Image from "next/image"
import { useState } from "react"
import { MessageCircle } from "lucide-react"
import { useConcierge } from "./concierge-context"

// Same portrait the chat thread uses for Maya, so the launcher unmistakably reads as "her".
const MAYA_AVATAR = "/images/ai-prompts/clean-girl-morning-shot-1.jpg"

export function MayaFloatingLauncher() {
  const { isOpen, open, openFresh, openHistory, hasSavedSession, workspaceBusy } = useConcierge()
  const [choiceOpen, setChoiceOpen] = useState(false)

  if (isOpen) return null

  return (
    <div className="fixed bottom-[calc(4.75rem+env(safe-area-inset-bottom))] right-4 z-50 sm:right-6">
      {choiceOpen && hasSavedSession && (
        <>
          <button
            type="button"
            aria-label="Close Maya choices"
            onClick={() => setChoiceOpen(false)}
            className="fixed inset-0 z-0 cursor-default"
          />
          <div id="maya-launcher-choices" role="menu" className="relative z-10 mb-3 w-64 rounded-[8px] border border-[#C5C6C8]/70 bg-white p-3 shadow-[0_18px_46px_rgba(13,14,16,0.18)] animate-in fade-in slide-in-from-bottom-2 duration-200 motion-reduce:animate-none">
            <p className="text-[10px] uppercase tracking-[0.2em] text-[#818283]">Maya</p>
            <p className="mt-1 text-[13px] leading-relaxed text-[#4F5052]">
              {workspaceBusy
                ? "Maya is finishing your creation. Resume current to see it complete."
                : "Pick up where you left off, start clean, or open a past conversation."}
            </p>
            <div className="mt-3 grid gap-2">
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setChoiceOpen(false)
                  open()
                }}
                className="min-h-11 rounded-[4px] bg-[#0D0E10] px-3 text-[11px] uppercase tracking-[0.14em] text-white"
              >
                Resume current
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setChoiceOpen(false)
                  openFresh()
                }}
                disabled={workspaceBusy}
                className="min-h-11 rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Start new
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setChoiceOpen(false)
                  openHistory()
                }}
                disabled={workspaceBusy}
                className="min-h-11 rounded-[4px] border border-[#C5C6C8]/70 bg-white px-3 text-[11px] uppercase tracking-[0.14em] text-[#4F5052] hover:border-[#0D0E10]/40 disabled:cursor-not-allowed disabled:opacity-40"
              >
                View past chats
              </button>
            </div>
          </div>
        </>
      )}
      <button
        type="button"
        onClick={() => {
          if (hasSavedSession) {
            setChoiceOpen(current => !current)
            return
          }
          openFresh()
        }}
        aria-label="Open Maya"
        aria-expanded={hasSavedSession ? choiceOpen : undefined}
        aria-haspopup={hasSavedSession ? "menu" : undefined}
        aria-controls={hasSavedSession ? "maya-launcher-choices" : undefined}
        className="group relative flex h-14 w-14 items-center justify-center rounded-full bg-[#0D0E10] p-[3px] shadow-[0_10px_30px_rgba(13,14,16,0.28)] transition-transform duration-200 hover:scale-[1.04] focus:outline-none focus:ring-2 focus:ring-[#0D0E10] focus:ring-offset-2 focus:ring-offset-[#F8FAFA] animate-in fade-in zoom-in-90 duration-300 motion-reduce:animate-none"
      >
        <span className="relative block h-full w-full overflow-hidden rounded-full">
          <Image src={MAYA_AVATAR} alt="" fill sizes="56px" className="object-cover" />
        </span>
        <span className="absolute -bottom-0.5 -right-0.5 flex h-[22px] w-[22px] items-center justify-center rounded-full border-2 border-[#F8FAFA] bg-[#0D0E10] text-white">
          <MessageCircle aria-hidden size={11} strokeWidth={2} />
        </span>
      </button>
    </div>
  )
}
