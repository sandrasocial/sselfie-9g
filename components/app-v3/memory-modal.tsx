"use client"

// SSELFIE Studio 3.0 - "What Maya remembers" editor (MAYA-REBUILD-05 Phase E, +05.1 avatar).
// View and edit cross-session memory: the agent's name, your profile photo, brand notes, and
// style preferences. Saved to /api/app-v3/maya/memory and injected into every chat session.

import { useEffect, useRef, useState } from "react"
import Image from "next/image"

export interface Memory {
  agentName: string | null
  brandNotes: string | null
  preferences: string | null
  userAvatarUrl: string | null
  preferredOverlayStyle?: string | null
  /** LIKENESS-MEMORY-01: accuracy notes Maya learned from her photo corrections. */
  likenessNotes?: string[]
}

interface MemoryModalProps {
  open: boolean
  onClose: () => void
  onSaved: (m: Memory) => void
}

export function MemoryModal({ open, onClose, onSaved }: MemoryModalProps) {
  const [name, setName] = useState("")
  const [brand, setBrand] = useState("")
  const [prefs, setPrefs] = useState("")
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [likenessNotes, setLikenessNotes] = useState<string[]>([])
  const [removingNote, setRemovingNote] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/app-v3/maya/memory")
      .then(r => r.json())
      .then(d => {
        setName(d?.agentName ?? "")
        setBrand(d?.brandNotes ?? "")
        setPrefs(d?.preferences ?? "")
        setAvatarUrl(d?.userAvatarUrl ?? null)
        setLikenessNotes(Array.isArray(d?.likenessNotes) ? d.likenessNotes : [])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  // LIKENESS-MEMORY-01: a wrong note has to be removable, one tap, right here.
  async function removeNote(note: string) {
    setRemovingNote(note)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ removeLikenessNote: note }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) setLikenessNotes(Array.isArray(d.likenessNotes) ? d.likenessNotes : [])
    } finally {
      setRemovingNote(null)
    }
  }

  async function uploadAvatar(file: File) {
    setUploading(true)
    try {
      const form = new FormData()
      form.append("file", file)
      const res = await fetch("/api/app-v3/upload-selfie", { method: "POST", body: form })
      const d = (await res.json().catch(() => null)) as { url?: string } | null
      if (res.ok && d?.url) setAvatarUrl(d.url)
    } finally {
      setUploading(false)
    }
  }

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentName: name,
          brandNotes: brand,
          preferences: prefs,
          userAvatarUrl: avatarUrl,
        }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) {
        onSaved({
          agentName: d.agentName ?? null,
          brandNotes: d.brandNotes ?? null,
          preferences: d.preferences ?? null,
          userAvatarUrl: d.userAvatarUrl ?? null,
          preferredOverlayStyle: d.preferredOverlayStyle ?? null,
          likenessNotes: Array.isArray(d.likenessNotes) ? d.likenessNotes : [],
        })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-3 backdrop-blur-sm animate-in fade-in duration-200 motion-reduce:animate-none sm:p-6">
      <div className="max-h-[calc(100dvh-1.5rem)] w-full max-w-md overflow-y-auto rounded-[10px] bg-[#F8FAFA] p-4 shadow-xl animate-in zoom-in-95 fade-in duration-200 motion-reduce:animate-none sm:max-h-[88vh] sm:p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-[#818283]">Memory</p>
            <h3 className="mt-2 font-serif text-[22px] font-light leading-tight text-[#0D0E10]">
              What Maya remembers
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4">
          {/* Your photo */}
          <div className="flex items-center gap-3">
            <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full border border-[#C5C6C8]/60 bg-white">
              {avatarUrl ? (
                <Image
                  src={avatarUrl}
                  alt="Your photo"
                  fill
                  className="object-cover"
                  sizes="56px"
                />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[12px] text-[#A6A7A8]">
                  You
                </span>
              )}
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Your photo</p>
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="mt-1 inline-flex min-h-11 items-center text-[12px] text-[#4F5052] underline underline-offset-2 hover:text-[#0D0E10] disabled:opacity-50"
              >
                {uploading ? "Uploading…" : avatarUrl ? "Change photo" : "Upload a photo"}
              </button>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0]
                if (f) void uploadAvatar(f)
              }}
            />
          </div>

          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Her name</span>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Aria"
              disabled={loading}
              className="mt-1.5 min-h-11 w-full rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">
              Your brand
            </span>
            <textarea
              value={brand}
              onChange={e => setBrand(e.target.value)}
              placeholder="Who you are, who you serve, your vibe. e.g. warm minimal, founder coach for women, Iceland."
              rows={3}
              disabled={loading}
              className="mt-1.5 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">
              Style notes
            </span>
            <textarea
              value={prefs}
              onChange={e => setPrefs(e.target.value)}
              placeholder="What you love and what you avoid. e.g. no heels, no busy prints, always natural light."
              rows={3}
              disabled={loading}
              className="mt-1.5 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>

          {/* LIKENESS-MEMORY-01: the notes Maya learned from her photo corrections. Visible so
              she can SEE Maya learning, and deletable so a wrong note never sticks. */}
          {likenessNotes.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">
                What Maya keeps true about you
              </p>
              <p className="mt-1 text-[12px] leading-relaxed text-[#4F5052]">
                Learned from your photo corrections, so every new photo stays you. Remove
                anything that&apos;s off.
              </p>
              <ul className="mt-2 space-y-1.5">
                {likenessNotes.map(note => (
                  <li
                    key={note}
                    className="flex items-center justify-between gap-3 rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2"
                  >
                    <span className="text-[13px] leading-snug text-[#282728]">{note}</span>
                    <button
                      type="button"
                      onClick={() => void removeNote(note)}
                      disabled={removingNote === note}
                      className="inline-flex min-h-11 shrink-0 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10] disabled:opacity-40"
                    >
                      {removingNote === note ? "Removing…" : "Remove"}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="inline-flex min-h-11 items-center rounded-[4px] bg-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex min-h-11 items-center text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
