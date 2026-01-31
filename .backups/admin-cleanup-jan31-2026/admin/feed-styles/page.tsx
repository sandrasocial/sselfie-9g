"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminLoadingState } from "@/components/admin/shared/admin-loading-state"
import { AdminErrorState } from "@/components/admin/shared/admin-error-state"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface FeedStyleDefinition {
  id: number
  visual_aesthetic: string
  feed_style: string
  category: string
  mood: string
  color_palette: string[] | null
  color_hex_codes: string[] | null
  lighting_description: string | null
  mood_description: string | null
  background_style: string | null
  enabled: boolean
}

const emptyForm: Omit<FeedStyleDefinition, "id"> = {
  visual_aesthetic: "",
  feed_style: "",
  category: "",
  mood: "",
  color_palette: [],
  color_hex_codes: [],
  lighting_description: "",
  mood_description: "",
  background_style: "",
  enabled: true,
}

function listToString(value?: string[] | null) {
  if (!value) return ""
  return value.join(", ")
}

function stringToList(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

export default function FeedStylesAdminPage() {
  const [rows, setRows] = useState<FeedStyleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FeedStyleDefinition | null>(null)
  const categoryOptions = ["luxury", "minimal", "beige", "warm", "edgy", "professional"]
  const moodOptions = ["luxury", "minimal", "beige"]

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) =>
      `${a.visual_aesthetic}-${a.feed_style}`.localeCompare(`${b.visual_aesthetic}-${b.feed_style}`),
    )
  }, [rows])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/feed-styles")
      if (!res.ok) throw new Error("Failed to load feed styles")
      const data = await res.json()
      setRows(data.rows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelect = (row: FeedStyleDefinition) => {
    setSelectedId(row.id)
    setForm({
      visual_aesthetic: row.visual_aesthetic,
      feed_style: row.feed_style,
      category: row.category,
      mood: row.mood,
      color_palette: row.color_palette || [],
      color_hex_codes: row.color_hex_codes || [],
      lighting_description: row.lighting_description || "",
      mood_description: row.mood_description || "",
      background_style: row.background_style || "",
      enabled: row.enabled,
    })
  }

  const handleReset = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    const payload = {
      ...form,
      color_palette: form.color_palette,
      color_hex_codes: form.color_hex_codes,
    }

    const endpoint = selectedId
      ? `/api/admin/feed-styles/${selectedId}`
      : "/api/admin/feed-styles"
    const method = selectedId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to save feed style")
      toast.error(data.error || "Failed to save feed style")
      return
    }

    await loadData()
    handleReset()
    setEditOpen(false)
    setFormError(null)
    toast.success("Feed style saved")
  }

  const handleAdd = () => {
    handleReset()
    setFormError(null)
    setEditOpen(true)
  }

  const handleEdit = (row: FeedStyleDefinition) => {
    handleSelect(row)
    setFormError(null)
    setEditOpen(true)
  }

  const handleDeleteConfirm = (row: FeedStyleDefinition) => {
    setDeleteTarget(row)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/feed-styles/${deleteTarget.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to delete feed style")
      return
    }
    toast.success("Feed style deleted")
    setDeleteOpen(false)
    setDeleteTarget(null)
    await loadData()
  }

  if (loading) return <AdminLoadingState message="Loading feed styles..." />
  if (error) return <AdminErrorState message={error} onRetry={loadData} />

  return (
    <div className="px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Feed Style Manager</h1>
          <p className="text-sm text-stone-500">
            Manage Visual Aesthetic + Feed Style combinations and their palette definitions.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          + Add Style
        </Button>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-xs">
            <tr>
              <th className="text-left px-4 py-3">Visual Aesthetic</th>
              <th className="text-left px-4 py-3">Feed Style</th>
              <th className="text-left px-4 py-3">Category</th>
              <th className="text-left px-4 py-3">Mood</th>
              <th className="text-left px-4 py-3">Enabled</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-stone-200">
                <td className="px-4 py-3">{row.visual_aesthetic}</td>
                <td className="px-4 py-3">{row.feed_style}</td>
                <td className="px-4 py-3">{row.category}</td>
                <td className="px-4 py-3">{row.mood}</td>
                <td className="px-4 py-3">
                  <span className={row.enabled ? "text-emerald-600" : "text-rose-500"}>
                    {row.enabled ? "Yes" : "No"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <Button variant="outline" size="sm" onClick={() => handleEdit(row)}>
                    Edit
                  </Button>
                  <Button variant="destructive" size="sm" onClick={() => handleDeleteConfirm(row)}>
                    Delete
                  </Button>
                </td>
              </tr>
            ))}
            {sortedRows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-stone-500">
                  No feed styles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedId ? "Edit Style" : "Add New Style"}</DialogTitle>
            <DialogDescription>Update feed style definitions used by the planner.</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Visual Aesthetic</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.visual_aesthetic}
                onChange={(event) => setForm({ ...form, visual_aesthetic: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Feed Style</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.feed_style}
                onChange={(event) => setForm({ ...form, feed_style: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">System Category</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                <option value="">Select category</option>
                {categoryOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">System Mood</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.mood}
                onChange={(event) => setForm({ ...form, mood: event.target.value })}
              >
                <option value="">Select mood</option>
                {moodOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Color Palette</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={listToString(form.color_palette)}
                onChange={(event) =>
                  setForm({ ...form, color_palette: stringToList(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Hex Codes</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={listToString(form.color_hex_codes)}
                onChange={(event) =>
                  setForm({ ...form, color_hex_codes: stringToList(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Lighting Description</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.lighting_description || ""}
                onChange={(event) =>
                  setForm({ ...form, lighting_description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Mood Description</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.mood_description || ""}
                onChange={(event) =>
                  setForm({ ...form, mood_description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Background Style</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.background_style || ""}
                onChange={(event) =>
                  setForm({ ...form, background_style: event.target.value })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              Enabled
            </label>
            {formError && (
              <div className="md:col-span-2 text-xs text-rose-500">{formError}</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete feed style?</DialogTitle>
            <DialogDescription>
              This removes the style definition for{" "}
              <span className="font-semibold">{deleteTarget?.visual_aesthetic}</span> +{" "}
              <span className="font-semibold">{deleteTarget?.feed_style}</span>.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
