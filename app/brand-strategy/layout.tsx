import type { Metadata } from "next"

// This page requires authentication and shows private generated content - do not index
export const metadata: Metadata = {
  robots: { index: false, follow: false },
}

export default function BrandStrategyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
