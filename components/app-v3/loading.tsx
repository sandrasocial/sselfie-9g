"use client"

// SSELFIE Studio 3.0 - loading primitives (MAYA-REBUILD-05 Phase A).
// Lifted from the live Studio's loading language (typing dots, spinner, skeleton),
// reskinned to the /app light editorial palette. Presentational only.

export function TypingDots({ label = "Maya is thinking" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 text-[#818283]">
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8] [animation-delay:-0.2s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8] [animation-delay:-0.1s]" />
        <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#A6A7A8]" />
      </span>
      <span className="text-[13px]">{label}…</span>
    </div>
  )
}

export function Spinner({ className = "h-6 w-6" }: { className?: string }) {
  return (
    <div
      role="status"
      aria-label="Loading"
      className={`animate-spin rounded-full border-2 border-[#C5C6C8] border-t-[#0D0E10] ${className}`}
    />
  )
}

export function CardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[6px] border border-[#C5C6C8]/60 bg-white">
      <div className="aspect-[4/5] w-full animate-pulse bg-[#F1F2F2]" />
      <div className="space-y-2 p-4">
        <div className="h-4 w-2/3 animate-pulse rounded bg-[#ECEDED]" />
        <div className="h-3 w-full animate-pulse rounded bg-[#F1F2F2]" />
      </div>
    </div>
  )
}
