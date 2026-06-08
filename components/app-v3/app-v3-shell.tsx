"use client"

// SSELFIE Studio 3.0 — app shell.
// Composes the Visual Front Door + the Maya Concierge under the handoff provider.
// Isolated tree: imports only from components/app-v3/ and lib/. No components/sselfie/.

import { ConciergeProvider } from "./concierge-context"
import { VisualFrontDoor } from "./visual-front-door"
import { MayaConcierge } from "./maya-concierge"

export interface AppV3ShellProps {
  /** Authenticated admin/member display name, for a light personal greeting later. */
  firstName?: string | null
}

export function AppV3Shell(_props: AppV3ShellProps) {
  return (
    <ConciergeProvider>
      <main className="min-h-screen bg-[#F8FAFA] text-[#0D0E10]">
        <VisualFrontDoor />
        <MayaConcierge />
      </main>
    </ConciergeProvider>
  )
}

export default AppV3Shell
