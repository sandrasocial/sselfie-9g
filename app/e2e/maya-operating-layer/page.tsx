import { notFound } from "next/navigation"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"
import { resolveAppV3InitialSection } from "@/lib/app-v3/navigation"

export const dynamic = "force-dynamic"

export default async function MayaOperatingLayerE2EPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string; view?: string | string[] }>
}) {
  if (process.env.PLAYWRIGHT_TEST !== "1") notFound()
  const params = await searchParams

  return (
    <AppV3Shell
      firstName="Maya QA"
      accessLevel="full"
      analyticsCohort="admin"
      initialSection={resolveAppV3InitialSection(params.view)}
      hasVaultAccess
      trialHasSavedSelfie
      primarySelfieUrl="https://example.com/maya-qa-selfie.jpg"
      mayaOperatingLayerEnabled
      mayaHomeEnabled={params.home !== "0"}
    />
  )
}
