import type { ReactNode } from "react"
import { Cormorant_Garamond, Manrope } from "next/font/google"

const display = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--ss-brand-display-loaded",
  display: "swap",
})

const sans = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--ss-brand-sans-loaded",
  display: "swap",
})

export default function DesignSystemLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`${display.variable} ${sans.variable}`}
      style={
        {
          "--ss-brand-display":
            "var(--ss-brand-display-loaded), 'Cormorant Garamond', Georgia, serif",
          "--ss-brand-sans": "var(--ss-brand-sans-loaded), Manrope, Inter, Arial, sans-serif",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  )
}
