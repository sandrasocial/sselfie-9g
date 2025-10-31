"use client"

import { useState, useEffect } from "react"

interface EmailTemplate {
  id: number
  name: string
  category: string
  description?: string
  subject_line: string
  preview_text: string
  body_html: string
  body_text: string
  variables: string[]
  tags: string[]
  is_favorite?: boolean
  usage_count?: number
}

interface EmailTemplateLibraryProps {
  userId: string
  onSelectTemplate?: (template: EmailTemplate) => void
}

export function EmailTemplateLibrary({ userId, onSelectTemplate }: EmailTemplateLibraryProps) {
  const [libraryTemplates, setLibraryTemplates] = useState<EmailTemplate[]>([])
  const [userTemplates, setUserTemplates] = useState<EmailTemplate[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [activeTab, setActiveTab] = useState<"library" | "saved">("library")
  const [loading, setLoading] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)

  const categories = ["all", "newsletter", "campaign", "welcome", "announcement"]

  useEffect(() => {
    fetchTemplates()
  }, [activeTab, selectedCategory])

  const fetchTemplates = async () => {
    setLoading(true)
    try {
      if (activeTab === "library") {
        const response = await fetch(
          `/api/admin/agent/email-templates?source=library${selectedCategory !== "all" ? `&category=${selectedCategory}` : ""}`,
        )
        if (response.ok) {
          const data = await response.json()
          setLibraryTemplates(data.templates || [])
        }
      } else {
        const response = await fetch(
          `/api/admin/agent/email-templates?userId=${userId}${selectedCategory !== "all" ? `&category=${selectedCategory}` : ""}`,
        )
        if (response.ok) {
          const data = await response.json()
          setUserTemplates(data.templates || [])
        }
      }
    } catch (error) {
      console.error("Error fetching templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToSaved = async (template: EmailTemplate) => {
    try {
      const response = await fetch("/api/admin/agent/email-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          name: `${template.name} (Copy)`,
          category: template.category,
          subjectLine: template.subject_line,
          previewText: template.preview_text,
          bodyHtml: template.body_html,
          bodyText: template.body_text,
          variables: template.variables,
          tags: template.tags,
        }),
      })

      if (response.ok) {
        alert("Template copied to your saved templates!")
        if (activeTab === "saved") {
          fetchTemplates()
        }
      }
    } catch (error) {
      console.error("Error copying template:", error)
      alert("Failed to copy template")
    }
  }

  const templates = activeTab === "library" ? libraryTemplates : userTemplates

  return (
    <div className="space-y-4">
      <div>
        <h3
          className="text-lg font-light uppercase text-stone-900 mb-4"
          style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
        >
          Email Templates
        </h3>

        {/* Tabs */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setActiveTab("library")}
            className={`px-4 py-2 text-xs uppercase rounded transition-colors ${
              activeTab === "library" ? "bg-stone-900 text-stone-50" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
            style={{ letterSpacing: "0.15em" }}
          >
            Library
          </button>
          <button
            onClick={() => setActiveTab("saved")}
            className={`px-4 py-2 text-xs uppercase rounded transition-colors ${
              activeTab === "saved" ? "bg-stone-900 text-stone-50" : "bg-stone-100 text-stone-700 hover:bg-stone-200"
            }`}
            style={{ letterSpacing: "0.15em" }}
          >
            Saved
          </button>
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 mb-4 flex-wrap">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1 text-xs uppercase rounded transition-colors ${
                selectedCategory === cat
                  ? "bg-stone-700 text-stone-50"
                  : "bg-stone-200 text-stone-700 hover:bg-stone-300"
              }`}
              style={{ letterSpacing: "0.15em" }}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg text-center">
          <p className="text-sm text-stone-500">Loading templates...</p>
        </div>
      ) : templates.length === 0 ? (
        <div className="p-6 bg-stone-50 border border-stone-200 rounded-lg text-center">
          <p className="text-sm text-stone-500">No templates found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => (
            <div key={template.id} className="p-4 bg-stone-50 border border-stone-200 rounded-lg">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-stone-900">{template.name}</h4>
                  <p className="text-xs text-stone-600 mt-1">{template.subject_line}</p>
                  {template.description && <p className="text-xs text-stone-500 mt-1">{template.description}</p>}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSelectedTemplate(template)}
                    className="text-xs text-stone-600 hover:text-stone-900"
                  >
                    Preview
                  </button>
                  {activeTab === "library" && (
                    <button
                      onClick={() => handleCopyToSaved(template)}
                      className="text-xs text-stone-600 hover:text-stone-900"
                    >
                      Copy
                    </button>
                  )}
                  {onSelectTemplate && (
                    <button
                      onClick={() => onSelectTemplate(template)}
                      className="text-xs text-stone-900 font-medium hover:underline"
                    >
                      Use
                    </button>
                  )}
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <span className="px-2 py-1 bg-stone-200 text-stone-700 text-xs rounded">{template.category}</span>
                {template.variables && template.variables.length > 0 && (
                  <span className="px-2 py-1 bg-stone-200 text-stone-700 text-xs rounded">
                    {template.variables.length} variables
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedTemplate && (
        <EmailTemplatePreview template={selectedTemplate} onClose={() => setSelectedTemplate(null)} />
      )}
    </div>
  )
}

function EmailTemplatePreview({ template, onClose }: { template: EmailTemplate; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div
        className="bg-white rounded-lg p-6 max-w-3xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3
              className="text-xl font-light uppercase text-stone-900"
              style={{ fontFamily: "'Times New Roman', serif", letterSpacing: "0.2em" }}
            >
              {template.name}
            </h3>
            <p className="text-sm text-stone-600 mt-1">{template.subject_line}</p>
          </div>
          <button onClick={onClose} className="text-stone-500 hover:text-stone-900">
            Close
          </button>
        </div>

        {template.variables && template.variables.length > 0 && (
          <div className="mb-4 p-3 bg-stone-50 rounded">
            <p className="text-xs uppercase text-stone-500 mb-2" style={{ letterSpacing: "0.15em" }}>
              Variables
            </p>
            <div className="flex flex-wrap gap-2">
              {template.variables.map((variable) => (
                <code key={variable} className="px-2 py-1 bg-stone-200 text-stone-900 text-xs rounded">
                  {`{{${variable}}}`}
                </code>
              ))}
            </div>
          </div>
        )}

        <div className="border border-stone-200 rounded-lg p-4 bg-white">
          <div dangerouslySetInnerHTML={{ __html: template.body_html }} />
        </div>
      </div>
    </div>
  )
}
