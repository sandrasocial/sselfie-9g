import type { Metadata } from "next"

import { SelfieToBrandShootSystemShell } from "@/components/selfie-to-brand-shoot/system-shell"

export const metadata: Metadata = {
  title: "Preview · Selfie to Brand Shoot",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminSelfieToBrandShootPreviewPage() {
  return (
    <SelfieToBrandShootSystemShell
      firstName="Sandra"
      vaultHref="/academy/access/prompt-vault"
      accessMode="academy"
      hasPromptVaultAccess
      hasStudioAccess
    />
  )
}
