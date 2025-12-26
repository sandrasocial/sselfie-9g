"use client"

import { useState, useEffect } from "react"
import { Calendar, Send, Eye, Plus, Clock, CheckCircle, XCircle } from "lucide-react"
import { EmailCampaignManager } from "@/components/admin/email-campaign-manager"

interface Campaign {
  id: number
  campaign_name: string
  campaign_type: string
  subject_line: string
  status: string
  scheduled_for: string | null
  target_audience: any
  created_at: string
}

const CAMPAIGN_TYPES = [
  { value: "welcome_back_reengagement", label: "Welcome Back (Re-engagement)", description: "Re-engage cold users (30+ days inactive)" },
  { value: "nurture_day_1", label: "Nurture Day 1", description: "First day welcome for new paid users" },
  { value: "nurture_day_3", label: "Nurture Day 3", description: "Check-in after 3 days" },
  { value: "nurture_day_7", label: "Nurture Day 7", description: "Week check-in with upsell" },
  { value: "upsell_freebie_to_membership", label: "Freebie → Membership Upsell", description: "Convert blueprint subscribers" },
  { value: "upsell_day_10", label: "Day 10 Upsell", description: "Extended upsell for blueprint subscribers" },
  { value: "win_back_offer", label: "Win-Back Offer", description: "Final re-engagement with offer" },
  { value: "newsletter", label: "Newsletter", description: "Weekly/bi-weekly newsletter" },
  { value: "beta_testimonial", label: "Beta Testimonial Request", description: "Request testimonials from beta users" },
]

const AUDIENCE_OPTIONS = [
  { value: "all_subscribers", label: "All Subscribers", segmentId: "3cd6c5e3-fdf9-4744-b7f3-fda7c8cdf6cd" },
  { value: "cold_users", label: "Cold Users (30+ days inactive)", segmentId: "e515e2d6-1f0e-4a4c-beec-323b8758be61" },
  { value: "paid_users", label: "Paid Users", segmentId: "f7ed7f32-b103-400a-a8e8-ddbbe0e4d97b" },
  { value: "beta_users", label: "Beta Users", segmentId: "31080fb1-e957-4b41-af72-6f042e4fa869" },
]

