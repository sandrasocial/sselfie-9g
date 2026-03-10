"use client"

import { useEffect, useState } from "react"

import type {
  MayaGeneratedAsset,
  MayaGeneratedAssetPreviewData,
  MayaGeneratedAssetType,
} from "@/lib/maya/generated-asset-types"

import { MayaInlineAction, MayaInlineCard, MayaInlinePill } from "./maya-inline-card"

interface MayaGeneratedAssetCardProps {
  assetType: MayaGeneratedAssetType
  assetLabel: string
  assetId?: string | null
  previewText?: string
  url?: string
}

type AssetState =
  | { status: "idle"; asset: MayaGeneratedAsset | null }
  | { status: "loading"; asset: MayaGeneratedAsset | null }
  | { status: "ready"; asset: MayaGeneratedAsset | null }
  | { status: "error"; asset: MayaGeneratedAsset | null; message: string }

function getAssetTitle(assetType: MayaGeneratedAssetType, fallback: string) {
  if (fallback.trim().length > 0) return fallback.trim()
  if (assetType === "calendar") return "Content Calendar"
  if (assetType === "pdf") return "Workbook"
  return "Landing Page"
}

function getAssetEyebrow(assetType: MayaGeneratedAssetType) {
  if (assetType === "calendar") return "Content Calendar"
  if (assetType === "pdf") return "Workbook Draft"
  return "Page Draft"
}

function getAssetOpenUrl(assetId?: string | null) {
  if (!assetId) return null
  return `/maya/asset/${encodeURIComponent(assetId)}`
}

