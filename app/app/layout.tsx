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
          --suite-canvas: var(--ss-brand-chalk);
          --suite-paper: var(--ss-brand-paper);
          --suite-smoke: var(--ss-brand-concrete);
          --suite-mist: var(--ss-brand-concrete);
          --suite-steel: var(--ss-brand-silver);
          --suite-slate: var(--ss-brand-slate);
          --suite-graphite: var(--ss-brand-carbon);
          --suite-night: var(--ss-brand-ink);
          --suite-accent: var(--ss-brand-oxblood);
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
          color: var(--suite-night);
        }

        .studio-3-root [class~="bg-[#F8FAFA]"] {
          background-color: var(--suite-canvas);
        }

        .studio-3-root [class~="bg-[#F8FAFA]/95"] {
          background-color: rgba(247, 247, 245, 0.95);
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
          background-color: rgba(255, 255, 255, 0.95);
        }

        .studio-3-root [class~="bg-white/90"] {
          background-color: rgba(255, 255, 255, 0.9);
        }

        .studio-3-root [class~="bg-white/85"] {
          background-color: rgba(255, 255, 255, 0.85);
        }

        .studio-3-root [class~="bg-white/80"] {
          background-color: rgba(255, 255, 255, 0.8);
        }

        .studio-3-root [class~="bg-white/70"] {
          background-color: rgba(255, 255, 255, 0.7);
        }

        .studio-3-root [class*="border-[#C5C6C8]"] {
          border-color: rgba(197, 198, 200, 0.78);
        }

        .studio-3-root [class*="text-[#818283]"] {
          color: var(--suite-slate);
        }

        .studio-3-root [class*="text-[#4F5052]"] {
          color: var(--suite-slate);
        }

        .studio-3-root [class*="text-[#282728]"] {
          color: var(--suite-graphite);
        }

        .studio-3-root .suite-page {
          color: var(--suite-night);
        }

        .studio-3-root .suite-card {
          background-color: var(--suite-paper);
          border-color: rgba(197, 198, 200, 0.82);
          box-shadow: 0 10px 28px rgba(13, 14, 16, 0.05);
        }

        .studio-3-root .suite-maya-panel {
          background-color: var(--suite-paper);
          border-color: rgba(197, 198, 200, 0.82);
          box-shadow: 0 24px 72px rgba(13, 14, 16, 0.14);
        }

        .studio-3-root .suite-maya-header {
          background: var(--suite-night);
          border-bottom: 3px solid var(--suite-accent);
          color: var(--suite-paper);
        }

        .studio-3-root .suite-maya-header [class*="text-[#6D6E70]"],
        .studio-3-root .suite-maya-header [class*="text-[#4F5052]"] {
          color: rgba(255, 255, 255, 0.68);
        }

        .studio-3-root .suite-maya-header [class*="text-[#0D0E10]"] {
          color: var(--suite-paper);
        }

        .studio-3-root .suite-maya-header button:hover {
          color: var(--suite-paper);
        }

        .studio-3-root .suite-maya-header #maya-workspace-menu button {
          color: var(--suite-slate);
        }

        .studio-3-root .suite-maya-header #maya-workspace-menu button:hover {
          color: var(--suite-night);
        }

        .studio-3-root .suite-maya-thread {
          background:
            linear-gradient(90deg, rgba(197, 198, 200, 0.2) 1px, transparent 1px) 0 0 / 25% 100%,
            var(--suite-canvas);
        }

        .studio-3-root .suite-maya-message {
          box-shadow: none;
        }

        .studio-3-root .suite-maya-message--maya {
          border-left: 3px solid var(--suite-night);
        }

        .studio-3-root .suite-maya-message--user {
          background: var(--suite-accent);
        }

        .studio-3-root .suite-maya-composer {
          background: var(--suite-paper);
          border-top-color: var(--suite-night);
        }

        .studio-3-root .suite-maya-send {
          background: var(--suite-accent);
        }

        .studio-3-root .suite-maya-input:focus {
          border-color: var(--suite-accent);
          box-shadow: 0 0 0 3px rgba(152, 24, 38, 0.08);
        }

        .studio-3-root .suite-account-card {
          box-shadow: none;
        }

        .studio-3-root .suite-account-card--primary {
          border-top: 3px solid var(--suite-night);
        }

        .studio-3-root .suite-account-primary--accent {
          background: var(--suite-accent);
        }

        .studio-3-root .suite-account-primary--accent:hover {
          background: var(--suite-night);
        }

        .studio-3-root .suite-bottom-nav {
          background-color: var(--suite-night);
          border-color: rgba(255, 255, 255, 0.12);
          box-shadow: 0 -12px 34px rgba(13, 14, 16, 0.18);
        }

        .studio-3-root .suite-bottom-nav-item {
          border-top: 2px solid transparent;
        }

        .studio-3-root .suite-bottom-nav-item--active {
          border-top-color: var(--suite-accent);
          background-color: rgba(152, 24, 38, 0.2);
        }

        .studio-3-root .suite-desktop-nav-item::before {
          background: transparent;
          content: "";
          inset: 0 auto 0 0;
          position: absolute;
          width: 3px;
        }

        .studio-3-root .suite-desktop-nav-item--active::before {
          background: var(--suite-accent);
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
