import type { Metadata } from "next"

import { SelfieToBrandShootCourseShell } from "@/components/selfie-to-brand-shoot/course-shell-v1"

export const metadata: Metadata = {
  title: "Preview · Selfie to Brand Shoot",
  robots: {
    index: false,
    follow: false,
  },
}

export default function AdminSelfieToBrandShootPreviewPage() {
  return (
    <SelfieToBrandShootCourseShell
      firstName="Sandra"
      vaultHref="/academy/access/prompt-vault"
      accessMode="academy"
      hasPromptVaultAccess
      hasStudioAccess
    />
  )
}
