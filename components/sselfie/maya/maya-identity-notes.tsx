"use client"

import { useState, useEffect } from "react"

export function MayaIdentityNotes() {
  const [notes, setNotes] = useState<string[]>([])
  const [expanded, setExpanded] = useState(false)
  const [newNote, setNewNote] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch("/api/maya/identity-notes")
      .then((r) => (r.ok ? r.json() : { notes: [] }))
      .then((data) => {
        setNotes(data.notes ?? [])
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  async function handleAdd() {
    const trimmed = newNote.trim()
    if (!trimmed || saving) return
    setSaving(true)
    try {
      const r = await fetch("/api/maya/identity-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: trimmed }),
      })
      if (r.ok) {
        const data = await r.json()
        setNotes(data.notes ?? [])
        setNewNote("")
      }
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(index: number) {
    try {
      const r = await fetch("/api/maya/identity-notes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ index }),
      })
      if (r.ok) {
        const data = await r.json()
        setNotes(data.notes ?? [])
      }
    } catch {
      /* silent */
    }
  }

  if (loading) return null

  return (
    <div>
      <button
        onClick={() => setExpanded((v) => !v)}
        style={{
          display: "flex",
          width: "100%",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          cursor: "pointer",
          padding: 0,
        }}
      >
        <span
          style={{
            fontSize: "0.72rem",
            fontFamily: "var(--font-sans, Inter, sans-serif)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "rgba(244,240,230,0.42)",
          }}
        >
          Your brand identity{notes.length > 0 ? ` (${notes.length})` : ""}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            color: "rgba(244,240,230,0.3)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
            display: "inline-block",
          }}
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div style={{ marginTop: "0.75rem" }}>
          <p
            style={{
              fontSize: "0.78rem",
              color: "rgba(244,240,230,0.4)",
              marginBottom: "0.75rem",
              lineHeight: 1.6,
              fontFamily: "var(--font-sans, Inter, sans-serif)",
            }}
          >
            Short phrases that describe who you are. Maya uses these to make every concept feel like you.
          </p>

          {notes.length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.75rem" }}>
              {notes.map((note, i) => (
                <div
                  key={i}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.375rem",
                    background: "rgba(244,240,230,0.08)",
                    border: "1px solid rgba(244,240,230,0.12)",
                    borderRadius: "2px",
                    padding: "0.25rem 0.5rem",
                    fontSize: "0.78rem",
                    color: "rgba(244,240,230,0.72)",
                    fontFamily: "var(--font-sans, Inter, sans-serif)",
                  }}
                >
                  <span>{note}</span>
                  <button
                    onClick={() => handleDelete(i)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "rgba(244,240,230,0.3)",
                      fontSize: "0.9rem",
                      lineHeight: 1,
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                    }}
                    title="Remove"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {notes.length < 10 && (
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <input
                type="text"
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. I help women feel confident after 40"
                maxLength={120}
                style={{
                  flex: 1,
                  background: "rgba(244,240,230,0.06)",
                  border: "1px solid rgba(244,240,230,0.12)",
                  borderRadius: "2px",
                  padding: "0.5rem 0.75rem",
                  fontSize: "0.8rem",
                  color: "rgba(244,240,230,0.8)",
                  fontFamily: "var(--font-sans, Inter, sans-serif)",
                  outline: "none",
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!newNote.trim() || saving}
                style={{
                  background: "rgba(244,240,230,0.9)",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: "2px",
                  padding: "0.5rem 0.875rem",
                  fontSize: "0.72rem",
                  fontFamily: "var(--font-sans, Inter, sans-serif)",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  cursor: newNote.trim() && !saving ? "pointer" : "default",
                  opacity: newNote.trim() && !saving ? 1 : 0.4,
                }}
              >
                Add
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
