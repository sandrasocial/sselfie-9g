"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Loader2, Save, Plus } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useToast } from "@/hooks/use-toast"

interface Draft {
  id: string
  title: string
  type: string
  content_json: {
    subject?: string
    body?: string
    notes?: string
  }
  created_at: string
}

export function EmailDrafts() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedDraft, setSelectedDraft] = useState<Draft | null>(null)

  const [title, setTitle] = useState("")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")

  const { toast } = useToast()

  useEffect(() => {
    fetchDrafts()
  }, [])

  useEffect(() => {
    if (selectedDraft) {
      setTitle(selectedDraft.title)
      setSubject(selectedDraft.content_json.subject || "")
      setBody(selectedDraft.content_json.body || "")
    }
  }, [selectedDraft])

  const fetchDrafts = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/automation/drafts/list")
      if (response.ok) {
        const data = await response.json()
        setDrafts(data.drafts || [])
      } else {
        throw new Error("Failed to fetch drafts")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load drafts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your draft",
        variant: "destructive",
      })
      return
    }

    setSaving(true)
    try {
      const response = await fetch("/api/admin/automation/drafts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedDraft?.id,
          title: title.trim(),
          type: "email",
          content: {
            subject: subject.trim(),
            body: body.trim(),
          },
        }),
      })

      if (response.ok) {
        const data = await response.json()
        setDrafts((prev) => {
          const existing = prev.find((d) => d.id === data.draft.id)
          if (existing) {
            return prev.map((d) => (d.id === data.draft.id ? data.draft : d))
          }
          return [data.draft, ...prev]
        })
        setSelectedDraft(data.draft)
        toast({
          title: "Draft saved",
          description: selectedDraft ? "Draft updated successfully" : "New draft created successfully",
        })
      } else {
        throw new Error("Failed to save draft")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      })
    } finally {
      setSaving(false)
    }
  }

  const handleNewDraft = () => {
    setSelectedDraft(null)
    setTitle("")
    setSubject("")
    setBody("")
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <div className="lg:col-span-2">
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-stone-950">Saved Drafts</h3>
          <Button variant="outline" size="sm" onClick={handleNewDraft}>
            <Plus className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>

        {drafts.length === 0 ? (
          <Card className="bg-white rounded-2xl border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">No drafts yet</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {drafts.map((draft) => (
              <button
                key={draft.id}
                onClick={() => setSelectedDraft(draft)}
                className={`w-full text-left p-4 bg-white rounded-xl border transition-colors ${
                  selectedDraft?.id === draft.id
                    ? "border-stone-950 bg-stone-50"
                    : "border-stone-200 hover:border-stone-300"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm text-stone-950 truncate">{draft.title}</p>
                  <Badge variant="secondary" className="text-xs">
                    {draft.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">{new Date(draft.created_at).toLocaleDateString()}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="lg:col-span-2">
        <Card className="bg-white rounded-2xl border-border p-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-stone-950 mb-2 block">Title</label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Draft title..." />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-950 mb-2 block">Subject Line</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Email subject..." />
            </div>

            <div>
              <label className="text-sm font-medium text-stone-950 mb-2 block">Body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Email body..." rows={12} />
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSave} disabled={saving || !title.trim()}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                Save Draft
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
