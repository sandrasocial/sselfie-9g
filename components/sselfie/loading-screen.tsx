export default function LoadingScreen() {
  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[color:var(--color-obsidian)]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055] mix-blend-screen" aria-hidden>
        <filter id="sselfie-app-intro-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sselfie-app-intro-noise)" />
      </svg>

      <div className="relative z-10 px-6 text-center sm:px-8">
        <div className="space-y-4">
          <h1 className="text-[color:var(--color-porcelain)] text-[clamp(28px,6vw,64px)] font-serif font-light tracking-[0.36em] uppercase leading-none [text-shadow:var(--lp-dark)]">
            SSELFIE
          </h1>
          <div className="mx-auto h-px w-[min(220px,54vw)] overflow-hidden bg-[color-mix(in_srgb,var(--color-whisper)_28%,transparent)]">
            <div
              className="h-full w-1/2 bg-[color-mix(in_srgb,var(--color-porcelain)_70%,transparent)]"
              style={{ animation: "sselfie-app-intro-line 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite" }}
            />
          </div>
          <p className="text-[10px] font-light uppercase tracking-[0.42em] text-[color-mix(in_srgb,var(--color-whisper)_58%,transparent)] sm:text-xs">
            Studio
          </p>
        </div>
      </div>
      <style>{`
        @keyframes sselfie-app-intro-line {
          0% { transform: translateX(-120%); opacity: 0; }
          30% { opacity: 1; }
          100% { transform: translateX(220%); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