export default function TestCampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [testResult, setTestResult] = useState<any>(null)

  const [formData, setFormData] = useState({
    campaign_name: "",
    campaign_type: "welcome_back_reengagement",
    subject_line: "",
    target_audience: "cold_users",
    scheduled_for: "",
    scheduled_time: "",
  })

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

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      // Build scheduled_for timestamp if provided
      let scheduledFor = null
      if (formData.scheduled_for && formData.scheduled_time) {
        const [date, time] = [formData.scheduled_for, formData.scheduled_time]
        scheduledFor = new Date(`${date}T${time}`).toISOString()
      }

      // Build target_audience based on selection
      const targetAudience = {
        segment: formData.target_audience,
      }

      // For template-based campaigns, we don't need body_html - the template generates it
      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: formData.campaign_name,
          campaign_type: formData.campaign_type,
          subject_line: formData.subject_line || getDefaultSubject(formData.campaign_type),
          email_body: "", // Template will generate this
          target_audience: targetAudience,
          scheduled_for: scheduledFor,
        }),
      })

      const result = await response.json()
      if (result.success || result.campaign) {
        alert("Campaign created successfully!")
        setShowCreateForm(false)
        setFormData({
          campaign_name: "",
          campaign_type: "welcome_back_reengagement",
          subject_line: "",
          target_audience: "cold_users",
          scheduled_for: "",
          scheduled_time: "",
        })
        loadCampaigns()
      } else {
        throw new Error(result.error || "Failed to create campaign")
      }
    } catch (error: any) {
      console.error("Error creating campaign:", error)
      alert(`Failed to create campaign: ${error.message}`)
    }
  }

  const handleSendTest = async (campaignId: number) => {
    try {
      setTestResult(null)
      const response = await fetch("/api/admin/email/run-scheduled-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "test", campaignId }),
      })

      const result = await response.json()
      setTestResult(result)
      if (result.success) {
        alert("Test email sent! Check your inbox.")
      } else {
        alert(`Failed to send test: ${result.error || "Unknown error"}`)
      }
    } catch (error: any) {
      console.error("Error sending test:", error)
      alert(`Error: ${error.message}`)
    }
  }

  const handleSchedule = async (campaignId: number, scheduledFor: string) => {
    try {
      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          scheduled_for: scheduledFor,
        }),
      })

      const result = await response.json()
      if (result.id) {
        alert("Campaign scheduled successfully!")
        loadCampaigns()
      }
    } catch (error: any) {
      console.error("Error scheduling campaign:", error)
      alert(`Failed to schedule: ${error.message}`)
    }
  }

  const getDefaultSubject = (campaignType: string): string => {
    const subjects: Record<string, string> = {
      welcome_back_reengagement: "I've been thinking about you...",
      nurture_day_1: "Welcome to SSELFIE!",
      nurture_day_3: "How's it going?",
      nurture_day_7: "One Week In",
      upsell_freebie_to_membership: "Ready for the Next Level?",
      upsell_day_10: "Ready for the Next Level?",
      win_back_offer: "We Miss You - Here's Something Special",
      newsletter: "Your Weekly SSELFIE Update",
      beta_testimonial: "You're helping me build something incredible",
    }
    return subjects[campaignType] || "Email from SSELFIE"
  }

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { color: string; icon: any }> = {
      draft: { color: "bg-stone-100 text-stone-600", icon: Clock },
      scheduled: { color: "bg-blue-100 text-blue-700", icon: Calendar },
      sending: { color: "bg-yellow-100 text-yellow-700", icon: Send },
      sent: { color: "bg-green-100 text-green-700", icon: CheckCircle },
      failed: { color: "bg-red-100 text-red-700", icon: XCircle },
    }
    return badges[status] || badges.draft
  }

  if (loading) {
    return (
      <div className="container mx-auto py-8 max-w-6xl">
        <div className="text-center py-12">Loading campaigns...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Email Campaigns</h1>
        <p className="text-stone-600">Create, test, and schedule email campaigns using your templates</p>
      </div>

      {/* Create Campaign Button */}
      <div className="mb-6">
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="px-6 py-3 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Create New Campaign
        </button>
      </div>

      {/* Create Campaign Form */}
      {showCreateForm && (
        <div className="bg-white rounded-lg border border-stone-200 p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Create Campaign</h2>
          <form onSubmit={handleCreateCampaign} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Campaign Name</label>
              <input
                type="text"
                required
                value={formData.campaign_name}
                onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder="e.g., Welcome Back Campaign - January 2025"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Campaign Type</label>
              <select
                value={formData.campaign_type}
                onChange={(e) => {
                  setFormData({
                    ...formData,
                    campaign_type: e.target.value,
                    subject_line: getDefaultSubject(e.target.value),
                  })
                }}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              >
                {CAMPAIGN_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Subject Line</label>
              <input
                type="text"
                required
                value={formData.subject_line}
                onChange={(e) => setFormData({ ...formData, subject_line: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                placeholder="Email subject line"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">Target Audience</label>
              <select
                value={formData.target_audience}
                onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
              >
                {AUDIENCE_OPTIONS.map((audience) => (
                  <option key={audience.value} value={audience.value}>
                    {audience.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Schedule Date (Optional)</label>
                <input
                  type="date"
                  value={formData.scheduled_for}
                  onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Schedule Time (Optional)</label>
                <input
                  type="time"
                  value={formData.scheduled_time}
                  onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                  className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  disabled={!formData.scheduled_for}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="px-6 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors"
              >
                Create Campaign
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Campaigns List */}
      <div className="bg-white rounded-lg border border-stone-200 overflow-hidden">
        <div className="p-6 border-b border-stone-200">
          <h2 className="text-xl font-semibold">All Campaigns</h2>
        </div>

        {campaigns.length === 0 ? (
          <div className="p-12 text-center text-stone-500">No campaigns yet. Create one above!</div>
        ) : (
          <div className="divide-y divide-stone-200">
            {campaigns.map((campaign) => {
              const statusBadge = getStatusBadge(campaign.status)
              const StatusIcon = statusBadge.icon

              return (
                <div key={campaign.id} className="p-6 hover:bg-stone-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{campaign.campaign_name}</h3>
                        <span className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 ${statusBadge.color}`}>
                          <StatusIcon className="w-3 h-3" />
                          {campaign.status}
                        </span>
                        <span className="px-3 py-1 text-xs rounded-full bg-stone-100 text-stone-600">
                          {campaign.campaign_type}
                        </span>
                      </div>
                      <p className="text-stone-600 mb-2">{campaign.subject_line}</p>
                      <div className="flex items-center gap-4 text-sm text-stone-500">
                        {campaign.scheduled_for && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {new Date(campaign.scheduled_for).toLocaleString()}
                          </span>
                        )}
                        <span>Created: {new Date(campaign.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleSendTest(campaign.id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Send className="w-4 h-4" />
                        Send Test
                      </button>
                      <button
                        onClick={() => setSelectedCampaign(campaign)}
                        className="px-4 py-2 bg-stone-900 text-white rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 text-sm"
                      >
                        <Eye className="w-4 h-4" />
                        View
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Test Result */}
      {testResult && (
        <div className={`mt-6 p-4 rounded-lg ${testResult.success ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          <h3 className="font-semibold mb-2">{testResult.success ? "✓ Test Sent Successfully" : "✗ Test Failed"}</h3>
          <pre className="text-xs overflow-auto">{JSON.stringify(testResult, null, 2)}</pre>
        </div>
      )}

      {/* Campaign Details Modal */}
      {selectedCampaign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-stone-200 flex items-center justify-between">
              <h2 className="text-xl font-semibold">{selectedCampaign.campaign_name}</h2>
              <button
                onClick={() => setSelectedCampaign(null)}
                className="text-stone-500 hover:text-stone-700"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Status</label>
                <p className="text-stone-900">{selectedCampaign.status}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Campaign Type</label>
                <p className="text-stone-900">{selectedCampaign.campaign_type}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-1">Subject Line</label>
                <p className="text-stone-900">{selectedCampaign.subject_line}</p>
              </div>
              {selectedCampaign.scheduled_for && (
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-1">Scheduled For</label>
                  <p className="text-stone-900">{new Date(selectedCampaign.scheduled_for).toLocaleString()}</p>
                </div>
              )}
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => {
                    handleSendTest(selectedCampaign.id)
                    setSelectedCampaign(null)
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  Send Test Email
                </button>
                <button
                  onClick={() => setSelectedCampaign(null)}
                  className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}












































