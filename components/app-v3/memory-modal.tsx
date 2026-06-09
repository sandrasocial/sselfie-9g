"use client"

// SSELFIE Studio 3.0 — "What Maya remembers" editor (MAYA-REBUILD-05 Phase E).
// View and edit the cross-session memory: the agent's name, brand notes, and style
// preferences. Saved to /api/app-v3/maya/memory and injected into every chat session.

import { useEffect, useState } from "react"

export interface Memory {
  agentName: string | null
  brandNotes: string | null
  preferences: string | null
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
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch("/api/app-v3/maya/memory")
      .then((r) => r.json())
      .then((d) => {
        setName(d?.agentName ?? "")
        setBrand(d?.brandNotes ?? "")
        setPrefs(d?.preferences ?? "")
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [open])

  async function save() {
    setSaving(true)
    try {
      const res = await fetch("/api/app-v3/maya/memory", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentName: name, brandNotes: brand, preferences: prefs }),
      })
      const d = (await res.json().catch(() => null)) as Memory | null
      if (res.ok && d) {
        onSaved({ agentName: d.agentName ?? null, brandNotes: d.brandNotes ?? null, preferences: d.preferences ?? null })
      }
      onClose()
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-[#0D0E10]/40 p-6 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-[10px] bg-[#F8FAFA] p-6 shadow-xl">
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
            className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Close
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Her name</span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Aria"
              disabled={loading}
              className="mt-1.5 w-full rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[15px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Your brand</span>
            <textarea
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="Who you are, who you serve, your vibe. e.g. warm minimal, founder coach for women, Iceland."
              rows={3}
              disabled={loading}
              className="mt-1.5 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>
          <label className="block">
            <span className="text-[11px] uppercase tracking-[0.18em] text-[#818283]">Style notes</span>
            <textarea
              value={prefs}
              onChange={(e) => setPrefs(e.target.value)}
              placeholder="What you love and what you avoid. e.g. no heels, no busy prints, always natural light."
              rows={3}
              disabled={loading}
              className="mt-1.5 w-full resize-none rounded-[4px] border border-[#C5C6C8]/60 bg-white px-3 py-2.5 text-[14px] text-[#282728] outline-none focus:border-[#0D0E10]"
            />
          </label>
        </div>

        <div className="mt-6 flex items-center gap-3">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || loading}
            className="rounded-[4px] bg-[#0D0E10] px-5 py-3 text-[11px] uppercase tracking-[0.2em] text-white disabled:opacity-40"
          >
            {saving ? "Saving…" : "Save"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] uppercase tracking-[0.16em] text-[#4F5052] hover:text-[#0D0E10]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