function renderPreviewBody(previewData: MayaGeneratedAssetPreviewData | undefined, asset: MayaGeneratedAsset | null) {
  if (!previewData) {
    return (
      <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-sm leading-relaxed text-[color:var(--text-accent)]">
        {asset?.previewText || "Draft created. Keep iterating with Maya in this chat."}
      </div>
    )
  }

  if (previewData.kind === "calendar") {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <MayaInlinePill tone="strong">{previewData.monthLabel}</MayaInlinePill>
          <MayaInlinePill>{previewData.posts.length} posts ready</MayaInlinePill>
        </div>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {previewData.posts.slice(0, 9).map((post) => (
            <div key={post.id} className="stone-inset-panel overflow-hidden rounded-[22px]">
              <div className="relative aspect-[4/5] overflow-hidden">
                {post.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={post.imageUrl} alt={post.hook} className="h-full w-full object-cover opacity-90" />
                ) : (
                  <div className="h-full w-full bg-[radial-gradient(circle_at_20%_20%,rgba(240,237,232,0.12),transparent_30%),linear-gradient(180deg,rgba(72,61,47,0.42)_0%,rgba(12,12,13,0.98)_100%)]" />
                )}
                <div className="absolute inset-x-0 top-0 flex items-center justify-between gap-2 px-2.5 pt-2.5">
                  <MayaInlinePill tone="muted">{post.dayLabel}</MayaInlinePill>
                  <MayaInlinePill>{post.postType}</MayaInlinePill>
                </div>
                <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,10,11,0.94))] px-2.5 pb-2.5 pt-8">
                  <div className="text-[11px] uppercase tracking-[0.12em] text-[color:var(--color-whisper)]">
                    {post.overlay}
                  </div>
                  <div className="mt-1 line-clamp-2 text-xs leading-relaxed text-[color:var(--color-porcelain)]">
                    {post.hook}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (previewData.kind === "page") {
    return (
      <div className="grid gap-3 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="stone-inset-panel rounded-[24px] px-4 py-4 sm:px-5 sm:py-5">
          <MayaInlinePill tone="muted">{previewData.eyebrow}</MayaInlinePill>
          <h4
            className="mt-3 text-[24px] uppercase tracking-[0.08em] text-[color:var(--color-porcelain)] sm:text-[30px]"
            style={{ fontFamily: "var(--font-display)", fontWeight: 300 }}
          >
            {previewData.headline}
          </h4>
          <p className="mt-2 text-sm leading-relaxed text-[color:var(--text-accent)]">{previewData.truth}</p>
          {previewData.proofBullets.length > 0 ? (
            <div className="mt-4 grid gap-2">
              {previewData.proofBullets.map((bullet) => (
                <div
                  key={bullet}
                  className="rounded-[18px] border border-[rgba(195,190,182,0.16)] bg-[rgba(175,170,162,0.08)] px-3 py-2 text-xs text-[color:var(--color-porcelain)]"
                >
                  {bullet}
                </div>
              ))}
            </div>
          ) : null}
        </div>
        <div className="grid gap-3">
          <div className="stone-inset-panel overflow-hidden rounded-[24px]">
            <div className="relative aspect-[4/5] overflow-hidden bg-[rgba(18,16,13,0.78)]">
              {previewData.heroImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={previewData.heroImageUrl}
                  alt={previewData.headline}
                  className="h-full w-full object-cover opacity-95"
                />
              ) : (
                <div className="h-full w-full bg-[radial-gradient(circle_at_16%_16%,rgba(240,237,232,0.14),transparent_24%),linear-gradient(180deg,rgba(72,61,47,0.38)_0%,rgba(12,12,13,0.98)_100%)]" />
              )}
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(10,10,11,0.95))] px-4 pb-4 pt-10">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[color:var(--color-whisper)]">
                  {previewData.ctaLabel}
                </div>
                <div className="mt-1 text-sm text-[color:var(--color-porcelain)]">{asset?.previewText}</div>
              </div>
            </div>
          </div>
          {previewData.supportImageUrls.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5">
              {previewData.supportImageUrls.slice(0, 3).map((imageUrl) => (
                <div key={imageUrl} className="stone-inset-panel overflow-hidden rounded-[18px]">
                  <div className="aspect-square overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="stone-inset-panel rounded-[22px] px-4 py-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-[color:var(--color-whisper)]">
        {previewData.headline}
      </div>
      <div className="mt-3 grid gap-2">
        {previewData.chapters.map((chapter) => (
          <div
            key={chapter}
            className="rounded-[18px] border border-[rgba(195,190,182,0.14)] bg-[rgba(175,170,162,0.08)] px-3 py-2 text-xs text-[color:var(--color-porcelain)]"
          >
            {chapter}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function MayaGeneratedAssetCard({
  assetType,
  assetLabel,
  assetId,
  previewText,
  url,
}: MayaGeneratedAssetCardProps) {
  const [state, setState] = useState<AssetState>({
    status: assetId ? "loading" : "idle",
    asset: null,
  })

  useEffect(() => {
    if (!assetId) {
      setState({ status: "idle", asset: null })
      return
    }

    let isActive = true
    setState((current) => ({ status: "loading", asset: current.asset }))

    fetch(`/api/maya/generated-assets/${encodeURIComponent(assetId)}`, {
      credentials: "include",
    })
      .then(async (response) => {
        const payload = await response.json().catch(() => null)
        if (!response.ok) {
          throw new Error(payload?.error || "Could not load draft preview")
        }
        return payload?.asset as MayaGeneratedAsset
      })
      .then((asset) => {
        if (!isActive) return
        setState({ status: "ready", asset })
      })
      .catch((error: unknown) => {
        if (!isActive) return
        setState({
          status: "error",
          asset: null,
          message: error instanceof Error ? error.message : "Could not load draft preview",
        })
      })

    return () => {
      isActive = false
    }
  }, [assetId])

  const asset = state.asset
  const title = asset?.title || getAssetTitle(assetType, assetLabel)
  const subtitle = asset?.previewText || previewText || "Draft created. Keep iterating with Maya in this chat."
  const previewUrl = getAssetOpenUrl(assetId)
  const liveUrl = asset?.url || url || null

  return (
    <MayaInlineCard
      eyebrow={getAssetEyebrow(assetType)}
      title={title}
      subtitle={subtitle}
      aside={
        <div className="flex flex-wrap justify-end gap-2">
          <MayaInlinePill tone="strong">{assetType}</MayaInlinePill>
          {state.status === "loading" ? <MayaInlinePill>Loading preview</MayaInlinePill> : null}
        </div>
      }
      actions={
        <>
          {previewUrl ? <MayaInlineAction href={previewUrl} variant="primary">Preview Draft</MayaInlineAction> : null}
          {liveUrl ? <MayaInlineAction href={liveUrl}>Open Published</MayaInlineAction> : null}
          {assetId ? (
            <MayaInlineAction href={`/api/maya/generated-assets/${encodeURIComponent(assetId)}/html`}>
              Open HTML
            </MayaInlineAction>
          ) : null}
        </>
      }
    >
      {state.status === "error" ? (
        <div className="stone-inset-panel rounded-[22px] px-4 py-4 text-sm text-[#f5c2c2]">{state.message}</div>
      ) : (
        renderPreviewBody(asset?.previewData, asset)
      )}
    </MayaInlineCard>
  )
}
