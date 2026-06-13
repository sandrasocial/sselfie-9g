"use client"

// SSELFIE Studio 3.0 — credit top-up modal (MAYA-REBUILD-05 Phase B).
// Graceful path when a generation is blocked by zero credits (the generate route returns
// 402 insufficient_credits). Routes to the existing /checkout/credits purchase page.

interface CreditModalProps {
  open: boolean
  balance: number | null
  onClose: () => void
}

export function CreditModal({ open, balance, onClose }: CreditModalProps) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6">
      <div className="w-full max-w-sm rounded-[10px] bg-[#F8FAFA] p-5 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none sm:p-7">
        <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Credits</p>
        <h3 className="mt-3 font-serif text-[24px] font-light leading-tight text-[#0D0E10]">
          You&apos;re out of credits
        </h3>
        <p className="mt-3 text-[14px] leading-relaxed text-[#4F5052]">
          Each image is one credit.
          {typeof balance === "number" ? ` You have ${balance} left.` : ""} Top up to keep creating.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <a
            href="/checkout/credits"
            className="inline-flex min-h-12 items-center justify-center rounded-[4px] bg-[#0D0E10] px-5 py-3 text-center text-[11px] uppercase tracking-[0.2em] text-white"
          >
            Top up credits
          </a>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 px-5 py-2 text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  )
}
