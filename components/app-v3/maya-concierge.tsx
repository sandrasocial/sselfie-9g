"use client"

// SSELFIE Studio 3.0 — Maya Concierge (Phase 1 scaffold).
// Opens as a calm slide-over when a vibe is chosen. Maya greets with the chosen aesthetic
// preloaded, then asks the two simple questions (format, selfie). Generation + conversational
// edits are wired in the engine-cutover phase (MAYA-REBUILD-02); this scaffolds the handoff
// UX and state only. Design system: light editorial, Cormorant display, no icons/emojis.

import { useConcierge } from "./concierge-context"
import type { OutputFormat } from "./types"

const FORMAT_OPTIONS: { id: OutputFormat; label: string; hint: string }[] = [
  { id: "photo", label: "A photo", hint: "A single editorial brand image." },
  { id: "reel-cover", label: "A Reel cover", hint: "Text + image, made to stop the scroll." },
  { id: "carousel", label: "A carousel", hint: "A set of slides that teach or sell." },
  { id: "story-slide", label: "A Story slide", hint: "A vertical slide for Stories." },
]

export function MayaConcierge() {
  const { session, isOpen, setOutputFormat, close } = useConcierge()
  if (!isOpen || !session) return null

  const { aesthetic, outputFormat } = session

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close"
        onClick={close}
        className="absolute inset-0 bg-[#0D0E10]/30 backdrop-blur-[2px]"
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label={`Maya — ${aesthetic.name}`}
        className="relative flex h-full w-full max-w-md flex-col bg-[#F8FAFA] shadow-xl"
      >
        <header className="border-b border-[#C5C6C8]/40 px-6 py-5">
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Maya</p>
          <h2 className="mt-2 font-serif text-[26px] font-light leading-tight text-[#0D0E10]">
            {aesthetic.name}
          </h2>
        </header>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-6">
          {/* Maya's opening message — references the chosen vibe (the handoff). */}
          <div className="rounded-[4px] bg-white p-4 text-[15px] leading-relaxed text-[#282728]">
            <p>
              {aesthetic.name} is a beautiful choice. {aesthetic.blurb}
            </p>
            <p className="mt-3">Let&apos;s make it yours. First, what are we creating?</p>
          </div>

          {/* Question 1: output format (photo OR structured marketing graphic). */}
          <div className="space-y-2">
            {FORMAT_OPTIONS.map((opt) => {
              const selected = outputFormat === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setOutputFormat(opt.id)}
                  className={`block w-full rounded-[4px] border px-4 py-3 text-left transition-colors ${
                    selected
                      ? "border-[#0D0E10] bg-[#0D0E10] text-white"
                      : "border-[#C5C6C8]/60 bg-white text-[#282728] hover:border-[#0D0E10]/40"
                  }`}
                >
                  <span className="block text-[15px]">{opt.label}</span>
                  <span className={`block text-[12px] ${selected ? "text-white/70" : "text-[#818283]"}`}>
                    {opt.hint}
                  </span>
                </button>
              )
            })}
          </div>

          {/* Question 2: reference selfie (Phase 1 placeholder — upload wires to
              user_avatar_images in the engine-cutover phase). */}
          {outputFormat && (
            <div className="rounded-[4px] border border-dashed border-[#C5C6C8] bg-white p-5 text-center">
              <p className="text-[14px] text-[#282728]">Now, upload one clear selfie.</p>
              <p className="mt-1 text-[12px] text-[#818283]">
                Good light, face easy to see. That is all Maya needs.
              </p>
              <button
                type="button"
                disabled
                className="mt-4 cursor-not-allowed rounded-[4px] bg-[#0D0E10] px-5 py-2.5 text-[11px] uppercase tracking-[0.18em] text-white opacity-60"
              >
                Upload selfie (coming in cutover)
              </button>
            </div>
          )}
        </div>

        <footer className="border-t border-[#C5C6C8]/40 px-6 py-4">
          <button
            type="button"
            onClick={close}
            className="text-[12px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Back to looks
          </button>
        </footer>
      </aside>
    </div>
  )
}
