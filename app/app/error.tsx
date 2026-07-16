"use client"

import { useEffect } from "react"

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[/app error boundary]", error)
  }, [error])

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#F8FAFA] px-5 text-[#0D0E10]">
      <div className="w-full max-w-sm rounded-[14px] border border-[#C5C6C8]/60 bg-white p-6 text-center shadow-[0_18px_55px_rgba(13,14,16,0.08)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#4F5052]">SSELFIE Studio</p>
        <h1 className="mt-3 font-serif text-[28px] font-light leading-tight">Something didn&apos;t load.</h1>
        <p className="mt-2 text-[14px] leading-relaxed text-[#4F5052]">
          Your work is still here. Try opening the Studio again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 min-h-12 w-full rounded-[6px] bg-[#0D0E10] px-5 text-[11px] uppercase tracking-[0.16em] text-white"
        >
          Try again
        </button>
      </div>
    </main>
  )
}
