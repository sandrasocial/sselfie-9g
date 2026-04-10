import type { Metadata } from "next"
import type { ReactNode } from "react"

export const metadata: Metadata = {
  title: "Editorial generator · SSELFIE",
  description: "Create luxury editorial images for your brand — layout, type, and export.",
}

export default function EditorialGeneratorLayout({ children }: { children: ReactNode }) {
  return children
}
