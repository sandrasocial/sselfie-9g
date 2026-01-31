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

interface FashionStyleDefinition {
  id: number
  fashion_style_name: string
  category_compatibility: string[] | null
  outfit_base_options: string[] | null
  outfit_layer_options: string[] | null
  enabled: boolean
}

const emptyForm: Omit<FashionStyleDefinition, "id"> = {
  fashion_style_name: "",
  category_compatibility: [],
  outfit_base_options: [],
  outfit_layer_options: [],
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

export default function FashionStylesAdminPage() {
  const [rows, setRows] = useState<FashionStyleDefinition[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [formError, setFormError] = useState<string | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<FashionStyleDefinition | null>(null)

  const sortedRows = useMemo(() => {
    return [...rows].sort((a, b) => a.fashion_style_name.localeCompare(b.fashion_style_name))
  }, [rows])

  const loadData = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/fashion-styles")
      if (!res.ok) throw new Error("Failed to load fashion styles")
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

  const handleSelect = (row: FashionStyleDefinition) => {
    setSelectedId(row.id)
    setForm({
      fashion_style_name: row.fashion_style_name,
      category_compatibility: row.category_compatibility || [],
      outfit_base_options: row.outfit_base_options || [],
      outfit_layer_options: row.outfit_layer_options || [],
      enabled: row.enabled,
    })
  }

  const handleReset = () => {
    setSelectedId(null)
    setForm(emptyForm)
  }

  const handleSave = async () => {
    const endpoint = selectedId
      ? `/api/admin/fashion-styles/${selectedId}`
      : "/api/admin/fashion-styles"
    const method = selectedId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to save fashion style")
      toast.error(data.error || "Failed to save fashion style")
      return
    }

    await loadData()
    handleReset()
    setEditOpen(false)
    setFormError(null)
    toast.success("Fashion style saved")
  }

  const handleAdd = () => {
    handleReset()
    setFormError(null)
    setEditOpen(true)
  }

  const handleEdit = (row: FashionStyleDefinition) => {
    handleSelect(row)
    setFormError(null)
    setEditOpen(true)
  }

  const handleDeleteConfirm = (row: FashionStyleDefinition) => {
    setDeleteTarget(row)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    const res = await fetch(`/api/admin/fashion-styles/${deleteTarget.id}`, {
      method: "DELETE",
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      toast.error(data.error || "Failed to delete fashion style")
      return
    }
    toast.success("Fashion style deleted")
    setDeleteOpen(false)
    setDeleteTarget(null)
    await loadData()
  }

  if (loading) return <AdminLoadingState message="Loading fashion styles..." />
  if (error) return <AdminErrorState message={error} onRetry={loadData} />

  return (
    <div className="px-6 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Fashion Style Manager</h1>
          <p className="text-sm text-stone-500">
            Manage fashion styles and compatibility rules for Feed Planner.
          </p>
        </div>
        <Button onClick={handleAdd} size="sm">
          + Add Fashion Style
        </Button>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-stone-50 text-stone-600 uppercase tracking-wider text-xs">
            <tr>
              <th className="text-left px-4 py-3">Style Name</th>
              <th className="text-left px-4 py-3">Compatible Categories</th>
              <th className="text-left px-4 py-3">Enabled</th>
              <th className="text-right px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map((row) => (
              <tr key={row.id} className="border-t border-stone-200">
                <td className="px-4 py-3">{row.fashion_style_name}</td>
                <td className="px-4 py-3">{listToString(row.category_compatibility)}</td>
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
                <td colSpan={4} className="px-4 py-8 text-center text-stone-500">
                  No fashion styles found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{selectedId ? "Edit Fashion Style" : "Add Fashion Style"}</DialogTitle>
            <DialogDescription>Update fashion style compatibility.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Fashion Style Name</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.fashion_style_name}
                onChange={(event) => setForm({ ...form, fashion_style_name: event.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Compatible Categories</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={listToString(form.category_compatibility)}
                onChange={(event) =>
                  setForm({ ...form, category_compatibility: stringToList(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Outfit Base Options</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={listToString(form.outfit_base_options)}
                onChange={(event) =>
                  setForm({ ...form, outfit_base_options: stringToList(event.target.value) })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Outfit Layer Options</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={listToString(form.outfit_layer_options)}
                onChange={(event) =>
                  setForm({ ...form, outfit_layer_options: stringToList(event.target.value) })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(event) => setForm({ ...form, enabled: event.target.checked })}
              />
              Enabled
            </label>
            {formError && <div className="text-xs text-rose-500">{formError}</div>}
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
            <DialogTitle>Delete fashion style?</DialogTitle>
            <DialogDescription>
              This removes the style definition for{" "}
              <span className="font-semibold">{deleteTarget?.fashion_style_name}</span>.
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
