import { notFound, redirect } from "next/navigation"
import { getAuthenticatedUser } from "@/lib/auth-helper"
import { getEffectiveNeonUser } from "@/lib/simple-impersonation"
import { getMayaGeneratedAsset } from "@/lib/maya/asset-generation"

interface MayaAssetPageProps {
  params: Promise<{ assetId: string }>
}

export default async function MayaAssetPage({ params }: MayaAssetPageProps) {
  const { user, error } = await getAuthenticatedUser()
  if (error || !user) {
    redirect("/auth/login")
  }

  const neonUser = await getEffectiveNeonUser(user.id)
  if (!neonUser) {
    notFound()
  }

  const { assetId } = await params
  const asset = await getMayaGeneratedAsset(neonUser.id, assetId)
  if (!asset) {
    notFound()
  }

  return (
    <main className="min-h-screen bg-[#0d0c0b] p-4 md:p-8">
      <div className="mx-auto max-w-6xl rounded-2xl border border-[rgba(195,190,182,0.25)] bg-[rgba(175,170,162,0.10)] p-3 md:p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="text-xs uppercase tracking-[0.16em] text-[#a8a49c]">{asset.title}</div>
          <a
            href={`/api/maya/generated-assets/${encodeURIComponent(asset.id)}/html`}
            target="_blank"
            rel="noreferrer"
            className="rounded-full border border-[rgba(195,190,182,0.25)] px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#f0ede8]"
          >
            Open Raw HTML
          </a>
        </div>
        <iframe
          title={asset.title}
          src={`/api/maya/generated-assets/${encodeURIComponent(asset.id)}/html`}
          className="h-[84vh] w-full rounded-xl border border-[rgba(195,190,182,0.15)] bg-white"
        />
      </div>
    </main>
  )
}
