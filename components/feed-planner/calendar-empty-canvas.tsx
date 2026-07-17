"use client"

import { Plus } from "lucide-react"

export function CalendarEmptyCanvas({
  onStartBlank,
  busy = false,
}: {
  onStartBlank: () => void
  busy?: boolean
}) {
  return (
    <section
      aria-label="Instagram grid"
      className="app-light-panel-text min-w-0 overflow-hidden rounded-none border-y border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] sm:rounded-[16px] sm:border"
    >
      <header className="border-b border-[color:var(--app-glass-border)] px-4 pb-5 pt-5 sm:px-7 sm:pt-7">
        <div className="flex items-start gap-5 sm:gap-8">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border border-[color:var(--app-glass-border)] bg-[color:var(--app-btn-secondary-bg)] sm:h-24 sm:w-24">
            <span className="text-[10px] text-[color:var(--app-text-muted)]">Photo</span>
          </div>
          <div className="min-w-0 flex-1 pt-1">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[18px] font-medium text-[color:var(--app-text-primary)]">
                yourname
              </h1>
            </div>
            <p className="mt-3 text-[13px] font-medium text-[color:var(--app-text-primary)]">
              Your name
            </p>
            <p className="mt-1 max-w-[34ch] text-[13px] leading-relaxed text-[color:var(--app-text-secondary)]">
              Your bio and visual story will take shape here.
            </p>
          </div>
        </div>

        <div className="mt-5 flex gap-4 overflow-x-auto pb-1 [scrollbar-width:none]">
          {["About", "Work", "Life"].map(label => (
            <div key={label} className="w-16 shrink-0 text-center">
              <div className="mx-auto h-14 w-14 rounded-full border border-dashed border-[color:var(--app-glass-border)] bg-[color:var(--app-input-bg)]" />
              <p className="mt-1.5 text-[10px] text-[color:var(--app-text-secondary)]">{label}</p>
            </div>
          ))}
          <div className="w-16 shrink-0 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-[color:var(--app-glass-border)] text-[color:var(--app-text-secondary)]">
              <Plus size={18} aria-hidden />
            </div>
            <p className="mt-1.5 text-[10px] text-[color:var(--app-text-secondary)]">New</p>
          </div>
        </div>
      </header>

      <div
        className="flex min-h-12 items-center justify-center border-b border-[color:var(--app-glass-border)]"
        aria-hidden="true"
      >
        <span className="grid grid-cols-3 gap-[2px]">
          {Array.from({ length: 9 }, (_, index) => (
            <span key={index} className="h-[3px] w-[3px] bg-[color:var(--app-text-secondary)]" />
          ))}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-[2px] bg-[color:var(--app-bg)] p-[2px]">
        {Array.from({ length: 9 }, (_, index) => {
          const position = index + 1
          return (
            <div
              key={position}
              className={`relative aspect-square ${
                position % 4 === 0
                  ? "bg-[color:var(--calendar-stone-4)]"
                  : position % 3 === 0
                    ? "bg-[color:var(--calendar-stone-3)]"
                    : position % 2 === 0
                      ? "bg-[color:var(--calendar-stone-2)]"
                      : "bg-[color:var(--calendar-stone-1)]"
              }`}
            >
              <span className="absolute right-2 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-white/75 px-1 text-[9px] text-[color:var(--app-text-primary)]">
                {position}
              </span>
              <span className="absolute bottom-2 left-2 text-[8px] uppercase tracking-[0.12em] text-[color:var(--app-text-secondary)]">
                Planned
              </span>
            </div>
          )
        })}
      </div>
      <div className="px-4 py-4 text-center">
        <p className="text-[12px] text-[color:var(--app-text-secondary)]">
          Confirm your Plan Settings with Maya to shape these posts.
        </p>
        <button
          type="button"
          onClick={onStartBlank}
          disabled={busy}
          className="mt-2 min-h-11 px-3 text-[11px] text-[color:var(--app-text-secondary)] underline underline-offset-4 disabled:opacity-50"
        >
          Start a blank grid instead
        </button>
      </div>
    </section>
  )
}
