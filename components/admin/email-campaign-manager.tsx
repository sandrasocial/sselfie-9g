"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Upload, Eye } from "lucide-react"
import { EmailPreviewModal } from "./email-preview-modal"

interface EmailCampaign {
  id: number
  campaign_name: string
  campaign_type: string
  subject_line: string
  status: string
  approval_status: string
  total_recipients: number
  total_opened: number
  total_clicked: number
  created_at: string
  scheduled_for: string | null
  body_html: string
  body_text: string
  preview_text: string | null
}

export function EmailCampaignManager() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)
  const [uploadingImage, setUploadingImage] = useState(false)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    try {
      const response = await fetch("/api/admin/agent/email-campaigns")
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async (campaignId: number, testEmail?: string) => {
    try {
      const response = await fetch("/api/admin/agent/send-test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, testEmail }),
      })

      const result = await response.json()
      if (result.success) {
        loadCampaigns()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      throw error
    }
  }

  const handleApprove = async (campaignId: number) => {
    try {
      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, approval_status: "approved" }),
      })

      const result = await response.json()
      if (result.id) {
        loadCampaigns()
        alert("Campaign approved!")
      }
    } catch (error) {
      console.error("Error approving campaign:", error)
      throw error
    }
  }

  const handleReject = async (campaignId: number) => {
    try {
      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, approval_status: "rejected" }),
      })

      const result = await response.json()
      if (result.id) {
        loadCampaigns()
        alert("Campaign rejected")
        setSelectedCampaign(null)
      }
    } catch (error) {
      console.error("Error rejecting campaign:", error)
      throw error
    }
  }

  const sendCampaign = async (campaignId: number) => {
    try {
      const response = await fetch("/api/admin/agent/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "campaign",
          campaignId,
        }),
      })

      const result = await response.json()
      if (result.success) {
        loadCampaigns()
      } else {
        throw new Error(result.error)
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      throw error
    }
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append("file", file)

      const response = await fetch("/api/admin/agent/upload-email-image", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()
      if (result.url) {
        // Copy URL to clipboard
        navigator.clipboard.writeText(result.url)
        alert(`Image uploaded! URL copied to clipboard:\n${result.url}`)
      }
    } catch (error) {
      console.error("Error uploading image:", error)
      alert("Failed to upload image")
    } finally {
      setUploadingImage(false)
    }
  }

  const getApprovalBadge = (status: string) => {
    const colors = {
      draft: "bg-stone-100 text-stone-600",
      approved: "bg-stone-900 text-white",
      rejected: "bg-stone-200 text-stone-600",
    }
    return colors[status as keyof typeof colors] || "bg-stone-100 text-stone-600"
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-stone-500">Loading campaigns...</div>
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
            Email Campaigns
          </h3>
          <label className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors cursor-pointer flex items-center gap-2 uppercase tracking-wider">
            <Upload className="w-4 h-4" />
            {uploadingImage ? "Uploading..." : "Upload Image"}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploadingImage}
            />
          </label>
        </div>

        {campaigns.length === 0 ? (
          <div className="text-center py-8 text-sm text-stone-500">No campaigns yet. Create one in the chat!</div>
        ) : (
          <div className="flex flex-col gap-3">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white p-4 rounded-lg border border-stone-200">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-medium text-stone-900">{campaign.campaign_name}</h4>
                      <span
                        className={`px-2 py-1 text-xs rounded-full uppercase tracking-wider ${getApprovalBadge(campaign.approval_status)}`}
                      >
                        {campaign.approval_status}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600 uppercase tracking-wider">
                        {campaign.status}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                        {campaign.campaign_type}
                      </span>
                    </div>
                    <p className="text-sm text-stone-600 mb-2">{campaign.subject_line}</p>
                    <div className="flex items-center gap-4 text-xs text-stone-500">
                      <span>Recipients: {campaign.total_recipients}</span>
                      {campaign.total_opened > 0 && <span>Opened: {campaign.total_opened}</span>}
                      {campaign.total_clicked > 0 && <span>Clicked: {campaign.total_clicked}</span>}
                      <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaign(campaign)}
                      className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 uppercase tracking-wider"
                    >
                      <Eye className="w-4 h-4" />
                      Preview
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedCampaign && (
        <EmailPreviewModal
          campaign={selectedCampaign}
          onClose={() => setSelectedCampaign(null)}
          onSendTest={(testEmail) => handleSendTest(selectedCampaign.id, testEmail)}
          onApprove={() => handleApprove(selectedCampaign.id)}
          onReject={() => handleReject(selectedCampaign.id)}
          onSend={() => sendCampaign(selectedCampaign.id)}
        />
      )}
    </>
  )
}
