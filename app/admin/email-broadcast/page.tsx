"use client"

import { useState, useEffect } from "react"
import { Plus, Calendar, Send, Eye, Clock, CheckCircle, XCircle } from "lucide-react"
import { BetaTestimonialBroadcast } from '@/components/admin/beta-testimonial-broadcast'
import { EmailCampaignManager } from '@/components/admin/email-campaign-manager'

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

export default function BetaEmailBroadcastPage() {
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  const [formData, setFormData] = useState({
    campaign_name: "",
    campaign_type: "welcome_back_reengagement",
    subject_line: "",
    target_audience: "cold_users",
    scheduled_for: "",
    scheduled_time: "",
  })

  const loadCampaigns = async () => {
    setRefreshing(true)
    try {
      const response = await fetch("/api/admin/agent/email-campaigns")
      const data = await response.json()
      setCampaigns(data.campaigns || [])
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadCampaigns()
  }, [])

  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      let scheduledFor = null
      if (formData.scheduled_for && formData.scheduled_time) {
        scheduledFor = new Date(`${formData.scheduled_for}T${formData.scheduled_time}`).toISOString()
      }

      const targetAudience = {
        segment: formData.target_audience,
      }

      const response = await fetch("/api/admin/agent/email-campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaign_name: formData.campaign_name,
          campaign_type: formData.campaign_type,
          subject_line: formData.subject_line || getDefaultSubject(formData.campaign_type),
          email_body: "",
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
        setRefreshTrigger(prev => prev + 1) // Trigger EmailCampaignManager refresh
      } else {
        throw new Error(result.error || "Failed to create campaign")
      }
    } catch (error: any) {
      console.error("Error creating campaign:", error)
      alert(`Failed to create campaign: ${error.message}`)
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

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-serif text-5xl font-extralight tracking-[0.3em] uppercase text-stone-950 mb-2">
            Email Campaigns
          </h1>
          <p className="text-xs tracking-[0.15em] uppercase font-light text-stone-500">
            Create and manage email campaigns
          </p>
        </div>

        {/* Create Campaign Button */}
        <div className="mb-6">
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="px-6 py-3 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors flex items-center gap-2 uppercase tracking-wider text-sm"
          >
            <Plus className="w-5 h-5" />
            {showCreateForm ? "Cancel" : "Create New Campaign"}
          </button>
        </div>

        {/* Create Campaign Form */}
        {showCreateForm && (
          <div className="bg-white rounded-xl md:rounded-2xl border border-stone-200 shadow-lg p-6 mb-8">
            <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-6">
              Create Campaign
            </h2>
            <form onSubmit={handleCreateCampaign} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Campaign Name</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Campaign Type</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Subject Line</label>
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
                <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Target Audience</label>
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
                  <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Schedule Date (Optional)</label>
                  <input
                    type="date"
                    value={formData.scheduled_for}
                    onChange={(e) => setFormData({ ...formData, scheduled_for: e.target.value })}
                    className="w-full px-4 py-2 border border-stone-300 rounded-lg focus:ring-2 focus:ring-stone-900 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 mb-2 uppercase tracking-wider">Schedule Time (Optional)</label>
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
                  className="px-6 py-2 bg-stone-950 text-white rounded-lg hover:bg-stone-800 transition-colors uppercase tracking-wider text-sm"
                >
                  Create Campaign
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-6 py-2 bg-stone-100 text-stone-700 rounded-lg hover:bg-stone-200 transition-colors uppercase tracking-wider text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Campaign Manager */}
        <EmailCampaignManager refreshTrigger={refreshTrigger} />

        {/* Beta Testimonial Broadcast */}
        <div className="mt-12">
          <h2 className="font-serif text-2xl font-extralight tracking-[0.2em] uppercase text-stone-950 mb-4">Beta Testimonial Broadcast</h2>
          <BetaTestimonialBroadcast />
        </div>
      </div>
    </div>
  )
}
