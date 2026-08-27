import { notFound } from "next/navigation"
import AppV3Layout from "@/app/app/layout"
import { AppV3Shell } from "@/components/app-v3/app-v3-shell"
import { resolveAppV3InitialSection } from "@/lib/app-v3/navigation"

export const dynamic = "force-dynamic"

export default async function MayaOperatingLayerE2EPage({
  searchParams,
}: {
  searchParams: Promise<{
    home?: string
    member?: string
    cohort?: string
    view?: string | string[]
  }>
}) {
  if (process.env.PLAYWRIGHT_TEST !== "1") notFound()
  const params = await searchParams
  const isNewMember = params.member === "new"

  return (
    <AppV3Layout>
      <AppV3Shell
        firstName="Maya QA"
        accessLevel="full"
        analyticsCohort={params.cohort === "member" ? "member" : "admin"}
        initialSection={resolveAppV3InitialSection(params.view)}
        hasVaultAccess
        trialHasSavedSelfie={!isNewMember}
        primarySelfieUrl={isNewMember ? null : "https://example.com/maya-qa-selfie.jpg"}
        mayaOperatingLayerEnabled
        mayaHomeEnabled={params.home !== "0"}
      />
    </AppV3Layout>
  )
}
