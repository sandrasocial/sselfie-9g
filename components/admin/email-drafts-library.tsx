"use client"

import { useState, useEffect, useCallback } from "react"
import { Eye, Trash2, Edit2, Mail } from "lucide-react"
import { EmailPreviewModal } from "./email-preview-modal"
import { toast } from "@/hooks/use-toast"

interface EmailDraft {
  id: number
  draft_name: string
  subject_line: string
  preview_text: string | null
  body_html: string
  body_text: string | null
  email_type: string
  status: string
  version_number: number
  created_at: string
  updated_at: string
}

interface EmailDraftsLibraryProps {
  onSelectDraft?: (draft: EmailDraft) => void
  onEditDraft?: (draft: EmailDraft) => void
}

export function EmailDraftsLibrary({ onSelectDraft, onEditDraft }: EmailDraftsLibraryProps) {
  const [drafts, setDrafts] = useState<EmailDraft[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDraft, setSelectedDraft] = useState<EmailDraft | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>("all") // all, draft, approved, sent, archived

  const loadDrafts = useCallback(async () => {
    try {
      setLoading(true)
      const url = filterStatus && filterStatus !== "all" 
        ? `/api/admin/agent/email-drafts?status=${filterStatus}`
        : "/api/admin/agent/email-drafts"
      const response = await fetch(url)
      const data = await response.json()
      setDrafts(data.drafts || [])
    } catch (error) {
      console.error("[EmailDraftsLibrary] Error loading drafts:", error)
      toast({
        title: "Error",
        description: "Failed to load email drafts",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }, [filterStatus])

  useEffect(() => {
    loadDrafts()
  }, [loadDrafts])

  const handleDelete = async (draftId: number) => {
    if (!confirm("Are you sure you want to delete this email draft? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/admin/agent/email-drafts?draftId=${draftId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Email draft deleted",
        })
        loadDrafts()
      } else {
        throw new Error("Failed to delete draft")
      }
    } catch (error) {
      console.error("[EmailDraftsLibrary] Error deleting draft:", error)
      toast({
        title: "Error",
        description: "Failed to delete email draft",
        variant: "destructive",
      })
    }
  }

  const handleEdit = (draft: EmailDraft) => {
    if (onEditDraft) {
      onEditDraft(draft)
    } else {
      // Default: show preview and allow editing
      setSelectedDraft(draft)
    }
  }

  const getStatusBadge = (status: string) => {
    const colors = {
      draft: "bg-stone-100 text-stone-600",
      approved: "bg-stone-900 text-white",
      sent: "bg-green-100 text-green-800",
      archived: "bg-stone-200 text-stone-600",
    }
    return colors[status as keyof typeof colors] || "bg-stone-100 text-stone-600"
  }

  const getStatusCounts = () => {
    const counts = {
      all: drafts.length,
      draft: drafts.filter((d) => d.status === "draft").length,
      approved: drafts.filter((d) => d.status === "approved").length,
      sent: drafts.filter((d) => d.status === "sent").length,
      archived: drafts.filter((d) => d.status === "archived").length,
    }
    return counts
  }

  const statusCounts = getStatusCounts()

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-stone-500">Loading email drafts...</div>
      </div>
    )
  }

  return (
    <>
      <div className="flex flex-col gap-4 p-6 bg-stone-50 rounded-lg">
        <div className="flex items-center justify-between">
          <h3
            style={{ fontFamily: "'Times New Roman', serif" }}
            className="text-2xl font-extralight uppercase tracking-wider"
          >
            Email Library
          </h3>
        </div>

        {/* Status Filters */}
        <div className="flex flex-wrap gap-2">
          {[
            { key: "all", label: "All" },
            { key: "draft", label: "Drafts" },
            { key: "approved", label: "Approved" },
            { key: "sent", label: "Sent" },
            { key: "archived", label: "Archived" },
          ].map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-3 py-1.5 text-xs rounded-lg uppercase tracking-wider transition-colors ${
                filterStatus === filter.key
                  ? "bg-stone-900 text-white"
                  : "bg-white text-stone-600 border border-stone-200 hover:bg-stone-100"
              }`}
            >
              {filter.label} ({statusCounts[filter.key as keyof typeof statusCounts] || 0})
            </button>
          ))}
        </div>

        {drafts.length === 0 ? (
          <div className="text-center py-8 text-sm text-stone-500">
            No email drafts yet. Create one in the chat!
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {drafts.map((draft) => (
              <div key={draft.id} className="bg-white p-4 rounded-lg border border-stone-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-stone-900">{draft.draft_name}</h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full uppercase tracking-wider ${getStatusBadge(draft.status)}`}
                      >
                        {draft.status}
                      </span>
                      {draft.version_number > 1 && (
                        <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                          v{draft.version_number}
                        </span>
                      )}
                      <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                        {draft.email_type}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">{draft.subject_line}</p>
                    {draft.preview_text && (
                      <p className="text-xs text-stone-500 mb-2 line-clamp-2">{draft.preview_text}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>Created: {new Date(draft.created_at).toLocaleDateString()}</span>
                      <span>Updated: {new Date(draft.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedDraft(draft)}
                      className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 uppercase tracking-wider"
                      title="Preview"
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Preview</span>
                    </button>
                    <button
                      onClick={() => handleEdit(draft)}
                      className="px-4 py-2 bg-white text-stone-900 border border-stone-300 text-sm rounded-lg hover:bg-stone-50 transition-colors flex items-center gap-2 uppercase tracking-wider"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Edit</span>
                    </button>
                    <button
                      onClick={() => handleDelete(draft.id)}
                      className="px-4 py-2 bg-white text-red-600 border border-red-200 text-sm rounded-lg hover:bg-red-50 transition-colors flex items-center gap-2 uppercase tracking-wider"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Delete</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedDraft && (
        <EmailPreviewModal
          campaign={{
            id: selectedDraft.id,
            campaign_name: selectedDraft.draft_name,
            campaign_type: selectedDraft.email_type,
            subject_line: selectedDraft.subject_line,
            preview_text: selectedDraft.preview_text,
            body_html: selectedDraft.body_html,
            body_text: selectedDraft.body_text || "",
            status: selectedDraft.status,
            approval_status: selectedDraft.status,
            total_recipients: 0,
            total_opened: 0,
            total_clicked: 0,
            created_at: selectedDraft.created_at,
            scheduled_for: null,
          }}
          onClose={() => setSelectedDraft(null)}
          onSendTest={async () => {
            // Handle test email
            toast({
              title: "Test Email",
              description: "Test email functionality coming soon",
            })
          }}
          onApprove={async () => {
            // Handle approve
            toast({
              title: "Approved",
              description: "Draft approved",
            })
            loadDrafts()
          }}
          onReject={async () => {
            // Handle reject
            toast({
              title: "Rejected",
              description: "Draft rejected",
            })
            loadDrafts()
          }}
          onSend={async () => {
            // Handle send
            toast({
              title: "Send",
              description: "Send functionality coming soon",
            })
          }}
        />
      )}
    </>
  )
}

