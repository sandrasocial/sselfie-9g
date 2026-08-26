// SSELFIE Studio 3.0 - isolated layout for the /app route.
// Loads the brand display + body fonts and scopes a serif mapping so headings render in
// Cormorant Garamond per the design system, without touching global Tailwind config.

import type { ReactNode } from "react"
import type { Metadata } from "next"
import { Allura, Cormorant_Garamond, Manrope } from "next/font/google"

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

const signatureScript = Allura({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-app-signature",
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
      className={`studio-3-root ${displaySerif.variable} ${bodySans.variable} ${signatureScript.variable}`}
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
          --suite-canvas: var(--ss-brand-ivory);
          --suite-paper: var(--ss-brand-paper);
          --suite-smoke: var(--ss-brand-parchment);
          --suite-mist: color-mix(in srgb, var(--ss-brand-parchment) 58%, white);
          --suite-steel: var(--ss-brand-taupe);
          --suite-slate: var(--ss-brand-slate);
          --suite-graphite: var(--ss-brand-carbon);
          --suite-night: var(--ss-brand-ink);
          --suite-accent: var(--ss-brand-espresso);
          --suite-highlight: var(--ss-brand-champagne);
          --suite-highlight-ink: var(--ss-brand-champagne-ink);
          --suite-highlight-glow: var(--ss-brand-champagne-glow);
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
          background-color: rgba(247, 242, 234, 0.95);
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
          border-color: color-mix(in srgb, var(--suite-steel) 72%, transparent);
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
          border-color: color-mix(in srgb, var(--suite-steel) 72%, transparent);
          box-shadow: 0 10px 28px rgba(52, 42, 36, 0.05);
        }

        .studio-3-root .suite-maya-panel {
          background-color: var(--suite-paper);
          border-color: color-mix(in srgb, var(--suite-steel) 72%, transparent);
          box-shadow: 0 24px 72px rgba(13, 14, 16, 0.14);
        }

        .studio-3-root .suite-maya-panel[data-home-mode="true"] {
          box-shadow: none;
        }

        .studio-3-root .suite-maya-header {
          background: var(--suite-night);
          border-bottom: 1px solid var(--suite-highlight);
          box-shadow: 0 1px 18px var(--suite-highlight-glow);
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
          border-right-color: var(--suite-highlight);
        }

        .studio-3-root .suite-maya-composer {
          background: var(--suite-ivory, var(--suite-canvas));
          border-top-color: var(--suite-night);
        }

        .studio-3-root .suite-maya-composer-rail {
          border-color: color-mix(in srgb, var(--suite-steel) 72%, transparent);
          background: var(--suite-paper);
        }

        .studio-3-root .suite-maya-composer-rail:focus-within {
          border-color: var(--suite-highlight-ink);
          box-shadow: 0 0 0 1px var(--suite-highlight), 0 0 14px rgba(215, 182, 126, 0.18);
        }

        .studio-3-root .suite-maya-send {
          background: var(--suite-night);
        }

        .studio-3-root .suite-maya-send:hover {
          background: var(--suite-accent);
        }

        .studio-3-root .suite-maya-input:focus {
          box-shadow: none;
        }

        .studio-3-root .suite-concept-card {
          border: 1px solid var(--suite-night);
          border-top: 1px solid var(--suite-night);
          box-shadow: none;
        }

        .studio-3-root .suite-concept-card[data-concept-state="done"] {
          border-top-color: var(--suite-night);
        }

        .studio-3-root .suite-concept-visual {
          border-bottom: 3px solid var(--suite-night);
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-card {
          border: 0;
          border-radius: 0;
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-direction-choice="true"]:hover,
        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-direction-choice="true"]:focus-within,
        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-concept-state="generating"] {
          position: relative;
          z-index: 1;
          box-shadow:
            inset 0 0 0 2px var(--suite-highlight),
            0 0 16px var(--suite-highlight-glow);
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-visual {
          border-bottom-width: 1px;
        }

        .studio-3-root .suite-concept-body {
          background: var(--suite-paper);
        }

        .studio-3-root .suite-concept-eyebrow {
          color: var(--suite-highlight-ink);
        }

        .studio-3-root .suite-concept-card button,
        .studio-3-root .suite-concept-card input,
        .studio-3-root .suite-concept-card textarea {
          border-radius: 2px;
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

        .studio-3-root .suite-calendar-canvas {
          border-color: rgba(197, 198, 200, 0.82);
          border-radius: 4px;
          box-shadow: none;
          backdrop-filter: none;
        }

        .studio-3-root .suite-calendar-header {
          background: var(--suite-paper);
          border-color: rgba(197, 198, 200, 0.82);
          border-top: 3px solid var(--suite-night);
          border-radius: 2px;
          box-shadow: none;
        }

        .studio-3-root .suite-calendar-tabs {
          background: var(--suite-night);
          border-bottom-color: var(--suite-accent);
        }

        .studio-3-root .suite-calendar-tabs [aria-pressed="true"] {
          background: var(--suite-accent);
          border-color: var(--suite-accent);
        }

        .studio-3-root .suite-calendar-grid {
          background: var(--suite-night);
          border: 3px solid var(--suite-night);
          gap: 3px;
          padding: 0;
          box-shadow: none;
        }

        .studio-3-root .suite-calendar-post {
          border-radius: 1px;
        }

        .studio-3-root .suite-calendar-post[aria-pressed="true"] {
          border-color: var(--suite-accent);
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
          border-top-color: var(--suite-highlight);
          background-color: color-mix(in srgb, var(--suite-accent) 74%, transparent);
          text-shadow: 0 0 10px var(--suite-highlight-glow);
        }

        .studio-3-root .suite-desktop-nav-item::before {
          background: transparent;
          content: "";
          inset: 0 auto 0 0;
          position: absolute;
          width: 3px;
        }

        .studio-3-root .suite-desktop-nav-item--active::before {
          background: var(--suite-highlight);
          box-shadow: 0 0 12px var(--suite-highlight-glow);
        }

        .studio-3-root .suite-neon-sign,
        .studio-3-root .suite-maya-neon-mark {
          color: #f8e7c7;
          font-family: var(--font-app-signature), var(--ss-brand-signature);
          font-weight: 400;
          text-shadow:
            0 0 2px rgba(255, 250, 239, 0.98),
            0 0 8px rgba(232, 197, 139, 0.88),
            0 0 18px rgba(215, 182, 126, 0.64);
        }

        .studio-3-root .suite-neon-sign {
          position: relative;
          display: grid;
          width: fit-content;
          transform: rotate(-2deg);
          font-size: 38px;
          line-height: 0.76;
          letter-spacing: 0.01em;
        }

        .studio-3-root .suite-neon-sign span:last-child {
          margin-left: 8px;
        }

        .studio-3-root .suite-neon-spark {
          position: absolute;
          right: -24px;
          bottom: -10px;
          width: 7px;
          height: 7px;
          border-radius: 999px;
          background: #fff8e8;
          box-shadow:
            0 0 4px #fff8e8,
            0 0 13px var(--suite-highlight),
            0 0 24px var(--suite-highlight);
        }

        .studio-3-root .suite-maya-neon-mark {
          display: inline-block;
          margin-left: 0.5rem;
          transform: translateY(0.15rem) rotate(-3deg);
          font-size: 21px;
          line-height: 1;
          text-transform: none;
          letter-spacing: 0;
        }

        .studio-3-root .suite-maya-avatar {
          border-color: var(--suite-highlight);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.96), 0 0 10px rgba(215, 182, 126, 0.3);
        }

        .studio-3-root .suite-maya-path-tab--active {
          box-shadow:
            inset 0 -2px 0 var(--suite-highlight),
            0 5px 15px rgba(215, 182, 126, 0.14);
        }

        .studio-3-root .suite-selfie-selected {
          border-color: var(--suite-highlight-ink);
          box-shadow:
            0 0 0 2px var(--suite-highlight),
            0 0 14px rgba(215, 182, 126, 0.28);
        }

        .studio-3-root .font-serif {
          font-family: var(--font-app-serif), Georgia, "Times New Roman", serif;
        }

        @media (prefers-reduced-motion: reduce) {
          .studio-3-root .suite-neon-sign,
          .studio-3-root .suite-maya-neon-mark {
            text-shadow: 0 0 2px rgba(255, 250, 239, 0.98), 0 0 8px rgba(215, 182, 126, 0.58);
          }
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
