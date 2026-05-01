export default function LoadingScreen() {
  return (
    <div className="relative flex h-screen items-center justify-center overflow-hidden bg-[#0F0D0B]">
      <svg className="pointer-events-none absolute inset-0 h-full w-full opacity-[0.055] mix-blend-screen" aria-hidden>
        <filter id="sselfie-app-intro-noise" x="0%" y="0%" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="4" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#sselfie-app-intro-noise)" />
      </svg>

      <div className="relative z-10 px-6 text-center sm:px-8">
        <div className="space-y-4">
          <h1 className="text-[#F4F0E6] text-[clamp(28px,6vw,64px)] font-serif font-light tracking-[0.36em] uppercase leading-none [text-shadow:0_2px_8px_rgba(0,0,0,0.8),0_-1px_0_rgba(255,255,255,0.06),1px_1px_0_rgba(0,0,0,0.5)]">
            SSELFIE
          </h1>
          <div className="mx-auto h-px w-[min(220px,54vw)] overflow-hidden bg-[rgba(244,240,230,0.28)]">
            <div
              className="h-full w-1/2 bg-[#F4F0E6]/70"
              style={{ animation: "sselfie-app-intro-line 1.6s cubic-bezier(0.22, 1, 0.36, 1) infinite" }}
            />
          </div>
          <p className="text-[10px] font-light uppercase tracking-[0.42em] text-[rgba(244,240,230,0.58)] sm:text-xs">
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
