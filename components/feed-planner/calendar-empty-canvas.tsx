"use client"

import { Plus } from "lucide-react"

export function CalendarEmptyCanvas({
  onAddPhoto,
  busy = false,
}: {
  onAddPhoto: (position: number) => void
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
            <button
              type="button"
              key={position}
              onClick={() => onAddPhoto(position)}
              disabled={busy}
              aria-label={`Add photo to post ${position}`}
              className="group relative aspect-square bg-[color:var(--app-btn-secondary-bg)] transition-colors hover:bg-[color:var(--app-btn-secondary-hover)] focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--app-focus-ring)] disabled:cursor-wait disabled:opacity-60"
            >
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[color:var(--app-glass-border)] bg-[color:var(--app-bg)] text-[color:var(--app-text-secondary)] transition-transform group-active:scale-[0.96]">
                  <Plus size={16} aria-hidden />
                </span>
              </span>
            </button>
          )
        })}
      </div>
      <p className="px-4 py-4 text-center text-[12px] text-[color:var(--app-text-secondary)]">
        Tap any square to add your own photo. Maya can work beside you whenever you want.
      </p>
    </section>
  )
}
