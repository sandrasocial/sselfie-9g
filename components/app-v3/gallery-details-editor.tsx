"use client"
import { useState } from "react"
import type { AppV3GalleryAsset } from "@/lib/app-v3/gallery-assets"
import { useAccessibleModal } from "./use-accessible-modal"

export function GalleryDetailsEditor({
  asset,
  onClose,
  onSaved,
}: {
  asset: AppV3GalleryAsset
  onClose: () => void
  onSaved: () => void
}) {
  const [labels, setLabels] = useState(asset.labels || "")
  const [used, setUsed] = useState(Boolean(asset.isUsed))
  const [description, setDescription] = useState(asset.description || "")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const { dialogRef, initialFocusRef } = useAccessibleModal(true, onClose)
  async function save(describe = false) {
    setBusy(true)
    setError("")
    try {
      const res = await fetch("/api/app-v3/gallery/details", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetId: asset.id, labels, description, used, describe }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Could not save")
      if (describe) {
        setDescription(data.description || "")
        onSaved()
      } else {
        onSaved()
        onClose()
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save")
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="suite-dialog-backdrop fixed inset-0 z-[80] flex items-center justify-center p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="photo-details-title"
        className="max-h-[90dvh] w-full max-w-md overflow-auto rounded-lg bg-white p-5"
      >
        <h3 id="photo-details-title" className="font-serif text-xl">
          Find this photo again
        </h3>
        <img
          src={asset.url}
          alt={asset.title || "Selected photo"}
          className="my-3 h-40 w-full object-contain"
        />
        <label className="block text-sm">
          Your labels
          <textarea
            className="mt-2 w-full rounded border p-2"
            value={labels}
            maxLength={500}
            onChange={e => setLabels(e.target.value)}
            placeholder="Coffee, relaxed, tutorial, launch…"
          />
        </label>
        <label className="mt-3 block text-sm">
          Photo description
          <textarea
            aria-label="Photo description"
            className="mt-2 w-full rounded border p-2 text-sm"
            rows={3}
            maxLength={1000}
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="What is visible in this photo? You can correct Maya's description here."
          />
        </label>
        {!description && (
          <button
            className="min-h-11 text-sm underline"
            disabled={busy}
            onClick={() => void save(true)}
          >
            Let Maya describe this photo
          </button>
        )}
        <label className="my-3 flex gap-2 text-sm">
          <input type="checkbox" checked={used} onChange={e => setUsed(e.target.checked)} />
          I&apos;ve used this photo
        </label>
        <p className="text-xs text-gray-500">
          Photos marked posted in Calendar also count as used.
        </p>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
        <div className="mt-4 flex gap-4">
          <button
            ref={initialFocusRef}
            className="min-h-11 rounded bg-black px-4 text-white"
            disabled={busy}
            onClick={() => void save()}
          >
            {busy ? "Saving…" : "Save details"}
          </button>
          <button className="min-h-11" disabled={busy} onClick={onClose}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
