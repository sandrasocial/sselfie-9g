"use client"

import { ConciergeProvider } from "@/components/app-v3/concierge-context"
import { VisualFrontDoor } from "@/components/app-v3/visual-front-door"
import { MayaConcierge } from "@/components/app-v3/maya-concierge"

// MAYA-ADMIN-01: the same Maya members use, mounted inside admin with the admin persona
// (server-gated in /api/app-v3/maya/chat). Vault vibes are the front door: pick a
// collection to keep its world, then change outfits/locations in chat. Her selfies,
// side profile, full body and inspiration images all work exactly like /app.

export function AdminMaya() {
  return (
    <ConciergeProvider>
      <section className="mt-8">
        <VisualFrontDoor
          compact
          eyebrow="Maya · Admin"
          title="Pick a vault vibe. Keep the world, change anything."
          subtitle="Tap a collection and Maya holds its exact styling DNA. Then tell her what to swap: outfit, location, season, props."
          note={null}
        />
        <MayaConcierge admin />
      </section>
    </ConciergeProvider>
  )
}
