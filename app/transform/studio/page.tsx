import { redirect } from "next/navigation"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { getUserCredits } from "@/lib/credits"
import { TransformStudio } from "@/components/transform/transform-studio"

export const metadata = {
  title: "SSELFIE Transform",
  description: "Transform your selfie into stunning editorial photos with AI.",
}

export default async function TransformStudioPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string; style?: string }>
}) {
  const params = await searchParams
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect("/auth/login?returnTo=/transform/studio")
  }

  const neonUser = await getUserByAuthId(authUser.id)
  if (!neonUser) {
    redirect("/auth/login?returnTo=/transform/studio")
  }

  const credits = await getUserCredits(String(neonUser.id)).catch(() => 0)
  const checkoutSuccess = params.checkout === "success"
  const initialStyleSlug = typeof params.style === "string" ? params.style : null

  return (
    <TransformStudio
      credits={credits}
      userId={String(neonUser.id)}
      checkoutSuccess={checkoutSuccess}
      initialStyleSlug={initialStyleSlug}
    />
  )
}
