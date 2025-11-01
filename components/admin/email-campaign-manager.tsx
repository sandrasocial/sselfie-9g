"use client"

import { useState, useEffect } from "react"

interface EmailCampaign {
  id: number
  campaign_name: string
  campaign_type: string
  subject_line: string
  status: string
  total_recipients: number
  total_opened: number
  total_clicked: number
  created_at: string
  scheduled_for: string | null
}

export function EmailCampaignManager() {
  const [campaigns, setCampaigns] = useState<EmailCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCampaign, setSelectedCampaign] = useState<EmailCampaign | null>(null)

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

  const sendCampaign = async (campaignId: number) => {
    if (!confirm("Are you sure you want to send this campaign?")) return

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
        alert(`Campaign sent! ${result.sent} emails sent, ${result.failed} failed.`)
        loadCampaigns()
      } else {
        alert(`Error: ${result.error}`)
      }
    } catch (error) {
      console.error("Error sending campaign:", error)
      alert("Failed to send campaign")
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-sm text-stone-500">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 p-6 bg-stone-50 rounded-lg">
      <div className="flex items-center justify-between">
        <h3
          style={{ fontFamily: "'Times New Roman', serif" }}
          className="text-2xl font-extralight uppercase tracking-wider"
        >
          Email Campaigns
        </h3>
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
                  {campaign.status === "draft" && (
                    <button
                      onClick={() => sendCampaign(campaign.id)}
                      className="px-4 py-2 bg-stone-900 text-white text-sm rounded-lg hover:bg-stone-800 transition-colors"
                    >
                      Send Now
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedCampaign(campaign)}
                    className="px-4 py-2 bg-stone-100 text-stone-900 text-sm rounded-lg hover:bg-stone-200 transition-colors"
                  >
                    View
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
