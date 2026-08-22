"use client"

import type { SkoolMayaHandoff } from "@/lib/app-v3/maya/skool-handoff"

export function SkoolMayaHandoffCard({
  handoff,
  disabled = false,
  onStart,
}: {
  handoff: SkoolMayaHandoff
  disabled?: boolean
  onStart: () => void
}) {
  return (
    <div
      data-skool-handoff={handoff.key}
      className="mt-4 rounded-[8px] border border-border/60 bg-background p-4"
    >
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
        From SSELFIE Skool
      </p>
      <h3 className="mt-1.5 font-serif text-[20px] font-light leading-tight text-foreground">
        {handoff.title}
      </h3>
      <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
        {handoff.description}
      </p>
      <button
        type="button"
        onClick={onStart}
        disabled={disabled}
        className="mt-4 min-h-11 w-full rounded-[5px] bg-foreground px-4 py-2.5 text-[11px] uppercase tracking-[0.16em] text-background transition-opacity hover:opacity-90 disabled:opacity-40"
      >
        Start this with Maya
      </button>
      <a
        href={handoff.returnUrl}
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.14em] text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        Return to the Skool lesson
      </a>
    </div>
  )
}
