// SSELFIE Studio 3.0 — isolated layout for the /app route.
// Loads the brand display + body fonts and scopes a serif mapping so headings render in
// Cormorant Garamond per the design system, without touching global Tailwind config.

import type { ReactNode } from "react"
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

export default function AppV3Layout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`studio-3-root ${displaySerif.variable} ${bodySans.variable}`}
      style={{ fontFamily: "var(--font-app-sans), system-ui, sans-serif" }}
    >
      {/* Scoped to /app only (two-class specificity beats Tailwind's .font-serif). */}
      <style>{`.studio-3-root .font-serif{font-family:var(--font-app-serif),Georgia,"Times New Roman",serif;}`}</style>
      {children}
    </div>
  )
}
