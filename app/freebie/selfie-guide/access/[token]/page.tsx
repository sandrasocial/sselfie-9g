import { redirect } from "next/navigation"

interface PageProps {
  params: Promise<{ token: string }>
}

export default async function LegacyFreebieSelfieGuideAccessPage({ params }: PageProps) {
  const { token } = await params
  redirect(`/selfie-guide/access/${token}`)
}
