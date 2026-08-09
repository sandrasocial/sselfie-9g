// SSELFIE Studio 3.0 - isolated layout for the /app route.
// Loads the brand display + body fonts and scopes a serif mapping so headings render in
// Cormorant Garamond per the design system, without touching global Tailwind config.

import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Cormorant_Garamond, Manrope } from "next/font/google"

const displaySerif = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-app-serif",
  display: "swap",
})

const bodySans = Manrope({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-app-sans",
  display: "swap",
})

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AppV3Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`studio-3-root ${displaySerif.variable} ${bodySans.variable}`}
      style={{ fontFamily: "var(--font-app-sans), system-ui, sans-serif" }}
    >
      {/* Scoped to /app only (two-class specificity beats Tailwind's .font-serif). */}
      <style>{`
        html:has(.studio-3-root),
        body:has(.studio-3-root) {
          width: 100%;
          max-width: 100vw;
          overflow-x: hidden;
          overflow-x: clip;
          overscroll-behavior-x: none;
        }

        .studio-3-root {
          --suite-canvas: #f4f7f8;
          --suite-paper: #fcfdfd;
          --suite-smoke: #e3e8eb;
          --suite-mist: #d7e0e5;
          --suite-steel: #aeb9c1;
          --suite-slate: #5d6a73;
          --suite-graphite: #252c31;
          --suite-night: #0d0e10;
          position: relative;
          isolation: isolate;
          width: 100%;
          max-width: 100vw;
          min-height: 100dvh;
          overflow-x: hidden;
          overflow-x: clip;
          overscroll-behavior-x: none;
          touch-action: pan-y pinch-zoom;
        }

        .studio-3-root .suite-canvas {
          background-color: var(--suite-canvas);
          box-shadow: inset 0 0 120px rgba(93, 106, 115, 0.09);
          color: var(--suite-night);
        }

        .studio-3-root [class~="bg-[#F8FAFA]"] {
          background-color: var(--suite-canvas);
        }

        .studio-3-root [class~="bg-[#F8FAFA]/95"] {
          background-color: rgba(244, 247, 248, 0.95);
        }

        .studio-3-root [class~="bg-[#F1F2F2]"] {
          background-color: var(--suite-smoke);
        }

        .studio-3-root [class~="bg-[#ECEDED]"],
        .studio-3-root [class~="bg-[#E7E8E8]"] {
          background-color: var(--suite-mist);
        }

        .studio-3-root [class~="bg-white"] {
          background-color: var(--suite-paper);
        }

        .studio-3-root [class~="bg-white/95"] {
          background-color: rgba(252, 253, 253, 0.95);
        }

        .studio-3-root [class~="bg-white/90"] {
          background-color: rgba(252, 253, 253, 0.9);
        }

        .studio-3-root [class~="bg-white/85"] {
          background-color: rgba(252, 253, 253, 0.85);
        }

        .studio-3-root [class~="bg-white/80"] {
          background-color: rgba(252, 253, 253, 0.8);
        }

        .studio-3-root [class~="bg-white/70"] {
          background-color: rgba(252, 253, 253, 0.7);
        }

        .studio-3-root [class*="border-[#C5C6C8]"] {
          border-color: rgba(174, 185, 193, 0.78);
        }

        .studio-3-root [class*="text-[#818283]"] {
          color: var(--suite-slate);
        }

        .studio-3-root [class*="text-[#4F5052]"] {
          color: #46535d;
        }

        .studio-3-root [class*="text-[#282728]"] {
          color: var(--suite-graphite);
        }

        .studio-3-root .suite-page {
          color: var(--suite-night);
        }

        .studio-3-root .suite-card {
          background-color: var(--suite-paper);
          border-color: rgba(174, 185, 193, 0.82);
          box-shadow:
            0 14px 34px rgba(37, 44, 49, 0.07),
            inset 0 1px 0 rgba(255, 255, 255, 0.88);
        }

        .studio-3-root .suite-maya-panel {
          background-color: var(--suite-canvas);
          border-color: rgba(174, 185, 193, 0.82);
          box-shadow: 0 24px 72px rgba(37, 44, 49, 0.12);
        }

        .studio-3-root .suite-bottom-nav {
          background-color: rgba(215, 224, 229, 0.94);
          border-color: rgba(93, 106, 115, 0.3);
          box-shadow: 0 -12px 34px rgba(37, 44, 49, 0.1);
        }

        .studio-3-root .suite-bottom-nav-item {
          border-top: 2px solid transparent;
        }

        .studio-3-root .suite-bottom-nav-item--active {
          border-top-color: var(--suite-slate);
          background-color: rgba(252, 253, 253, 0.72);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.9);
        }

        .studio-3-root .font-serif {
          font-family: var(--font-app-serif), Georgia, "Times New Roman", serif;
        }

        @media (max-width: 767px) {
          .studio-3-root input,
          .studio-3-root textarea,
          .studio-3-root select {
            font-size: 16px !important;
          }
        }
      `}</style>
      {children}
    </div>
  )
}
