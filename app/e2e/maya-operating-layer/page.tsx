import { notFound } from "next/navigation"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"

export const dynamic = "force-dynamic"

export default async function MayaOperatingLayerE2EPage({
  searchParams,
}: {
  searchParams: Promise<{ home?: string }>
}) {
  if (process.env.PLAYWRIGHT_TEST !== "1") notFound()
  const params = await searchParams

  return (
    <AppV3Shell
      firstName="Maya QA"
      accessLevel="full"
      analyticsCohort="admin"
      initialSection="create"
      hasVaultAccess
      trialHasSavedSelfie
      primarySelfieUrl="https://example.com/maya-qa-selfie.jpg"
      mayaOperatingLayerEnabled
      mayaHomeEnabled={params.home !== "0"}
    />
  )
}
