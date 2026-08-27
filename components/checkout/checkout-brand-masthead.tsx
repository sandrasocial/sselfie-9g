import Link from "next/link"

export function CheckoutBrandMasthead() {
  return (
    <header className="relative flex min-h-16 items-center justify-between border-b border-white/10 bg-[#09090B] px-5 text-white sm:px-8">
      <Link
        href="/"
        aria-label="SSELFIE home"
        className="font-['Cormorant_Garamond'] text-lg font-light uppercase tracking-[0.32em] text-white no-underline sm:text-xl"
      >
        SSELFIE
      </Link>

      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-3 whitespace-nowrap font-[var(--ss-brand-signature)] text-[1.1rem] leading-none text-[#F3E6CF] sm:text-[1.35rem]"
        style={{
          textShadow:
            "0 0 2px rgba(255,250,240,0.96), 0 0 8px rgba(243,230,207,0.44), 0 0 18px rgba(243,230,207,0.3)",
        }}
      >
        Worth posting.
        <i className="absolute -right-2 -top-0.5 h-[3px] w-[3px] rounded-full bg-[#F3E6CF] shadow-[0_0_4px_rgba(255,250,240,0.95),0_0_10px_rgba(243,230,207,0.44)]" />
      </span>

      <span className="hidden text-[10px] font-medium uppercase tracking-[0.2em] text-white/65 sm:inline">
        Secure checkout
      </span>
    </header>
  )
}
