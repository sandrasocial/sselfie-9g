"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminNav } from "@/components/admin/admin-nav"

interface TemplateRow {
  emailType: string
  label: string
  description: string | null
  default: {
    subject: string | null
    html: string
    text: string
  }
  override: {
    subject: string | null
    html: string | null
    text: string | null
    updatedBy: string | null
    updatedAt: string
  } | null
  active: boolean
}

export default function MarketingTemplateEditorPage() {
  const [templates, setTemplates] = useState<TemplateRow[]>([])
  const [selectedEmailType, setSelectedEmailType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState("")
  const [subject, setSubject] = useState("")
  const [html, setHtml] = useState("")
  const [text, setText] = useState("")
  const [statusMessage, setStatusMessage] = useState<string | null>(null)
  const [sampleName, setSampleName] = useState("Sandra")
  const [sampleEmail, setSampleEmail] = useState("sandra@sselfie.ai")

  useEffect(() => {
    loadTemplates()
  }, [])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/admin/email-templates")
      const data = await response.json()
      const rows = Array.isArray(data.templates) ? data.templates : []
      setTemplates(rows)
      if (!selectedEmailType && rows.length > 0) {
        setSelectedEmailType(rows[0].emailType)
      }
    } catch (error) {
      console.error("Failed to load templates:", error)
    } finally {
      setLoading(false)
    }
  }

  const filteredTemplates = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return templates
    return templates.filter((template) => {
      return (
        template.label.toLowerCase().includes(term) ||
        template.emailType.toLowerCase().includes(term)
      )
    })
  }, [templates, search])

  const selectedTemplate = useMemo(
    () => templates.find((template) => template.emailType === selectedEmailType) || null,
    [templates, selectedEmailType],
  )

  useEffect(() => {
    if (!selectedTemplate) return
    const baseSubject = selectedTemplate.override?.subject ?? selectedTemplate.default.subject ?? ""
    const baseHtml = selectedTemplate.override?.html ?? selectedTemplate.default.html
    const baseText = selectedTemplate.override?.text ?? selectedTemplate.default.text
    setSubject(baseSubject)
    setHtml(baseHtml)
    setText(baseText)
    setStatusMessage(null)
  }, [selectedTemplate])

  const renderPreview = (rawHtml: string) => {
    const name = sampleName.trim() || "friend"
    const email = sampleEmail.trim() || "hello@sselfie.ai"
    return rawHtml
      .replaceAll("{{{FIRST_NAME|friend}}}", name)
      .replaceAll("{{{EMAIL}}}", email)
  }

  const handleSave = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    setStatusMessage(null)
    try {
      const response = await fetch("/api/admin/email-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailType: selectedTemplate.emailType,
          subject: subject || null,
          html,
          text,
        }),
      })
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to save template")
      }
      await loadTemplates()
      setStatusMessage("Saved. Updates apply to queued and future sends.")
    } catch (error: any) {
      console.error(error)
      setStatusMessage(error.message || "Failed to save template.")
    } finally {
      setSaving(false)
    }
  }

  const handleReset = async () => {
    if (!selectedTemplate) return
    setSaving(true)
    setStatusMessage(null)
    try {
      const response = await fetch(
        `/api/admin/email-templates?emailType=${encodeURIComponent(selectedTemplate.emailType)}`,
        { method: "DELETE" },
      )
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || "Failed to reset template")
      }
      await loadTemplates()
      setStatusMessage("Reset to default template.")
    } catch (error: any) {
      console.error(error)
      setStatusMessage(error.message || "Failed to reset template.")
    } finally {
      setSaving(false)
    }
  }

  const copyDefault = () => {
    if (!selectedTemplate) return
    setSubject(selectedTemplate.default.subject || "")
    setHtml(selectedTemplate.default.html)
    setText(selectedTemplate.default.text)
    setStatusMessage("Default template loaded. Remember to save.")
  }

  return (
    <div className="min-h-screen bg-stone-50">
      <AdminNav />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="mb-8">
          <h1 className="font-['Times_New_Roman'] text-3xl sm:text-4xl tracking-widest uppercase text-stone-950">
            Marketing Email Editor
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase text-stone-500 mt-2">
            Edit live marketing sequences. Changes apply to queued and future sends.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
          <div className="bg-white border border-stone-200 p-4 rounded-none">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search emails..."
              className="w-full border border-stone-200 px-3 py-2 text-xs tracking-wide uppercase text-stone-600"
            />
            <div className="mt-4 space-y-2 max-h-[600px] overflow-auto pr-1">
              {filteredTemplates.map((template) => (
                <button
                  key={template.emailType}
                  onClick={() => setSelectedEmailType(template.emailType)}
                  className={`w-full text-left border px-3 py-2 text-xs tracking-[0.15em] uppercase ${
                    selectedEmailType === template.emailType
                      ? "border-stone-900 text-stone-950 bg-stone-50"
                      : "border-stone-200 text-stone-500 hover:text-stone-900"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span>{template.label}</span>
                    {template.active ? <span className="text-[10px] text-emerald-600">Override</span> : null}
                  </div>
                  <p className="text-[10px] text-stone-400 mt-1">{template.emailType}</p>
                </button>
              ))}
              {!loading && !filteredTemplates.length ? (
                <p className="text-xs text-stone-400">No templates found.</p>
              ) : null}
            </div>
          </div>

          <div className="bg-white border border-stone-200 p-6 rounded-none">
            {!selectedTemplate ? (
              <p className="text-sm text-stone-500">Select a template to edit.</p>
            ) : (
              <div className="space-y-6">
                <div>
                  <h2 className="text-lg font-semibold text-stone-900">{selectedTemplate.label}</h2>
                  <p className="text-xs text-stone-500 mt-1">{selectedTemplate.emailType}</p>
                  {selectedTemplate.description ? (
                    <p className="text-xs text-stone-500 mt-2">{selectedTemplate.description}</p>
                  ) : null}
                  {selectedTemplate.override ? (
                    <p className="text-[10px] text-stone-400 mt-2">
                      Last updated {new Date(selectedTemplate.override.updatedAt).toLocaleString()} by{" "}
                      {selectedTemplate.override.updatedBy || "admin"}
                    </p>
                  ) : (
                    <p className="text-[10px] text-stone-400 mt-2">Using default template.</p>
                  )}
                </div>

                {statusMessage ? <p className="text-xs text-stone-500">{statusMessage}</p> : null}

                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">
                    Subject
                  </label>
                  <input
                    value={subject}
                    onChange={(event) => setSubject(event.target.value)}
                    className="w-full border border-stone-200 px-3 py-2 text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">HTML</label>
                  <textarea
                    value={html}
                    onChange={(event) => setHtml(event.target.value)}
                    rows={14}
                    className="w-full border border-stone-200 px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs tracking-[0.15em] uppercase text-stone-500 mb-2">Text</label>
                  <textarea
                    value={text}
                    onChange={(event) => setText(event.target.value)}
                    rows={8}
                    className="w-full border border-stone-200 px-3 py-2 text-xs font-mono"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 bg-stone-900 text-white text-xs tracking-[0.15em] uppercase disabled:opacity-60"
                  >
                    {saving ? "Saving..." : "Save Override"}
                  </button>
                  <button
                    type="button"
                    onClick={copyDefault}
                    className="px-5 py-2 border border-stone-300 text-xs tracking-[0.15em] uppercase text-stone-600"
                  >
                    Load Default
                  </button>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="px-5 py-2 border border-rose-300 text-xs tracking-[0.15em] uppercase text-rose-600"
                  >
                    Reset to Default
                  </button>
                </div>

                <div className="text-[10px] text-stone-400 leading-5">
                  Keep placeholders like <code>{"{{{FIRST_NAME|friend}}}"}</code>,{" "}
                  <code>{"{{{EMAIL}}}"}</code>, and <code>{"{{{RESEND_UNSUBSCRIBE_URL}}}"}</code> so personalization
                  and unsubscribe links keep working.
                </div>

                <div>
                  <p className="text-xs uppercase tracking-[0.15em] text-stone-500 mb-2">Preview</p>
                  <div className="flex flex-col sm:flex-row gap-3 mb-4">
                    <div className="flex-1">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-stone-400 mb-1">
                        Sample name
                      </label>
                      <input
                        value={sampleName}
                        onChange={(event) => setSampleName(event.target.value)}
                        className="w-full border border-stone-200 px-3 py-2 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] tracking-[0.15em] uppercase text-stone-400 mb-1">
                        Sample email
                      </label>
                      <input
                        value={sampleEmail}
                        onChange={(event) => setSampleEmail(event.target.value)}
                        className="w-full border border-stone-200 px-3 py-2 text-xs"
                      />
                    </div>
                  </div>
                  <div
                    className="border border-stone-200 rounded-md p-4 text-sm"
                    dangerouslySetInnerHTML={{ __html: renderPreview(html) }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
