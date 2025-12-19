"use client"

import { useState, useEffect } from "react"
import { Plus, Edit, Trash2, Globe, Loader2, FileText, CheckCircle2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const UNIVERSAL_PROMPT_CATEGORIES = [
  "Chanel Luxury",
  "ALO Workout",
  "Travel",
  "Wellness",
  "Luxury",
  "Lifestyle",
  "Fashion",
  "Beauty",
  "Fitness",
  "Tech",
  "Travel Lifestyle",
  "Seasonal Christmas",
]

interface PromptGuide {
  id: number
  title: string
  description: string | null
  category: string | null
  status: "draft" | "published"
  total_prompts: number
  total_approved: number
  created_at: string
  published_at: string | null
}

interface Stats {
  totalGuides: number
  totalPrompts: number
  totalPublishedPages: number
  totalEmailCaptures: number
}

interface PromptGuidesManagerProps {
  userId: string
}

export default function PromptGuidesManager({ userId }: PromptGuidesManagerProps) {
  const [guides, setGuides] = useState<PromptGuide[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showPublishModal, setShowPublishModal] = useState(false)
  const [selectedGuide, setSelectedGuide] = useState<PromptGuide | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)
  const { toast } = useToast()
  const router = useRouter()

  // Create form state
  const [createTitle, setCreateTitle] = useState("")
  const [createDescription, setCreateDescription] = useState("")
  const [createCategory, setCreateCategory] = useState("")

  // Publish form state
  const [publishSlug, setPublishSlug] = useState("")
  const [publishWelcomeMessage, setPublishWelcomeMessage] = useState("")
  const [publishEmailTag, setPublishEmailTag] = useState("")
  const [publishUpsellLink, setPublishUpsellLink] = useState("")
  const [publishUpsellText, setPublishUpsellText] = useState("")

  useEffect(() => {
    fetchGuides()
    fetchStats()
  }, [])

  const fetchGuides = async () => {
    try {
      const response = await fetch("/api/admin/prompt-guides/list")
      if (response.ok) {
        const data = await response.json()
        setGuides(data.guides || [])
      }
    } catch (error) {
      console.error("[v0] Error fetching guides:", error)
      toast({
        title: "Error",
        description: "Failed to load guides",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const response = await fetch("/api/admin/prompt-guides/stats")
      if (response.ok) {
        const data = await response.json()
        setStats(data)
      }
    } catch (error) {
      console.error("[v0] Error fetching stats:", error)
    }
  }

  const handleCreateGuide = async () => {
    if (!createTitle.trim() || !createCategory) {
      toast({
        title: "Validation Error",
        description: "Title and category are required",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/admin/prompt-guides/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: createTitle.trim(),
          description: createDescription.trim() || null,
          category: createCategory,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create guide")
      }

      const data = await response.json()
      toast({
        title: "Guide Created",
        description: "Redirecting to builder...",
      })

      // Reset form
      setCreateTitle("")
      setCreateDescription("")
      setCreateCategory("")
      setShowCreateModal(false)

      // Redirect to builder with guide ID
      router.push(`/admin/prompt-guide-builder?guideId=${data.guide.id}`)
    } catch (error: any) {
      console.error("[v0] Error creating guide:", error)
      toast({
        title: "Creation Failed",
        description: error.message || "Failed to create guide",
        variant: "destructive"
      })
    }
  }

  const handlePublish = async () => {
    if (!selectedGuide) return

    if (!publishSlug.trim() || !publishWelcomeMessage.trim()) {
      toast({
        title: "Validation Error",
        description: "Slug and welcome message are required",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await fetch("/api/admin/prompt-guide/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guideId: selectedGuide.id,
          slug: publishSlug.trim(),
          title: selectedGuide.title,
          welcomeMessage: publishWelcomeMessage.trim(),
          emailListTag: publishEmailTag.trim() || null,
          upsellLink: publishUpsellLink.trim() || null,
          upsellText: publishUpsellText.trim() || null,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to publish guide")
      }

      const data = await response.json()
      toast({
        title: "Published!",
        description: `Guide published at ${data.publicUrl}`,
      })

      // Reset form and close modal
      setPublishSlug("")
      setPublishWelcomeMessage("")
      setPublishEmailTag("")
      setPublishUpsellLink("")
      setPublishUpsellText("")
      setShowPublishModal(false)
      setSelectedGuide(null)

      // Refresh guides
      fetchGuides()
      fetchStats()
    } catch (error: any) {
      console.error("[v0] Error publishing guide:", error)
      toast({
        title: "Publish Failed",
        description: error.message || "Failed to publish guide",
        variant: "destructive"
      })
    }
  }

  const handleDelete = async (guideId: number) => {
    if (!confirm("Are you sure you want to delete this guide? This action cannot be undone.")) {
      return
    }

    setDeletingId(guideId)
    try {
      const response = await fetch("/api/admin/prompt-guides/delete", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guideId }),
      })

      if (!response.ok) {
        throw new Error("Failed to delete guide")
      }

      toast({
        title: "Deleted",
        description: "Guide deleted successfully",
      })

      fetchGuides()
      fetchStats()
    } catch (error: any) {
      console.error("[v0] Error deleting guide:", error)
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete guide",
        variant: "destructive"
      })
    } finally {
      setDeletingId(null)
    }
  }

  const openPublishModal = (guide: PromptGuide) => {
    setSelectedGuide(guide)
    setPublishSlug(guide.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"))
    setShowPublishModal(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 animate-spin text-stone-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-stone-600" />
              <h3 className="text-sm font-medium text-stone-700">Total Guides</h3>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{stats.totalGuides}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <FileText className="w-5 h-5 text-stone-600" />
              <h3 className="text-sm font-medium text-stone-700">Total Prompts</h3>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{stats.totalPrompts}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-5 h-5 text-stone-600" />
              <h3 className="text-sm font-medium text-stone-700">Published Pages</h3>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{stats.totalPublishedPages}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-stone-600" />
              <h3 className="text-sm font-medium text-stone-700">Email Captures</h3>
            </div>
            <p className="text-2xl font-semibold text-stone-900">{stats.totalEmailCaptures}</p>
          </Card>
        </div>
      )}

      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-stone-900">All Guides</h2>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create New Guide
        </Button>
      </div>

      {/* Guides List */}
      {guides.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-stone-600">No guides yet. Create your first guide to get started.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {guides.map((guide) => (
            <Card key={guide.id} className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-stone-900">{guide.title}</h3>
                    {guide.category && (
                      <Badge variant="outline">{guide.category}</Badge>
                    )}
                    <Badge variant={guide.status === "published" ? "default" : "secondary"}>
                      {guide.status === "published" ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Published
                        </>
                      ) : (
                        <>
                          <Clock className="w-3 h-3 mr-1" />
                          Draft
                        </>
                      )}
                    </Badge>
                  </div>
                  {guide.description && (
                    <p className="text-sm text-stone-600 mb-3">{guide.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm text-stone-500">
                    <span>
                      Progress: {guide.total_approved}/{guide.total_prompts} prompts approved
                    </span>
                    <span>
                      Created: {new Date(guide.created_at).toLocaleDateString()}
                    </span>
                    {guide.published_at && (
                      <span>
                        Published: {new Date(guide.published_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/admin/prompt-guide-builder?guideId=${guide.id}`)}
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Edit
                  </Button>
                  {guide.status === "draft" && (
                    <Button
                      size="sm"
                      onClick={() => openPublishModal(guide)}
                    >
                      <Globe className="w-4 h-4 mr-2" />
                      Publish
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(guide.id)}
                    disabled={deletingId === guide.id}
                  >
                    {deletingId === guide.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create Guide Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Guide</DialogTitle>
            <DialogDescription>
              Create a new prompt guide collection. You'll be able to add prompts in the builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Title *
              </label>
              <Input
                value={createTitle}
                onChange={(e) => setCreateTitle(e.target.value)}
                placeholder="e.g., Chanel Luxury Prompts"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Description
              </label>
              <Textarea
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Brief description of this guide..."
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Category *
              </label>
              <Select value={createCategory} onValueChange={setCreateCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {UNIVERSAL_PROMPT_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateGuide}>
              Create & Open Builder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Publish Modal */}
      <Dialog open={showPublishModal} onOpenChange={setShowPublishModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Publish Guide</DialogTitle>
            <DialogDescription>
              Create a public page for this guide. Visitors can access it via the URL slug.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                URL Slug *
              </label>
              <Input
                value={publishSlug}
                onChange={(e) => setPublishSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                placeholder="chanel-luxury-prompts"
              />
              <p className="text-xs text-stone-500 mt-1">
                Public URL: https://sselfie.ai/prompt-guides/{publishSlug || "..."}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Welcome Message *
              </label>
              <Textarea
                value={publishWelcomeMessage}
                onChange={(e) => setPublishWelcomeMessage(e.target.value)}
                placeholder="Sandra's intro message for visitors..."
                rows={4}
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Email List Tag
              </label>
              <Input
                value={publishEmailTag}
                onChange={(e) => setPublishEmailTag(e.target.value)}
                placeholder="e.g., prompt-guide-chanel"
              />
              <p className="text-xs text-stone-500 mt-1">
                Resend tag for email list segmentation
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Upsell Link
              </label>
              <Input
                value={publishUpsellLink}
                onChange={(e) => setPublishUpsellLink(e.target.value)}
                placeholder="https://sselfie.ai/checkout or landing page URL"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-stone-700 mb-2 block">
                Upsell Text
              </label>
              <Input
                value={publishUpsellText}
                onChange={(e) => setPublishUpsellText(e.target.value)}
                placeholder="e.g., 'Upgrade to Studio Pro'"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPublishModal(false)}>
              Cancel
            </Button>
            <Button onClick={handlePublish}>
              <Globe className="w-4 h-4 mr-2" />
              Publish Guide
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
