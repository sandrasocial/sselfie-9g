"use client"

import { useRef, useState } from "react"
import type { Shoot, ShootShot } from "@/lib/content-kit/types"
import { getShootPublishReadiness } from "@/lib/content-kit/shoot-readiness"

// SHOOT-STUDIO-01: Maya-style chat container + tap-first cards. The agent leads with
// cards (prompt, shots, actions); typing is refinement only. Nothing auto-posts.

function CopyChip({ label, text }: { label: string; text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(text).then(() => {
          setCopied(true)
          setTimeout(() => setCopied(false), 1800)
        })
      }}
      className="rounded-full border border-stone-300 bg-white px-3 py-1 text-xs uppercase tracking-wide text-stone-700 transition hover:border-stone-950 hover:text-stone-950"
    >
      {copied ? "Copied" : label}
    </button>
  )
}

function ShotCard({
  shoot,
  shot,
  busy,
  onAction,
}: {
  shoot: Shoot
  shot: ShootShot
  busy: string | null
  onAction: (action: "approve" | "kill" | "regenerate" | "finalize", shot: ShootShot) => void
}) {
  const working = busy === shot.id
  return (
    <div
      className={`w-56 shrink-0 overflow-hidden rounded-xl border bg-white ${
        shot.status === "approved"
          ? "border-stone-950"
          : shot.status === "killed"
            ? "border-stone-200 opacity-40"
            : "border-stone-200"
      }`}
    >
      {shot.imageUrl ? (
        <a href={shot.imageUrl} download={`${shoot.slug}-${shot.id}.png`} title="Download this shot">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shot.imageUrl} alt={shot.title} className="h-72 w-full object-cover" loading="lazy" />
        </a>
      ) : (
        <div className="flex h-72 w-full items-center justify-center bg-stone-100 px-4 text-center text-xs text-stone-500">
          {working ? "Rendering..." : "Didn't render. Hit regenerate."}
        </div>
      )}
      <div className="p-3">
        <p className="text-sm font-medium text-stone-950">{shot.title}</p>
        <p className="mt-1 line-clamp-2 text-xs text-stone-500">{shot.whenToUse}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {shot.status !== "approved" && (
            <button
              type="button"
              disabled={working}
              onClick={() => onAction("approve", shot)}
              className="rounded-full bg-stone-950 px-3 py-1 text-[11px] uppercase tracking-wide text-white disabled:opacity-50"
            >
              Approve
            </button>
          )}
          {shot.status !== "killed" && (
            <button
              type="button"
              disabled={working}
              onClick={() => onAction("kill", shot)}
              className="rounded-full border border-stone-300 px-3 py-1 text-[11px] uppercase tracking-wide text-stone-600 hover:border-stone-950 disabled:opacity-50"
            >
              Kill
            </button>
          )}
          <button
            type="button"
            disabled={working}
            onClick={() => onAction("regenerate", shot)}
            className="rounded-full border border-stone-300 px-3 py-1 text-[11px] uppercase tracking-wide text-stone-600 hover:border-stone-950 disabled:opacity-50"
          >
            {working ? "Working" : "Re-roll"}
          </button>
          {shot.status === "approved" && (
            <button
              type="button"
              disabled={working}
              onClick={() => onAction("finalize", shot)}
              title="Re-render this shot in high quality for posting"
              className="rounded-full border border-stone-950 px-3 py-1 text-[11px] uppercase tracking-wide text-stone-950 disabled:opacity-50"
            >
              Finalize HQ
            </button>
          )}
          <CopyChip label="Prompt" text={shot.prompt} />
        </div>
      </div>
    </div>
  )
}

