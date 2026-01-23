"use client"

import { useEffect, useMemo, useRef, useState } from "react"
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
}

interface FashionStyleDefinition {
  id: number
  fashion_style_name: string
}

interface FeedPositionTemplate {
  id: number
  visual_aesthetic: string
  feed_style: string
  fashion_style: string
  position: number
  activity: string | null
  outfit_description: string | null
  location_type: string | null
  location_description: string | null
  camera_framing: string | null
  objects: any[] | null
  lighting_type: string | null
  pose_description: string | null
  narrative: string | null
  final_prompt_override: string | null
  approved: boolean
  last_tested_at?: string | null
}

const emptyForm: Omit<FeedPositionTemplate, "id"> = {
  visual_aesthetic: "",
  feed_style: "",
  fashion_style: "",
  position: 1,
  activity: "",
  outfit_description: "",
  location_type: "",
  location_description: "",
  camera_framing: "",
  objects: [],
  lighting_type: "",
  pose_description: "",
  narrative: "",
  final_prompt_override: "",
  approved: false,
}

export default function FeedPositionsAdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [feedStyles, setFeedStyles] = useState<FeedStyleDefinition[]>([])
  const [fashionStyles, setFashionStyles] = useState<FashionStyleDefinition[]>([])
  const [positions, setPositions] = useState<FeedPositionTemplate[]>([])
  const [form, setForm] = useState(emptyForm)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [editOpen, setEditOpen] = useState(false)
  const [previewPrompt, setPreviewPrompt] = useState<string>("")
  const previewTimer = useRef<number | null>(null)

  const activityOptions = [
    "night_out",
    "city_exploration",
    "coffee_shop_work",
    "lifestyle_flatlay",
    "mirror_selfie",
    "detail_close_up",
    "texture_detail",
    "walking_scene",
    "brand_statement_sign",
    "seated_lifestyle",
    "full_body_pose",
  ]

  const locationTypeOptions = [
    "bar",
    "coffee_shop",
    "gym",
    "city_street",
    "studio",
    "home",
    "lobby",
    "architectural",
    "outdoor",
    "indoor",
  ]

  const framingOptions = ["close_up", "midshot", "full_body", "environmental", "flatlay"]

  const lightingOptions = [
    "natural_window_light",
    "artificial_warm",
    "overcast",
    "daylight",
    "studio_softbox",
    "evening_glow",
  ]

  const visualAestheticOptions = useMemo(
    () => Array.from(new Set(feedStyles.map((style) => style.visual_aesthetic))),
    [feedStyles]
  )

  const feedStyleOptions = useMemo(
    () => Array.from(new Set(feedStyles.map((style) => style.feed_style))),
    [feedStyles]
  )

  const loadLookups = async () => {
    try {
      setLoading(true)
      const [feedStylesRes, fashionStylesRes] = await Promise.all([
        fetch("/api/admin/feed-styles"),
        fetch("/api/admin/fashion-styles"),
      ])
      if (!feedStylesRes.ok || !fashionStylesRes.ok) {
        throw new Error("Failed to load lookup data")
      }
      const feedStylesData = await feedStylesRes.json()
      const fashionStylesData = await fashionStylesRes.json()
      setFeedStyles(feedStylesData.rows || [])
      setFashionStyles(fashionStylesData.rows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadLookups()
  }, [])

  const loadPositions = async () => {
    if (!form.visual_aesthetic || !form.feed_style || !form.fashion_style) return
    try {
      setLoading(true)
      const params = new URLSearchParams({
        visual_aesthetic: form.visual_aesthetic,
        feed_style: form.feed_style,
        fashion_style: form.fashion_style,
      })
      const res = await fetch(`/api/admin/feed-positions?${params.toString()}`)
      if (!res.ok) throw new Error("Failed to load positions")
      const data = await res.json()
      setPositions(data.rows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  const handleSelectPosition = (row: FeedPositionTemplate) => {
    setSelectedId(row.id)
    setForm({
      ...row,
      activity: row.activity || "",
      outfit_description: row.outfit_description || "",
      location_type: row.location_type || "",
      location_description: row.location_description || "",
      camera_framing: row.camera_framing || "",
      objects: row.objects || [],
      lighting_type: row.lighting_type || "",
      pose_description: row.pose_description || "",
      narrative: row.narrative || "",
      final_prompt_override: row.final_prompt_override || "",
    })
    setEditOpen(true)
  }

  const handleSave = async () => {
    if (formError) {
      toast.error(formError)
      return
    }
    const payload = {
      ...form,
      objects: form.objects,
    }

    const endpoint = selectedId
      ? `/api/admin/feed-positions/${selectedId}`
      : "/api/admin/feed-positions"
    const method = selectedId ? "PATCH" : "POST"

    const res = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      setFormError(data.error || "Failed to save position")
      toast.error(data.error || "Failed to save position")
      return
    }

    await loadPositions()
    setSelectedId(null)
    setEditOpen(false)
    toast.success("Position saved")
  }

  const handleObjectChange = (value: string) => {
    try {
      const parsed = value.trim() ? JSON.parse(value) : []
      setForm({ ...form, objects: parsed })
      setFormError(null)
    } catch {
      setFormError("Objects must be valid JSON.")
    }
  }

  const handleAddPosition = () => {
    setSelectedId(null)
    setForm((prev) => ({
      ...emptyForm,
      visual_aesthetic: prev.visual_aesthetic,
      feed_style: prev.feed_style,
      fashion_style: prev.fashion_style,
    }))
    setEditOpen(true)
  }

  const refreshPreview = async (payload: typeof form) => {
    if (!payload.visual_aesthetic || !payload.feed_style || !payload.fashion_style) return
    const res = await fetch("/api/admin/feed-positions/preview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return
    const data = await res.json()
    setPreviewPrompt(data.prompt || "")
  }

  const handleTestPosition = async () => {
    if (!form.visual_aesthetic || !form.feed_style || !form.fashion_style) return
    const res = await fetch("/api/admin/feed-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        visualAesthetic: form.visual_aesthetic,
        feedStyle: form.feed_style,
        fashionStyle: form.fashion_style,
        position: form.position,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to test position")
      return
    }
    if (data.singleScenePrompt) {
      setPreviewPrompt(data.singleScenePrompt)
    }
    toast.success("Position tested")
  }

  useEffect(() => {
    if (!editOpen) return
    if (previewTimer.current) {
      window.clearTimeout(previewTimer.current)
    }
    previewTimer.current = window.setTimeout(() => {
      refreshPreview(form)
    }, 500)

    return () => {
      if (previewTimer.current) {
        window.clearTimeout(previewTimer.current)
      }
    }
  }, [form, editOpen])

  if (loading && feedStyles.length === 0) {
    return <AdminLoadingState message="Loading feed positions..." />
  }

  if (error && feedStyles.length === 0) {
    return <AdminErrorState message={error} onRetry={loadLookups} />
  }

  return (
    <div className="px-6 py-8 space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-stone-900">Feed Position Manager</h1>
        <p className="text-sm text-stone-500">
          Configure activities, locations, and prompts for each of the 9 feed positions.
        </p>
      </div>

      <div className="bg-white border border-stone-200 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-4">
        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={form.visual_aesthetic}
          onChange={(event) => setForm({ ...form, visual_aesthetic: event.target.value })}
        >
          <option value="">Visual Aesthetic</option>
          {visualAestheticOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={form.feed_style}
          onChange={(event) => setForm({ ...form, feed_style: event.target.value })}
        >
          <option value="">Feed Style</option>
          {feedStyleOptions.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>

        <select
          className="border border-stone-200 rounded-md px-3 py-2 text-sm"
          value={form.fashion_style}
          onChange={(event) => setForm({ ...form, fashion_style: event.target.value })}
        >
          <option value="">Fashion Style</option>
          {fashionStyles.map((style) => (
            <option key={style.id} value={style.fashion_style_name}>
              {style.fashion_style_name}
            </option>
          ))}
        </select>

        <button
          onClick={loadPositions}
          className="px-4 py-2 text-xs uppercase tracking-wider border border-stone-900 bg-stone-900 text-white rounded-md"
        >
          Load Positions
        </button>
        <Button variant="outline" onClick={handleAddPosition} disabled={!form.visual_aesthetic || !form.feed_style || !form.fashion_style}>
          + Add Position
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-6">
        <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">Positions</h2>
          {positions.length === 0 ? (
            <p className="text-sm text-stone-500">No positions found for this combination.</p>
          ) : (
            positions.map((row) => (
              <div
                key={row.id}
                className="w-full text-left border rounded-md p-3 transition border-stone-200 hover:border-stone-400"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-medium text-stone-900">
                      Position {row.position}
                    </div>
                    <div className="text-xs text-stone-500">
                      {row.activity || "No activity set"} • {row.camera_framing || "No framing"}
                    </div>
                    <div className="text-xs text-stone-400 mt-1">
                      {row.location_description || "No location"} • {row.outfit_description || "No outfit"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-semibold ${row.approved ? "text-emerald-600" : "text-amber-500"}`}>
                      {row.approved ? "Approved" : "Not tested"}
                    </span>
                    <Button variant="outline" size="sm" onClick={() => handleSelectPosition(row)}>
                      Edit
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="bg-white border border-stone-200 rounded-lg p-4 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-stone-600">
            Position Actions
          </h2>
          <div className="space-y-3 text-sm">
            <Button
              variant="outline"
              onClick={loadPositions}
              disabled={!form.visual_aesthetic || !form.feed_style || !form.fashion_style}
            >
              Refresh Positions
            </Button>
            <Button
              variant="outline"
              onClick={() => handleAddPosition()}
              disabled={!form.visual_aesthetic || !form.feed_style || !form.fashion_style}
            >
              Add Position
            </Button>
            <p className="text-xs text-stone-500">
              Use the Edit buttons in the list to update each position.
            </p>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>
              {selectedId ? `Edit Position ${form.position}` : "Add Position"}
            </DialogTitle>
            <DialogDescription>
              {form.visual_aesthetic} + {form.feed_style} + {form.fashion_style}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Position</label>
              <input
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.position}
                onChange={(event) =>
                  setForm({ ...form, position: Number(event.target.value) || 1 })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Activity</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.activity || ""}
                onChange={(event) => setForm({ ...form, activity: event.target.value })}
              >
                <option value="">Select activity</option>
                {activityOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Outfit Description</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.outfit_description || ""}
                onChange={(event) =>
                  setForm({ ...form, outfit_description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Location Type</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.location_type || ""}
                onChange={(event) => setForm({ ...form, location_type: event.target.value })}
              >
                <option value="">Select location type</option>
                {locationTypeOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Location Description</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.location_description || ""}
                onChange={(event) =>
                  setForm({ ...form, location_description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Camera Framing</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.camera_framing || ""}
                onChange={(event) => setForm({ ...form, camera_framing: event.target.value })}
              >
                <option value="">Select framing</option>
                {framingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Lighting Type</label>
              <select
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                value={form.lighting_type || ""}
                onChange={(event) => setForm({ ...form, lighting_type: event.target.value })}
              >
                <option value="">Select lighting</option>
                {lightingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Objects (JSON)</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2 font-mono text-xs"
                rows={4}
                value={JSON.stringify(form.objects || [], null, 2)}
                onChange={(event) => handleObjectChange(event.target.value)}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Pose Description</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.pose_description || ""}
                onChange={(event) =>
                  setForm({ ...form, pose_description: event.target.value })
                }
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Narrative</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={2}
                value={form.narrative || ""}
                onChange={(event) => setForm({ ...form, narrative: event.target.value })}
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Final Prompt Override</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2"
                rows={3}
                value={form.final_prompt_override || ""}
                onChange={(event) =>
                  setForm({ ...form, final_prompt_override: event.target.value })
                }
              />
            </div>
            <label className="flex items-center gap-2 text-xs text-stone-600 md:col-span-2">
              <input
                type="checkbox"
                checked={form.approved}
                onChange={(event) => setForm({ ...form, approved: event.target.checked })}
              />
              Approved
            </label>
            {formError && (
              <div className="md:col-span-2 text-xs text-rose-500">{formError}</div>
            )}
            <div className="md:col-span-2 space-y-2">
              <label className="text-xs uppercase tracking-wider text-stone-500">Generated Prompt Preview</label>
              <textarea
                className="w-full border border-stone-200 rounded-md px-3 py-2 font-mono text-xs"
                rows={5}
                value={previewPrompt}
                readOnly
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleTestPosition}>
              Test This Position
            </Button>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
