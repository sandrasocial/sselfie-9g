"use client"

import { X, Send, CheckCircle2, XCircle } from "lucide-react"
import { useState } from "react"

interface EmailPreviewModalProps {
  campaign: any
  onClose: () => void
  onSendTest: (testEmail?: string) => Promise<void>
  onApprove: () => Promise<void>
  onReject: () => Promise<void>
  onSend: () => Promise<void>
}

export function EmailPreviewModal({
  campaign,
  onClose,
  onSendTest,
  onApprove,
  onReject,
  onSend,
}: EmailPreviewModalProps) {
  const [testEmail, setTestEmail] = useState("")
  const [activeTab, setActiveTab] = useState<"preview" | "html">("preview")
  const [isLoading, setIsLoading] = useState(false)

  const handleSendTest = async () => {
    setIsLoading(true)
    try {
      await onSendTest(testEmail || undefined)
      alert(`Test email sent to ${testEmail || "your admin email"}!`)
    } catch (error) {
      alert("Failed to send test email")
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    setIsLoading(true)
    try {
      await onApprove()
    } finally {
      setIsLoading(false)
    }
  }

  const handleReject = async () => {
    if (!confirm("Are you sure you want to reject this campaign?")) return
    setIsLoading(true)
    try {
      await onReject()
    } finally {
      setIsLoading(false)
    }
  }

  const handleSend = async () => {
    if (!confirm(`Send this campaign to ${campaign.total_recipients || "all"} recipients?`)) return
    setIsLoading(true)
    try {
      await onSend()
      alert("Campaign sent successfully!")
      onClose()
    } catch (error) {
      alert("Failed to send campaign")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-stone-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-stone-200">
          <div className="flex-1">
            <h2
              className="text-2xl font-extralight uppercase tracking-wider text-stone-950 mb-1"
              style={{ fontFamily: "'Times New Roman', serif" }}
            >
              Email Preview
            </h2>
            <p className="text-sm text-stone-600">{campaign.campaign_name}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-stone-100 rounded-full transition-colors"
            aria-label="Close preview"
          >
            <X className="w-5 h-5 text-stone-600" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 px-6 pt-4 border-b border-stone-200">
          <button
            onClick={() => setActiveTab("preview")}
            className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors ${
              activeTab === "preview"
                ? "border-b-2 border-stone-950 text-stone-950 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            Preview
          </button>
          <button
            onClick={() => setActiveTab("html")}
            className={`px-4 py-2 text-sm uppercase tracking-wider transition-colors ${
              activeTab === "html"
                ? "border-b-2 border-stone-950 text-stone-950 font-medium"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            HTML Code
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Email Details */}
          <div className="bg-stone-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-stone-500 uppercase text-xs tracking-wider">Subject:</span>
                <p className="text-stone-900 mt-1">{campaign.subject_line}</p>
              </div>
              <div>
                <span className="text-stone-500 uppercase text-xs tracking-wider">Type:</span>
                <p className="text-stone-900 mt-1">{campaign.campaign_type}</p>
              </div>
              {campaign.preview_text && (
                <div className="col-span-2">
                  <span className="text-stone-500 uppercase text-xs tracking-wider">Preview Text:</span>
                  <p className="text-stone-900 mt-1">{campaign.preview_text}</p>
                </div>
              )}
            </div>
          </div>

          {/* Preview or HTML */}
          {activeTab === "preview" ? (
            <div className="bg-white border border-stone-200 rounded-xl p-6 min-h-[400px]">
              <iframe
                srcDoc={campaign.body_html}
                className="w-full min-h-[400px] border-0"
                title="Email Preview"
                sandbox="allow-same-origin"
              />
            </div>
          ) : (
            <div className="bg-stone-950 rounded-xl p-4">
              <pre className="text-xs text-stone-100 overflow-x-auto whitespace-pre-wrap break-words">
                {campaign.body_html}
              </pre>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="border-t border-stone-200 p-6 space-y-4">
          {/* Test Email */}
          <div className="flex gap-2">
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="Test email (leave blank for your admin email)"
              className="flex-1 px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-950"
            />
            <button
              onClick={handleSendTest}
              disabled={isLoading}
              className="px-6 py-2 bg-stone-100 text-stone-900 rounded-lg text-sm uppercase tracking-wider hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Test
            </button>
          </div>

          {/* Approval Actions */}
          <div className="flex gap-3 justify-between">
            <div className="flex gap-2">
              {campaign.approval_status === "draft" && (
                <>
                  <button
                    onClick={handleReject}
                    disabled={isLoading}
                    className="px-6 py-3 bg-stone-100 text-stone-900 rounded-lg text-sm uppercase tracking-wider hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject
                  </button>
                  <button
                    onClick={handleApprove}
                    disabled={isLoading}
                    className="px-6 py-3 bg-stone-100 text-stone-900 rounded-lg text-sm uppercase tracking-wider hover:bg-stone-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve
                  </button>
                </>
              )}
            </div>

            {campaign.approval_status === "approved" && (
              <button
                onClick={handleSend}
                disabled={isLoading}
                className="px-8 py-3 bg-stone-950 text-white rounded-lg text-sm uppercase tracking-wider hover:bg-stone-800 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isLoading ? "Sending..." : "Send Campaign"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