function ShootThread({
  shoot,
  onUpdate,
  onDelete,
}: {
  shoot: Shoot
  onUpdate: (shoot: Shoot) => void
  onDelete: (id: number) => void
}) {
  const [open, setOpen] = useState(shoot.status === "draft")
  const [message, setMessage] = useState("")
  const [refining, setRefining] = useState(false)
  const [busyShot, setBusyShot] = useState<string | null>(null)
  const [extending, setExtending] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function shotAction(action: "approve" | "kill" | "regenerate" | "finalize", shot: ShootShot) {
    setError(null)
    if (action === "approve" || action === "kill") {
      const shotStatus = action === "approve" ? "approved" : "killed"
      onUpdate({
        ...shoot,
        shots: shoot.shots.map((item) => (item.id === shot.id ? { ...item, status: shotStatus } : item)),
      })
      await fetch("/api/admin/content-kit/shoots", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: shoot.id, shotId: shot.id, shotStatus }),
      })
      return
    }
    setBusyShot(shot.id)
    try {
      const response = await fetch("/api/admin/content-kit/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "regenerate",
          id: shoot.id,
          shotId: shot.id,
          quality: action === "finalize" ? "high" : "medium",
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Re-roll failed")
      onUpdate(data.shoot)
    } catch (err: any) {
      setError(err?.message || "Re-roll failed")
    } finally {
      setBusyShot(null)
    }
  }

  async function refine() {
    const ask = message.trim()
    if (!ask || refining) return
    setRefining(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "refine", id: shoot.id, message: ask }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Refine failed")
      onUpdate(data.shoot)
      setMessage("")
    } catch (err: any) {
      setError(err?.message || "Refine failed")
    } finally {
      setRefining(false)
    }
  }

  async function setStatus(status: Shoot["status"]) {
    onUpdate({ ...shoot, status })
    await fetch("/api/admin/content-kit/shoots", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: shoot.id, status }),
    })
  }

  async function extend(count: number) {
    if (extending) return
    setExtending(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "extend", id: shoot.id, count }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Extend failed")
      onUpdate(data.shoot)
    } catch (err: any) {
      setError(err?.message || "Extend failed")
    } finally {
      setExtending(false)
    }
  }

  async function publish() {
    if (publishing) return
    setPublishing(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "publish", id: shoot.id }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Publish failed")
      onUpdate(data.shoot)
    } catch (err: any) {
      setError(err?.message || "Publish failed")
    } finally {
      setPublishing(false)
    }
  }

  const readiness = getShootPublishReadiness(shoot)
  const giveaway = shoot.shots.find((shot) => shot.id === readiness.giveawayShotId)?.prompt ?? ""

  return (
    <div className="rounded-2xl border border-stone-200 bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <span
            className={`rounded-full px-3 py-1 text-xs uppercase tracking-wide ${
              shoot.status === "approved" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-600"
            }`}
          >
            {shoot.status === "approved" ? "Approved" : "Draft"}
          </span>
          <h3 className="font-medium text-stone-950">{shoot.title}</h3>
          <span className="text-xs text-stone-400">
            {shoot.shots.length} shots · {readiness.approvedCount} approved
          </span>
          {shoot.publishedVaultSlug && (
            <span className="rounded-full bg-stone-100 px-3 py-1 text-xs uppercase tracking-wide text-stone-600">
              Published
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="text-xs uppercase tracking-wide text-stone-950 underline underline-offset-4"
        >
          {open ? "Close" : "Open"}
        </button>
      </div>

      {open && (
        <div className="mt-4">
          {/* Conversation */}
          <div className="space-y-2">
            {shoot.messages.map((item, index) => (
              <div key={index} className={`flex ${item.role === "sandra" ? "justify-end" : "justify-start"}`}>
                <p
                  className={`max-w-xl rounded-2xl px-4 py-2 text-sm ${
                    item.role === "sandra" ? "bg-stone-950 text-white" : "bg-stone-100 text-stone-800"
                  }`}
                >
                  {item.text}
                </p>
              </div>
            ))}
          </div>

          {/* Inputs that made this shoot */}
          <div className="mt-3 flex items-center gap-2">
            <p className="text-xs uppercase tracking-wide text-stone-400">From</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shoot.selfieUrl} alt="Selfie" className="h-12 w-9 rounded object-cover" loading="lazy" />
            <span className="text-xs text-stone-400">+</span>
            {shoot.inspirationUrls.map((url) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={url} src={url} alt="Inspiration" className="h-12 w-9 rounded object-cover opacity-70" loading="lazy" />
            ))}
          </div>

          {/* Shot cards */}
          <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
            {shoot.shots.map((shot) => (
              <ShotCard key={shot.id} shoot={shoot} shot={shot} busy={busyShot} onAction={shotAction} />
            ))}
          </div>

          {/* The giveaway asset */}
          <div className="mt-3 flex flex-wrap items-center gap-2 rounded-xl bg-stone-50 p-3">
            <p className="text-xs text-stone-500">
              The reel giveaway uses the first approved shot:
            </p>
            <CopyChip label="Copy giveaway prompt" text={giveaway} />
            {!giveaway && (
              <span className="text-xs text-stone-400">Approve a rendered shot first.</span>
            )}
          </div>

          {/* Refinement chat input */}
          <div className="mt-3 flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") refine()
              }}
              placeholder='Want something different? e.g. "make the blazer black" or "move it to a Paris cafe"'
              className="w-full rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
            />
            <button
              type="button"
              onClick={refine}
              disabled={refining}
              className="rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
            >
              {refining ? "Updating" : "Send"}
            </button>
          </div>
          {refining && (
            <p className="mt-2 text-xs text-stone-400">Rewriting the prompts and re-rendering the changed shots (about 2 minutes).</p>
          )}
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

          {/* Shoot actions */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => extend(2)}
              disabled={extending}
              className="rounded-full border border-stone-300 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-600 hover:border-stone-950 disabled:opacity-50"
            >
              {extending ? "Adding shots" : "Add 2 shots"}
            </button>
            {shoot.status !== "approved" && (
              <button
                type="button"
                onClick={() => setStatus("approved")}
                disabled={!readiness.ready}
                title={readiness.reason}
                className="rounded-full bg-stone-950 px-4 py-1.5 text-xs uppercase tracking-wide text-white disabled:opacity-40"
              >
                Approve shoot
              </button>
            )}
            {shoot.status === "approved" && (
              <button
                type="button"
                onClick={() => setStatus("draft")}
                className="rounded-full border border-stone-200 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-400 hover:border-stone-400"
              >
                Back to draft
              </button>
            )}
            <button
              type="button"
              onClick={publish}
              disabled={!readiness.ready || publishing}
              title={readiness.reason}
              className="rounded-full bg-stone-950 px-4 py-1.5 text-xs uppercase tracking-wide text-white disabled:opacity-40"
            >
              {publishing ? "Publishing" : shoot.publishedVaultSlug ? "Republish to Vault" : "Publish to Vault"}
            </button>
            <span className="self-center text-xs text-stone-400">
              {shoot.publishedVaultSlug
                ? `Vault: ${shoot.publishedVaultSlug} · email drop ${shoot.emailDropStatus || "queued"}`
                : readiness.reason}
            </span>
            <button
              type="button"
              onClick={() => onDelete(shoot.id)}
              className="rounded-full border border-stone-200 px-4 py-1.5 text-xs uppercase tracking-wide text-stone-400 hover:border-red-700 hover:text-red-700"
            >
              Delete
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export function ShootStudioClient({
  initialShoots,
  selfies,
}: {
  initialShoots: Shoot[]
  selfies: string[]
}) {
  const [shoots, setShoots] = useState<Shoot[]>(initialShoots)
  const [inspiration, setInspiration] = useState<string[]>([])
  const [selfieOptions, setSelfieOptions] = useState<string[]>(selfies)
  const [selfieUrls, setSelfieUrls] = useState<string[]>(selfies[0] ? [selfies[0]] : [])
  const [notes, setNotes] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadingSelfie, setUploadingSelfie] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const selfieInput = useRef<HTMLInputElement>(null)

  async function uploadInspiration(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      Array.from(files)
        .slice(0, 3)
        .forEach((file) => form.append("files", file))
      const response = await fetch("/api/admin/content-kit/shoots/upload", { method: "POST", body: form })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed")
      setInspiration((current) => [...current, ...data.urls].slice(0, 3))
    } catch (err: any) {
      setError(err?.message || "Upload failed")
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }

  function toggleSelfie(url: string) {
    setSelfieUrls((current) =>
      current.includes(url) ? current.filter((u) => u !== url) : [...current, url].slice(0, 4),
    )
  }

  async function uploadSelfies(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploadingSelfie(true)
    setError(null)
    try {
      const form = new FormData()
      Array.from(files)
        .slice(0, 6)
        .forEach((file) => form.append("files", file))
      const response = await fetch("/api/admin/content-kit/selfies", { method: "POST", body: form })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Upload failed")
      const urls: string[] = Array.isArray(data.urls) ? data.urls : []
      if (Array.isArray(data.selfies) && data.selfies.length) {
        setSelfieOptions(data.selfies)
      } else {
        setSelfieOptions((current) => [...urls, ...current])
      }
      // Auto-select the new uploads, respecting the 4-image cap.
      setSelfieUrls((current) => Array.from(new Set([...current, ...urls])).slice(0, 4))
    } catch (err: any) {
      setError(err?.message || "Upload failed")
    } finally {
      setUploadingSelfie(false)
      if (selfieInput.current) selfieInput.current.value = ""
    }
  }

  async function removeSelfie(url: string) {
    setSelfieOptions((current) => current.filter((u) => u !== url))
    setSelfieUrls((current) => current.filter((u) => u !== url))
    await fetch("/api/admin/content-kit/selfies", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    }).catch(() => {})
  }

  async function create() {
    if (creating) return
    setCreating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/content-kit/shoots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          inspirationUrls: inspiration,
          selfieUrls,
          notes: notes.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok || !data.success) throw new Error(data.error || "Shoot failed")
      setShoots((current) => [data.shoot, ...current])
      setInspiration([])
      setNotes("")
    } catch (err: any) {
      setError(err?.message || "Shoot failed")
    } finally {
      setCreating(false)
    }
  }

  function updateShoot(next: Shoot) {
    setShoots((current) => current.map((shoot) => (shoot.id === next.id ? next : shoot)))
  }

  async function deleteShoot(id: number) {
    setShoots((current) => current.filter((shoot) => shoot.id !== id))
    await fetch("/api/admin/content-kit/shoots", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    })
  }

  return (
    <section className="mt-12">
      <div>
        <h2 className="font-serif text-2xl font-light tracking-tight text-stone-950">Shoot studio</h2>
        <p className="mt-1 text-sm text-stone-600">
          Drop your Pinterest saves, pick a selfie, and get the photoshoot: your face, that world.
          Every shoot starts with 6 shots, can be extended, and only publishes when you approve it.
        </p>
      </div>

      {/* Composer */}
      <div className="mt-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex flex-wrap items-start gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">1 · Inspiration (1-3 images)</p>
            <div className="mt-2 flex items-center gap-2">
              {inspiration.map((url) => (
                <button
                  key={url}
                  type="button"
                  title="Remove"
                  onClick={() => setInspiration((current) => current.filter((item) => item !== url))}
                  className="relative overflow-hidden rounded-lg border-2 border-stone-950"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt="Inspiration" className="h-24 w-[4.5rem] object-cover" />
                </button>
              ))}
              {inspiration.length < 3 && (
                <button
                  type="button"
                  onClick={() => fileInput.current?.click()}
                  disabled={uploading}
                  className="flex h-24 w-[4.5rem] items-center justify-center rounded-lg border border-dashed border-stone-300 text-2xl font-light text-stone-400 hover:border-stone-950 hover:text-stone-950 disabled:opacity-50"
                >
                  {uploading ? "..." : "+"}
                </button>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => uploadInspiration(event.target.files)}
              />
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-stone-500">
              2 · Your selfies (front, side profiles, full body)
            </p>
            <div className="mt-2 flex gap-2 overflow-x-auto pb-1" style={{ maxWidth: "24rem" }}>
              {selfieOptions.map((url) => {
                const selected = selfieUrls.includes(url)
                const order = selfieUrls.indexOf(url) + 1
                return (
                  <div key={url} className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => toggleSelfie(url)}
                      className={`block overflow-hidden rounded-lg border-2 ${
                        selected ? "border-stone-950" : "border-transparent hover:border-stone-300"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="Selfie" className="h-24 w-[4.5rem] object-cover" loading="lazy" />
                    </button>
                    {selected && (
                      <span className="absolute left-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-stone-950 text-[10px] font-medium text-white">
                        {order}
                      </span>
                    )}
                    <button
                      type="button"
                      title="Remove from your selfies"
                      aria-label="Remove from your selfies"
                      onClick={() => removeSelfie(url)}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-white/90 text-xs leading-none text-stone-600 hover:text-red-700"
                    >
                      x
                    </button>
                  </div>
                )
              })}
              <button
                type="button"
                onClick={() => selfieInput.current?.click()}
                disabled={uploadingSelfie}
                className="flex h-24 w-[4.5rem] shrink-0 items-center justify-center rounded-lg border border-dashed border-stone-300 text-2xl font-light text-stone-400 hover:border-stone-950 hover:text-stone-950 disabled:opacity-50"
              >
                {uploadingSelfie ? "..." : "+"}
              </button>
              <input
                ref={selfieInput}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(event) => uploadSelfies(event.target.files)}
              />
            </div>
            <p className="mt-1 text-[11px] text-stone-400">
              Pick up to 4. Front, both side profiles, and full body give the truest likeness.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            placeholder='Optional direction, e.g. "keep it warm and Parisian" (you can refine after too)'
            className="w-full max-w-xl rounded-full border border-stone-300 bg-white px-4 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-stone-950 focus:outline-none"
          />
          <button
            type="button"
            onClick={create}
            disabled={creating || inspiration.length === 0 || selfieUrls.length === 0}
            className="rounded-full bg-stone-950 px-5 py-2 text-xs uppercase tracking-wide text-white disabled:opacity-50"
          >
            {creating ? "Creating your 6-shot shoot (3-4 minutes)" : "Create the shoot"}
          </button>
        </div>
        {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
      </div>

      {/* Threads */}
      <div className="mt-4 space-y-3">
        {shoots.length === 0 ? (
          <p className="rounded-2xl border border-stone-200 bg-white p-5 text-sm text-stone-600">
            No shoots yet. Drop an inspiration image and create your first one.
          </p>
        ) : (
          shoots.map((shoot) => (
            <ShootThread key={shoot.id} shoot={shoot} onUpdate={updateShoot} onDelete={deleteShoot} />
          ))
        )}
      </div>
    </section>
  )
}
