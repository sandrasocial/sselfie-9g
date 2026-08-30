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
          --suite-canvas: var(--ss-brand-chalk);
          --suite-paper: var(--ss-brand-paper);
          --suite-smoke: var(--ss-brand-parchment);
          --suite-mist: color-mix(in srgb, var(--ss-brand-parchment) 58%, white);
          --suite-steel: var(--ss-brand-taupe);
          --suite-slate: var(--ss-brand-slate);
          --suite-graphite: var(--ss-brand-carbon);
          --suite-night: var(--ss-brand-ink);
          --suite-accent: var(--ss-brand-ink);
          --suite-highlight: var(--ss-brand-champagne);
          --suite-highlight-ink: var(--ss-brand-champagne-ink);
          --suite-highlight-glow: var(--ss-brand-champagne-glow);
          --suite-glass-light: var(--ss-brand-glass-light);
          --suite-glass-dark: var(--ss-brand-glass-dark);
          --suite-glass-edge: var(--ss-brand-glass-edge);
          --suite-glass-blur: var(--ss-brand-glass-blur);
          --app-bg: var(--suite-canvas);
          --app-surface: var(--suite-paper);
          --app-elevated: var(--suite-paper);
          --app-border: var(--suite-mist);
          --app-text-primary: var(--suite-night);
          --app-text-secondary: var(--suite-slate);
          --app-text-muted: var(--suite-slate);
          --app-btn-primary-bg: var(--suite-night);
          --app-btn-primary-text: #ffffff;
          --app-btn-secondary-bg: color-mix(in srgb, var(--suite-slate) 8%, transparent);
          --app-btn-secondary-hover: color-mix(in srgb, var(--suite-slate) 14%, transparent);
          --app-input-bg: color-mix(in srgb, var(--suite-paper) 82%, transparent);
          --app-input-border: color-mix(in srgb, var(--suite-slate) 28%, transparent);
          --app-glass-bg: color-mix(in srgb, var(--suite-paper) 82%, transparent);
          --app-glass-border: color-mix(in srgb, var(--suite-steel) 82%, transparent);
          --app-focus-ring: color-mix(in srgb, var(--suite-slate) 42%, transparent);
          --calendar-stone-1: var(--ss-brand-parchment);
          --calendar-stone-2: var(--ss-brand-concrete);
          --calendar-stone-3: var(--ss-brand-silver);
          --calendar-stone-4: var(--ss-brand-taupe);
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
          background-color: rgba(250, 250, 249, 0.95);
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
          box-shadow: 0 12px 32px rgba(9, 9, 11, 0.055);
        }

        .studio-3-root .suite-state {
          border: 1px solid color-mix(in srgb, var(--suite-steel) 72%, transparent);
          border-left: 3px solid var(--suite-night);
          border-radius: 14px;
          background: var(--suite-paper);
        }

        .studio-3-root .suite-state--loading {
          display: flex;
          min-height: 64px;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
        }

        .studio-3-root .suite-state--error {
          border-left-color: var(--suite-night);
        }

        .studio-3-root .suite-state--empty {
          border-top: 3px solid var(--suite-night);
        }

        .studio-3-root .suite-state-pulse {
          width: 8px;
          height: 8px;
          flex: 0 0 auto;
          border-radius: 999px;
          background: var(--suite-highlight);
          box-shadow: 0 0 12px var(--suite-highlight-glow);
          animation: suite-state-pulse 1.5s ease-in-out infinite;
        }

        .studio-3-root .suite-dialog-backdrop {
          background: rgba(9, 9, 11, 0.74);
          backdrop-filter: blur(18px);
        }

        .studio-3-root .suite-dialog {
          border: 1px solid rgba(255, 255, 255, 0.58);
          border-radius: 24px;
          background: rgba(250, 250, 249, 0.9);
          box-shadow: 0 24px 90px rgba(9, 9, 11, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(118%);
        }

        @keyframes suite-state-pulse {
          0%, 100% { opacity: 0.45; transform: scale(0.86); }
          50% { opacity: 1; transform: scale(1); }
        }

        .studio-3-root .suite-maya-panel {
          background-color: rgba(250, 250, 249, 0.93);
          border-color: rgba(255, 255, 255, 0.72);
          box-shadow: 0 24px 72px rgba(9, 9, 11, 0.13), inset 0 1px 0 rgba(255, 255, 255, 0.88);
          backdrop-filter: blur(20px) saturate(110%);
        }

        .studio-3-root .suite-maya-panel[data-home-mode="true"] {
          box-shadow: none;
        }

        .studio-3-root .suite-maya-header {
          background: var(--suite-glass-dark);
          border-bottom: 1px solid var(--suite-glass-edge);
          box-shadow: inset 0 -1px 0 rgba(243, 230, 207, 0.28), 0 12px 34px rgba(9, 9, 11, 0.16);
          color: var(--suite-paper);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(125%);
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

        .studio-3-root .suite-maya-path-tabs {
          border-color: rgba(163, 163, 169, 0.32);
          background: rgba(255, 255, 255, 0.74);
          backdrop-filter: blur(18px) saturate(112%);
        }

        .studio-3-root .suite-maya-path-tab {
          border-color: rgba(163, 163, 169, 0.28);
        }

        .studio-3-root .suite-maya-path-tab--active {
          background: rgba(9, 9, 11, 0.94);
        }

        .studio-3-root .suite-maya-journey-steps {
          border-color: rgba(163, 163, 169, 0.28);
          background: rgba(250, 250, 249, 0.88);
        }

        .studio-3-root .suite-maya-thread {
          background:
            radial-gradient(circle at 76% 4%, rgba(255, 255, 255, 0.98), transparent 36%),
            var(--suite-canvas);
        }

        .studio-3-root .suite-maya-message {
          box-shadow: 0 10px 28px rgba(9, 9, 11, 0.055);
        }

        .studio-3-root .suite-maya-message--maya {
          border: 0;
          background: transparent;
          padding-left: 0;
          box-shadow: none;
        }

        .studio-3-root .suite-maya-message--user {
          border: 1px solid rgba(255, 255, 255, 0.12);
          border-radius: 18px 18px 4px 18px;
          background: rgba(9, 9, 11, 0.92);
          box-shadow: 0 10px 26px rgba(9, 9, 11, 0.14), inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .studio-3-root .suite-maya-composer {
          background: linear-gradient(to top, rgba(250, 250, 249, 0.98), rgba(250, 250, 249, 0.72));
          border-top-color: transparent;
          backdrop-filter: blur(14px);
        }

        .studio-3-root .suite-maya-composer-rail {
          border-color: rgba(255, 255, 255, 0.86);
          border-radius: 22px;
          background: var(--suite-glass-light);
          box-shadow: 0 14px 38px rgba(9, 9, 11, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.96);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(120%);
        }

        .studio-3-root .suite-maya-composer-rail:focus-within {
          border-color: rgba(243, 230, 207, 0.92);
          box-shadow: 0 0 0 1px rgba(243, 230, 207, 0.82), 0 0 18px var(--suite-highlight-glow), inset 0 1px 0 white;
        }

        .studio-3-root .suite-maya-send {
          background: var(--suite-night);
        }

        .studio-3-root .suite-maya-send:hover {
          background: var(--suite-graphite);
        }

        .studio-3-root .suite-maya-input:focus {
          box-shadow: none;
        }

        .studio-3-root .suite-concept-card {
          border: 1px solid rgba(163, 163, 169, 0.52);
          border-radius: 16px;
          box-shadow: 0 14px 34px rgba(9, 9, 11, 0.075);
        }

        .studio-3-root .suite-concept-card[data-concept-state="done"] {
          border-color: rgba(163, 163, 169, 0.52);
        }

        .studio-3-root .suite-concept-visual {
          border-bottom: 1px solid rgba(163, 163, 169, 0.46);
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-card {
          border: 1px solid rgba(255, 255, 255, 0.68);
          border-radius: 16px;
          box-shadow: 0 12px 30px rgba(9, 9, 11, 0.11);
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-direction-choice="true"]:hover,
        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-direction-choice="true"]:focus-within,
        .studio-3-root .suite-concept-direction-strip .suite-concept-card[data-concept-state="generating"] {
          position: relative;
          z-index: 1;
          box-shadow:
            inset 0 0 0 1px rgba(255, 255, 255, 0.9),
            0 0 0 1px var(--suite-highlight),
            0 0 20px var(--suite-highlight-glow);
        }

        .studio-3-root .suite-concept-direction-strip .suite-concept-visual {
          border-bottom-width: 1px;
        }

        .studio-3-root .suite-concept-body {
          background: var(--suite-paper);
        }

        .studio-3-root .suite-concept-eyebrow {
          color: var(--suite-slate);
        }

        .studio-3-root .suite-concept-card button,
        .studio-3-root .suite-concept-card input,
        .studio-3-root .suite-concept-card textarea {
          border-radius: 12px;
        }

        .studio-3-root .suite-concept-direction-strip {
          gap: 10px;
          border: 0;
          background: transparent;
        }

        .studio-3-root .suite-concept-result-rail {
          position: relative;
          z-index: 2;
          margin: -62px 12px 12px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.24);
          border-radius: 18px;
          background: rgba(9, 9, 11, 0.82);
          box-shadow: 0 14px 34px rgba(9, 9, 11, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(22px) saturate(118%);
        }

        .studio-3-root .suite-result-viewer {
          background:
            radial-gradient(circle at 50% 12%, rgba(255, 255, 255, 0.08), transparent 32%),
            var(--suite-night);
        }

        .studio-3-root .suite-result-header,
        .studio-3-root .suite-result-actions {
          border-color: rgba(255, 255, 255, 0.16);
          background: rgba(9, 9, 11, 0.78);
          box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(125%);
        }

        .studio-3-root .suite-result-stage {
          margin: 10px;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 22px;
          background: #111114;
          box-shadow: 0 22px 52px rgba(0, 0, 0, 0.36);
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
          inset-inline: 12px;
          bottom: max(10px, env(safe-area-inset-bottom));
          width: auto;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 22px;
          background-color: var(--suite-glass-dark);
          box-shadow: 0 18px 46px rgba(9, 9, 11, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(130%);
        }

        .studio-3-root .suite-bottom-nav-item {
          position: relative;
          border-top: 0;
        }

        .studio-3-root .suite-bottom-nav-item--active {
          background-color: rgba(255, 255, 255, 0.06);
          text-shadow: 0 0 10px var(--suite-highlight-glow);
        }

        .studio-3-root .suite-bottom-nav-item--active::after {
          position: absolute;
          inset: auto 24% 5px;
          height: 2px;
          border-radius: 999px;
          background: var(--suite-highlight);
          box-shadow: 0 0 12px var(--suite-highlight-glow);
          content: "";
        }

        .studio-3-root .suite-desktop-nav {
          inset: 12px auto 12px 12px;
          height: auto;
          overflow: hidden;
          border: 1px solid rgba(255, 255, 255, 0.18);
          border-radius: 26px;
          background: var(--suite-glass-dark);
          box-shadow: 0 20px 52px rgba(9, 9, 11, 0.32), inset 0 1px 0 rgba(255, 255, 255, 0.18);
          backdrop-filter: blur(var(--suite-glass-blur)) saturate(130%);
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
          color: #fffaf0;
          font-family: var(--font-app-signature), var(--ss-brand-signature);
          font-weight: 400;
          text-shadow:
            0 0 2px rgba(255, 250, 239, 0.98),
            0 0 8px rgba(243, 230, 207, 0.88),
            0 0 18px rgba(243, 230, 207, 0.64);
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
          background: #fffaf0;
          box-shadow:
            0 0 4px #fffaf0,
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
          box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.96), 0 0 12px rgba(243, 230, 207, 0.36);
        }

        .studio-3-root .suite-maya-path-tab--active {
          box-shadow:
            inset 0 -2px 0 var(--suite-highlight),
            0 5px 15px rgba(243, 230, 207, 0.2);
        }

        .studio-3-root .suite-selfie-selected {
          border-color: var(--suite-highlight-ink);
          box-shadow:
            0 0 0 2px var(--suite-highlight),
            0 0 16px rgba(243, 230, 207, 0.38);
        }

        .studio-3-root .font-serif {
          font-family: var(--font-app-serif), Georgia, "Times New Roman", serif;
        }

        @media (prefers-reduced-motion: reduce) {
          .studio-3-root .suite-neon-sign,
          .studio-3-root .suite-maya-neon-mark {
            text-shadow: 0 0 2px rgba(255, 250, 239, 0.98), 0 0 8px rgba(243, 230, 207, 0.58);
          }
        }

        @supports not (backdrop-filter: blur(1px)) {
          .studio-3-root .suite-desktop-nav,
          .studio-3-root .suite-bottom-nav,
          .studio-3-root .suite-maya-header,
          .studio-3-root .suite-concept-result-rail {
            background: rgba(9, 9, 11, 0.96);
          }

          .studio-3-root .suite-maya-composer-rail,
          .studio-3-root .suite-dialog {
            background: rgba(250, 250, 249, 0.98);
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
