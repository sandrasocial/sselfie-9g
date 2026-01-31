"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { AdminLoadingState } from "@/components/admin/shared/admin-loading-state"
import { AdminErrorState } from "@/components/admin/shared/admin-error-state"
import { toast } from "sonner"

interface FeedStyleRow {
  id: number
  name: string
  description: string
  preview_prompt: string | null
  preview_prompt_approved: boolean
  preview_test_image_url: string | null
  enabled: boolean
  approved_primary_count: number
  primary_count: number
  variation_count: number
  preview_count: number
  approved_preview_count: number
  primary_preview_count: number
  primary_preview_approved: number
}

interface ScenePrompt {
  id: number
  feed_style_id: number
  position: number
  prompt_text: string
  is_primary: boolean
  variation_name: string | null
  approved: boolean
  test_image_url: string | null
}

interface FeedStyleDetail {
  style: FeedStyleRow & { created_at?: string; updated_at?: string }
  scenePrompts: ScenePrompt[]
  previews: PreviewPrompt[]
}

interface PreviewPrompt {
  id: number
  feed_style_id: number
  name: string
  prompt_text: string
  approved: boolean
  is_primary: boolean
  test_image_url: string | null
}

export default function FeedStylesV2AdminPage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [styles, setStyles] = useState<FeedStyleRow[]>([])
  const [detail, setDetail] = useState<FeedStyleDetail | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedPreviewId, setSelectedPreviewId] = useState<number | null>(null)
  const [newPreviewName, setNewPreviewName] = useState("New Preview")
  const [newPreviewPrompt, setNewPreviewPrompt] = useState("")
  const [mayaOpen, setMayaOpen] = useState(false)
  const [mayaLoading, setMayaLoading] = useState(false)
  const [mayaResult, setMayaResult] = useState<{
    preview_prompt: string
    scene_prompts: Array<{ position: number; prompt: string }>
  } | null>(null)
  const [mayaPreviewName, setMayaPreviewName] = useState("Maya Preview")
  const [mayaSetPrimary, setMayaSetPrimary] = useState(true)
  const [testOpen, setTestOpen] = useState(false)
  const [testPrompt, setTestPrompt] = useState("")
  const [testType, setTestType] = useState<"preview" | "single_scene">("single_scene")
  const [testResult, setTestResult] = useState<{ image_url?: string; status?: string } | null>(null)
  const [testImages, setTestImages] = useState<File[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({ name: "", description: "", enabled: true })
  const [flagUserId, setFlagUserId] = useState("")
  const [flagEmail, setFlagEmail] = useState("")
  const [flagEnabled, setFlagEnabled] = useState(false)
  const [flagUpdating, setFlagUpdating] = useState(false)
  const [bulkFlagUpdating, setBulkFlagUpdating] = useState(false)
  const [regeneratingScenes, setRegeneratingScenes] = useState(false)

  const loadStyles = async () => {
    try {
      setLoading(true)
      const res = await fetch("/api/admin/feed-styles-v2")
      if (!res.ok) throw new Error("Failed to load feed styles")
      const data = await res.json()
      setStyles(data.rows || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStyles()
  }, [])

  const openDetail = async (styleId: number) => {
    const res = await fetch(`/api/admin/feed-styles-v2/${styleId}`)
    if (!res.ok) {
      toast.error("Failed to load feed style details")
      return
    }
    const data = await res.json()
    const normalizedPreviews = (data.previews || []).map((preview: PreviewPrompt) => ({
      ...preview,
      id: Number(preview.id),
      feed_style_id: Number(preview.feed_style_id),
    }))
    setDetail({ ...data, previews: normalizedPreviews })
    const primary = normalizedPreviews.find((preview) => preview.is_primary)
    setSelectedPreviewId(primary?.id || normalizedPreviews?.[0]?.id || null)
    setDetailOpen(true)
  }

  const handleSaveStyle = async (payload: Partial<FeedStyleRow>) => {
    if (!detail) return
    const res = await fetch(`/api/admin/feed-styles-v2/${detail.style.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      toast.error("Failed to save feed style")
      return
    }
    const data = await res.json()
    setDetail({ ...detail, style: data.row })
    await loadStyles()
    toast.success("Feed style updated")
  }

  const handleCreatePreview = async () => {
    if (!detail) return
    if (!newPreviewPrompt.trim()) {
      toast.error("Add a preview prompt before saving")
      return
    }
    const res = await fetch("/api/admin/feed-style-previews-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feed_style_id: detail.style.id,
        name: newPreviewName || "New Preview",
        prompt_text: newPreviewPrompt,
        approved: false,
        is_primary: detail.previews.length === 0,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to create preview")
      return
    }
    await openDetail(detail.style.id)
    setNewPreviewPrompt("")
    toast.success("Preview created")
  }

  const handleUpdatePreview = async (preview: PreviewPrompt) => {
    const res = await fetch(`/api/admin/feed-style-previews-v2/${preview.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: preview.name,
        prompt_text: preview.prompt_text,
        approved: preview.approved,
        is_primary: preview.is_primary,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to update preview")
      return
    }
    toast.success("Preview updated")
    if (detail) {
      await openDetail(detail.style.id)
    }
  }

  const handleDeletePreview = async (preview: PreviewPrompt) => {
    if (preview.is_primary) return
    const res = await fetch(`/api/admin/feed-style-previews-v2/${preview.id}`, { method: "DELETE" })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to delete preview")
      return
    }
    toast.success("Preview deleted")
    if (detail) {
      await openDetail(detail.style.id)
    }
  }

  const activePreview = useMemo(() => {
    if (!detail) return null
    return (
      detail.previews.find((preview) => preview.id === selectedPreviewId) ||
      detail.previews[0] ||
      null
    )
  }, [detail, selectedPreviewId])

  const handleSavePrompt = async (prompt: ScenePrompt) => {
    const res = await fetch(`/api/admin/scene-prompts-v2/${prompt.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt_text: prompt.prompt_text,
        approved: prompt.approved,
        variation_name: prompt.variation_name,
      }),
    })
    if (!res.ok) {
      toast.error("Failed to save prompt")
      return
    }
    toast.success("Prompt saved")
  }

  const handleApproveToggle = async (prompt: ScenePrompt, approved: boolean) => {
    const res = await fetch(`/api/admin/scene-prompts-v2/${prompt.id}/${approved ? "approve" : "unapprove"}`, {
      method: "POST",
    })
    if (!res.ok) {
      toast.error("Failed to update approval")
      return
    }
    const data = await res.json()
    if (!detail) return
    setDetail({
      ...detail,
      scenePrompts: detail.scenePrompts.map((item) =>
        item.id === data.row.id ? { ...item, approved: data.row.approved } : item,
      ),
    })
  }

  const handleDeleteVariation = async (prompt: ScenePrompt) => {
    if (prompt.is_primary) return
    const res = await fetch(`/api/admin/scene-prompts-v2/${prompt.id}`, { method: "DELETE" })
    if (!res.ok) {
      toast.error("Failed to delete variation")
      return
    }
    toast.success("Variation deleted")
    if (!detail) return
    setDetail({
      ...detail,
      scenePrompts: detail.scenePrompts.filter((item) => item.id !== prompt.id),
    })
  }

  const handleGenerateWithMaya = async (style: FeedStyleRow) => {
    setMayaOpen(true)
    setMayaLoading(true)
    setMayaResult(null)
    setMayaPreviewName(`${style.name} Preview`)
    setMayaSetPrimary(true)
    const detailRes = await fetch(`/api/admin/feed-styles-v2/${style.id}`)
    if (detailRes.ok) {
      const detailData = await detailRes.json()
      setDetail(detailData)
    }
    const res = await fetch("/api/admin/generate-prompts-with-maya", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feed_style_id: style.id,
        style_name: style.name,
        description: style.description,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Failed to generate prompts")
      setMayaLoading(false)
      return
    }
    setMayaResult(data)
    setMayaLoading(false)
  }

  const saveGeneratedPrompts = async (approve: boolean) => {
    if (!detail || !mayaResult) return
    const hasPrimaryPreview = detail.previews?.some((preview) => preview.is_primary)
    const shouldSetPrimary = mayaSetPrimary || !hasPrimaryPreview

    const previewRes = await fetch("/api/admin/feed-style-previews-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feed_style_id: detail.style.id,
        name: mayaPreviewName || "Maya Preview",
        prompt_text: mayaResult.preview_prompt,
        approved: approve,
        is_primary: shouldSetPrimary,
      }),
    })
    if (!previewRes.ok) {
      const previewData = await previewRes.json().catch(() => ({}))
      toast.error(previewData.error || "Failed to save preview")
      return
    }

    const primaryByPosition = new Map<number, ScenePrompt>()
    detail.scenePrompts.forEach((prompt) => {
      if (prompt.is_primary) primaryByPosition.set(prompt.position, prompt)
    })

    for (const scene of mayaResult.scene_prompts) {
      const existing = primaryByPosition.get(scene.position)
      if (existing) {
        await fetch(`/api/admin/scene-prompts-v2/${existing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt_text: scene.prompt, approved: approve }),
        })
      } else {
        await fetch("/api/admin/scene-prompts-v2", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            feed_style_id: detail.style.id,
            position: scene.position,
            prompt_text: scene.prompt,
            is_primary: true,
            approved: approve,
          }),
        })
      }
    }

    await openDetail(detail.style.id)
    setMayaOpen(false)
    toast.success(approve ? "Prompts approved" : "Prompts saved as draft")
  }

  const handleRegenerateScenesFromPreview = async () => {
    if (!detail) return
    if (!activePreview?.prompt_text) {
      toast.error("Add a preview prompt first")
      return
    }
    setRegeneratingScenes(true)
    const res = await fetch("/api/admin/generate-prompts-with-maya", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feed_style_id: detail.style.id,
        style_name: detail.style.name,
        description: detail.style.description,
        preview_prompt: activePreview.prompt_text,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to generate scenes")
      setRegeneratingScenes(false)
      return
    }
    setMayaResult({
      preview_prompt: activePreview.prompt_text || data.preview_prompt,
      scene_prompts: data.scene_prompts || [],
    })
    setMayaOpen(true)
    setRegeneratingScenes(false)
  }

  const handleGenerateVariation = async (prompt: ScenePrompt) => {
    if (!detail) return
    const res = await fetch("/api/admin/generate-variation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene_prompt_id: prompt.id,
        original_prompt: prompt.prompt_text,
        feed_style_description: detail.style.description,
        position: prompt.position,
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Failed to generate variation")
      return
    }

    const variationName = `Variation ${String.fromCharCode(65 + Math.floor(Math.random() * 26))}`
    const createRes = await fetch("/api/admin/scene-prompts-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        feed_style_id: prompt.feed_style_id,
        position: prompt.position,
        prompt_text: data.variation_prompt,
        is_primary: false,
        variation_name: variationName,
        approved: false,
      }),
    })

    if (!createRes.ok) {
      toast.error("Failed to save variation")
      return
    }
    await openDetail(prompt.feed_style_id)
    toast.success("Variation created")
  }

  const handleTestGenerate = (prompt: string, type: "preview" | "single_scene") => {
    setTestPrompt(prompt)
    setTestType(type)
    setTestImages([])
    setTestResult(null)
    setTestOpen(true)
  }

  const handleCreateStyle = async () => {
    const res = await fetch("/api/admin/feed-styles-v2", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(createForm),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to create feed style")
      return
    }
    toast.success("Feed style created")
    setCreateOpen(false)
    setCreateForm({ name: "", description: "", enabled: true })
    await loadStyles()
  }

  const handleToggleFlag = async () => {
    if (!flagUserId && !flagEmail) {
      toast.error("Enter a user ID or email")
      return
    }
    setFlagUpdating(true)
    const res = await fetch("/api/admin/users/v2-flag", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId: flagUserId ? Number(flagUserId) : undefined,
        email: flagEmail || undefined,
        enabled: flagEnabled,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to update flag")
      setFlagUpdating(false)
      return
    }
    toast.success(`V2 flag updated for ${data.user?.email || data.user?.id}`)
    setFlagUpdating(false)
  }

  const handleToggleAllUsers = async (enabled: boolean) => {
    setBulkFlagUpdating(true)
    const res = await fetch("/api/admin/users/v2-flag", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to update all users")
      setBulkFlagUpdating(false)
      return
    }
    toast.success(enabled ? "V2 enabled for all users" : "V2 disabled for all users")
    setBulkFlagUpdating(false)
  }

  const handleApproveAllForStyle = async (styleId: number) => {
    const res = await fetch(`/api/admin/feed-styles-v2/${styleId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "approve_all" }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      toast.error(data.error || "Failed to approve all prompts")
      return
    }
    toast.success("Approved preview + all prompts")
    await loadStyles()
    if (detail?.style.id === styleId) {
      await openDetail(styleId)
    }
  }

  const readinessSummary = useMemo(() => {
    const total = styles.length
    const isStylePreviewReady = (style: FeedStyleRow) =>
      style.primary_preview_approved > 0 ||
      (style.preview_count === 0 && style.preview_prompt_approved)
    const ready = styles.filter(
      (style) =>
        isStylePreviewReady(style) &&
        style.primary_count === 9 &&
        style.approved_primary_count === 9,
    )
    const needsPrompts = styles.filter((style) => style.primary_count < 9)
    const needsApproval = styles.filter((style) => style.primary_count === 9 && style.approved_primary_count < 9)
    return {
      total,
      ready: ready.length,
      needsPrompts: needsPrompts.length,
      needsApproval: needsApproval.length,
      percentage: total > 0 ? Math.round((ready.length / total) * 100) : 0,
    }
  }, [styles])

  const submitTestGenerate = async () => {
    const formData = new FormData()
    formData.append("prompt", testPrompt)
    formData.append("type", testType)
    testImages.forEach((file) => formData.append("images", file))

    const res = await fetch("/api/admin/test-generation", {
      method: "POST",
      body: formData,
    })
    const data = await res.json()
    if (!res.ok) {
      toast.error(data.error || "Failed to generate test image")
      return
    }
    setTestResult(data)
  }

  const groupedScenePrompts = useMemo(() => {
    if (!detail) return []
    const grouped: Record<number, ScenePrompt[]> = {}
    detail.scenePrompts.forEach((prompt) => {
      grouped[prompt.position] = grouped[prompt.position] || []
      grouped[prompt.position].push(prompt)
    })
    return Object.entries(grouped).map(([position, prompts]) => ({
      position: Number(position),
      prompts,
    }))
  }, [detail])

  if (loading) return <AdminLoadingState message="Loading feed styles..." />
  if (error) return <AdminErrorState message={error} onRetry={loadStyles} />

  return (
    <div className="px-6 py-8 space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">Feed Style Manager V2</h1>
          <p className="text-sm text-stone-500">
            Manage the 7 curated feed styles, prompts, and approvals for V2.
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          + Create New Feed Style
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {styles.map((style) => (
          <div key={style.id} className="border border-stone-200 rounded-lg p-4 bg-white">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-stone-900">{style.name}</h2>
                  {(style.primary_preview_approved > 0 || (style.preview_count === 0 && style.preview_prompt_approved)) &&
                    style.primary_count === 9 &&
                    style.approved_primary_count === 9 && (
                    <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Ready
                    </span>
                  )}
                </div>
                <p className="text-xs text-stone-500 mt-1">{style.description}</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => openDetail(style.id)}>
                  View All Prompts
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleApproveAllForStyle(style.id)}>
                  Approve All
                </Button>
                <Button size="sm" onClick={() => handleGenerateWithMaya(style)}>
                  Generate with Maya
                </Button>
              </div>
            </div>
            <div className="mt-4 text-xs text-stone-600 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                Previews:{" "}
                {style.preview_count > 0
                  ? `${style.approved_preview_count}/${style.preview_count} Approved`
                  : style.preview_prompt_approved
                  ? "Legacy Approved"
                  : "None"}
              </div>
              <div>Scene Prompts: {style.approved_primary_count}/{style.primary_count} Approved</div>
              <div>Variations: {style.variation_count}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="border border-stone-200 rounded-lg p-4 bg-white space-y-2">
        <h2 className="text-sm font-semibold text-stone-900">V2 Readiness Dashboard</h2>
        <div className="text-xs text-stone-600 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div>Total styles: {readinessSummary.total}</div>
          <div>Ready: {readinessSummary.ready}</div>
          <div>Missing prompts: {readinessSummary.needsPrompts}</div>
          <div>Needs approval: {readinessSummary.needsApproval}</div>
        </div>
        <div className="text-xs text-stone-600">
          Readiness: {readinessSummary.percentage}%
        </div>
      </div>

      <div className="border border-stone-200 rounded-lg p-4 bg-white space-y-3">
        <div>
          <h2 className="text-sm font-semibold text-stone-900">V2 Feature Flag</h2>
          <p className="text-xs text-stone-500">
            Enable Feed Planner V2 for a specific user (by ID or email).
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <input
            className="border border-stone-200 rounded-md px-3 py-2"
            placeholder="User ID (e.g., 42585527)"
            value={flagUserId}
            onChange={(event) => setFlagUserId(event.target.value)}
          />
          <input
            className="border border-stone-200 rounded-md px-3 py-2"
            placeholder="Email (optional)"
            value={flagEmail}
            onChange={(event) => setFlagEmail(event.target.value)}
          />
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={flagEnabled}
                onChange={(event) => setFlagEnabled(event.target.checked)}
              />
              Use V2
            </label>
            <Button size="sm" onClick={handleToggleFlag} disabled={flagUpdating}>
              {flagUpdating ? "Updating..." : "Save"}
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 pt-2 border-t border-stone-100">
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleAllUsers(true)}
            disabled={bulkFlagUpdating}
          >
            Enable V2 for all users
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleToggleAllUsers(false)}
            disabled={bulkFlagUpdating}
          >
            Disable V2 for all users
          </Button>
        </div>
      </div>

      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="sm:max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.style.name} - All Prompts</DialogTitle>
            <DialogDescription>Review and approve prompts before enabling for users.</DialogDescription>
          </DialogHeader>

          {detail && (
            <div className="space-y-6">
              <div className="border border-stone-200 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-stone-700">Preview Prompts (3x3 Grid)</h3>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleRegenerateScenesFromPreview}
                      disabled={regeneratingScenes}
                    >
                      {regeneratingScenes ? "Generating..." : "Generate Scenes from Preview"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleTestGenerate(activePreview?.prompt_text || "", "preview")}>
                      Test Generate
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                  <input
                    className="border border-stone-200 rounded-md px-3 py-2 text-sm"
                    placeholder="New preview name"
                    value={newPreviewName}
                    onChange={(event) => setNewPreviewName(event.target.value)}
                  />
                  <Button size="sm" onClick={handleCreatePreview}>
                    Add Preview
                  </Button>
                </div>
                <textarea
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                  rows={4}
                  placeholder="Paste a new preview prompt here"
                  value={newPreviewPrompt}
                  onChange={(event) => setNewPreviewPrompt(event.target.value)}
                />
                <div className="space-y-2">
                  {detail.previews.length === 0 && (
                    <p className="text-xs text-stone-500">No previews yet. Add one above.</p>
                  )}
                  {detail.previews.map((preview) => {
                    const previewId = Number(preview.id)
                    const isSelected = previewId === selectedPreviewId
                    return (
                    <div
                      key={previewId}
                      className={`border rounded-md p-3 ${
                        isSelected ? "border-stone-900 bg-stone-50" : "border-stone-200"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <input
                            className="border border-stone-200 rounded-md px-2 py-1 text-xs"
                            value={preview.name}
                            onChange={(event) => {
                              if (!detail) return
                              setDetail({
                                ...detail,
                                previews: detail.previews.map((item) =>
                                  Number(item.id) === previewId ? { ...item, name: event.target.value } : item,
                                ),
                              })
                            }}
                          />
                          {preview.is_primary && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-stone-200 text-stone-700">
                              Primary
                            </span>
                          )}
                          {preview.approved && (
                            <span className="text-[10px] uppercase tracking-wider px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                              Approved
                            </span>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant={isSelected ? "default" : "outline"}
                            onClick={() =>
                              setSelectedPreviewId(isSelected ? null : previewId)
                            }
                            className={isSelected ? "bg-stone-900 text-white hover:bg-stone-900" : undefined}
                          >
                            {isSelected ? "Selected" : "Select"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedPreviewId(previewId)
                              handleRegenerateScenesFromPreview()
                            }}
                          >
                            Generate Scenes
                          </Button>
                          <Button
                            size="sm"
                            variant={preview.approved ? "outline" : "default"}
                            onClick={() =>
                              handleUpdatePreview({
                                ...preview,
                                approved: !preview.approved,
                              })
                            }
                          >
                            {preview.approved ? "Unapprove" : "Approve"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleUpdatePreview({
                                ...preview,
                                is_primary: true,
                              })
                            }
                          >
                            Set Primary
                          </Button>
                          {!preview.is_primary && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleDeletePreview(preview)}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="mt-3 space-y-2">
                          <textarea
                            className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                            rows={6}
                            value={preview.prompt_text}
                            onChange={(event) => {
                              if (!detail) return
                              setDetail({
                                ...detail,
                                previews: detail.previews.map((item) =>
                                  Number(item.id) === previewId ? { ...item, prompt_text: event.target.value } : item,
                                ),
                              })
                            }}
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={() => handleUpdatePreview(preview)}>
                              Save Preview
                            </Button>
                            <Button
                              size="sm"
                              variant={preview.approved ? "outline" : "default"}
                              onClick={() =>
                                handleUpdatePreview({
                                  ...preview,
                                  approved: !preview.approved,
                                })
                              }
                            >
                              {preview.approved ? "Unapprove" : "Approve"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  )})}
                </div>
              </div>

              {groupedScenePrompts.map((group) => (
                <div key={group.position} className="border border-stone-200 rounded-lg p-4 space-y-3">
                  <h4 className="text-sm font-semibold text-stone-700">Scene {group.position}</h4>
                  {group.prompts.map((prompt) => (
                    <div key={prompt.id} className="border border-stone-100 rounded-md p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-stone-500">
                          {prompt.is_primary ? "Primary" : prompt.variation_name || "Variation"}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleTestGenerate(prompt.prompt_text, "single_scene")}
                          >
                            Test
                          </Button>
                          <Button
                            variant={prompt.approved ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleApproveToggle(prompt, !prompt.approved)}
                          >
                            {prompt.approved ? "Unapprove" : "Approve"}
                          </Button>
                          {!prompt.is_primary && (
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteVariation(prompt)}>
                              Delete
                            </Button>
                          )}
                        </div>
                      </div>
                      <textarea
                        className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                        rows={5}
                        value={prompt.prompt_text}
                        onChange={(event) => {
                          if (!detail) return
                          setDetail({
                            ...detail,
                            scenePrompts: detail.scenePrompts.map((item) =>
                              item.id === prompt.id ? { ...item, prompt_text: event.target.value } : item,
                            ),
                          })
                        }}
                      />
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleSavePrompt(prompt)}>
                          Save
                        </Button>
                        {prompt.is_primary && (
                          <Button size="sm" onClick={() => handleGenerateVariation(prompt)}>
                            Generate Variation
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={mayaOpen} onOpenChange={setMayaOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Maya Generated Prompts</DialogTitle>
            <DialogDescription>Review and approve Maya output before saving.</DialogDescription>
          </DialogHeader>
          {mayaLoading && <p className="text-sm text-stone-500">Generating prompts with Maya...</p>}
          {mayaResult && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
                <input
                  className="border border-stone-200 rounded-md px-3 py-2 text-sm"
                  value={mayaPreviewName}
                  onChange={(event) => setMayaPreviewName(event.target.value)}
                  placeholder="Preview name"
                />
                <label className="flex items-center gap-2 text-xs text-stone-600">
                  <input
                    type="checkbox"
                    checked={mayaSetPrimary}
                    onChange={(event) => setMayaSetPrimary(event.target.checked)}
                  />
                  Set as primary
                </label>
              </div>
              <div>
                <h3 className="text-xs uppercase tracking-wider text-stone-500 mb-2">Preview Prompt</h3>
                <textarea
                  className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                  rows={6}
                  value={mayaResult.preview_prompt}
                  onChange={(event) =>
                    setMayaResult({ ...mayaResult, preview_prompt: event.target.value })
                  }
                />
              </div>
              {mayaResult.scene_prompts.map((scene) => (
                <div key={scene.position}>
                  <h3 className="text-xs uppercase tracking-wider text-stone-500 mb-2">
                    Scene {scene.position}
                  </h3>
                  <textarea
                    className="w-full border border-stone-200 rounded-md px-3 py-2 text-xs font-mono"
                    rows={5}
                    value={scene.prompt}
                    onChange={(event) => {
                      setMayaResult({
                        ...mayaResult,
                        scene_prompts: mayaResult.scene_prompts.map((item) =>
                          item.position === scene.position ? { ...item, prompt: event.target.value } : item,
                        ),
                      })
                    }}
                  />
                </div>
              ))}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => saveGeneratedPrompts(false)} disabled={!mayaResult}>
              Save as Draft
            </Button>
            <Button onClick={() => saveGeneratedPrompts(true)} disabled={!mayaResult}>
              Approve All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={testOpen} onOpenChange={setTestOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Test Generate</DialogTitle>
            <DialogDescription>Upload 2-3 reference images and generate a test image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={(event) => setTestImages(Array.from(event.target.files || []))}
            />
            <p className="text-xs text-stone-500">
              Selected: {testImages.length} images
            </p>
            <Button onClick={submitTestGenerate} disabled={testImages.length === 0}>
              Generate Test Image
            </Button>
            {testResult?.image_url && (
              <div className="space-y-2">
                <img src={testResult.image_url} alt="Test result" className="rounded-md border" />
                <p className="text-xs text-stone-500">Status: {testResult.status}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create New Feed Style</DialogTitle>
            <DialogDescription>Add a new curated style to V2.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <input
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Name"
              value={createForm.name}
              onChange={(event) => setCreateForm({ ...createForm, name: event.target.value })}
            />
            <textarea
              className="w-full border border-stone-200 rounded-md px-3 py-2"
              placeholder="Description"
              rows={4}
              value={createForm.description}
              onChange={(event) => setCreateForm({ ...createForm, description: event.target.value })}
            />
            <label className="flex items-center gap-2 text-xs text-stone-600">
              <input
                type="checkbox"
                checked={createForm.enabled}
                onChange={(event) => setCreateForm({ ...createForm, enabled: event.target.checked })}
              />
              Enabled
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateStyle}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
