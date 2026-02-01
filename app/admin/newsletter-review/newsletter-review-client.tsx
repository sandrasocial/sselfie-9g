'use client'

import { useState } from 'react'

interface Campaign {
  id: number
  campaign_name: string
  subject_line: string
  body_html?: string
  status: string
  approval_status: string
  scheduled_for?: string
  created_at: string
  metrics?: any
  test_email_sent_to?: string
  test_email_sent_at?: string
  total_recipients?: number
  total_opened?: number
  total_clicked?: number
  sent_at?: string
  // Pre-formatted dates from server to prevent hydration mismatches
  created_at_formatted?: string
  scheduled_for_formatted?: string | null
  test_email_sent_at_formatted?: string | null
  sent_at_formatted?: string | null
}

interface Props {
  pendingCampaigns: Campaign[]
  recentCampaigns: Campaign[]
  rejectedCampaigns: Campaign[]
}

export function NewsletterReviewClient({
  pendingCampaigns,
  recentCampaigns,
  rejectedCampaigns
}: Props) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null)
  const [testEmail, setTestEmail] = useState('ssa@ssasocial.com')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  // Schedule picker state
  const [showSchedulePicker, setShowSchedulePicker] = useState(false)
  const [campaignToApprove, setCampaignToApprove] = useState<number | null>(null)
  const [scheduleOption, setScheduleOption] = useState<'immediate' | 'scheduled'>('immediate')
  const [scheduledDateTime, setScheduledDateTime] = useState('')

  const handleApprove = (campaignId: number) => {
    // Show schedule picker modal
    setCampaignToApprove(campaignId)
    setScheduleOption('immediate')
    setScheduledDateTime('')
    setShowSchedulePicker(true)
  }

  const handleScheduleSubmit = async () => {
    if (!campaignToApprove) return

    // Validate scheduled time if option is 'scheduled'
    if (scheduleOption === 'scheduled' && !scheduledDateTime) {
      setMessage({ type: 'error', text: 'Please select a date and time' })
      return
    }

    setLoading(true)
    setMessage(null)
    setShowSchedulePicker(false)

    try {
      const payload: any = {}

      if (scheduleOption === 'scheduled') {
        payload.scheduled_for = new Date(scheduledDateTime).toISOString()
      }

      const response = await fetch(`/api/admin/email-campaigns/${campaignToApprove}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!response.ok) throw new Error('Failed to approve')

      const successText = scheduleOption === 'immediate'
        ? '✅ Newsletter approved! Will send within 15 minutes.'
        : `✅ Newsletter scheduled for ${new Date(scheduledDateTime).toLocaleString()}`

      setMessage({ type: 'success', text: successText })

      // Refresh page after 2 seconds
      setTimeout(() => window.location.reload(), 2000)

    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to approve newsletter' })
    } finally {
      setLoading(false)
      setCampaignToApprove(null)
    }
  }

  const handleReject = async (campaignId: number) => {
    const reason = prompt('Why are you rejecting this newsletter? (optional)')

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) throw new Error('Failed to reject')

      setMessage({ type: 'success', text: 'Newsletter rejected' })

      // Refresh page after 2 seconds
      setTimeout(() => window.location.reload(), 2000)

    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to reject newsletter' })
    } finally {
      setLoading(false)
    }
  }

  const handleSendTest = async (campaignId: number) => {
    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ testEmail })
      })

      if (!response.ok) throw new Error('Failed to send test')

      setMessage({ type: 'success', text: `✅ Test email sent to ${testEmail}` })

    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to send test email' })
    } finally {
      setLoading(false)
    }
  }

  const handleUnreject = async (campaignId: number) => {
    if (!confirm('Move this newsletter back to pending review?')) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/unreject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to unreject')

      setMessage({ type: 'success', text: '✅ Newsletter moved back to pending review' })

      // Refresh page after 2 seconds
      setTimeout(() => window.location.reload(), 2000)

    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to unreject newsletter' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      {/* Message banner */}
      {message && (
        <div className={`mb-6 p-4 rounded-lg ${
          message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {message.text}
        </div>
      )}

      {/* Schedule Picker Modal */}
      {showSchedulePicker && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              📅 Schedule Newsletter
            </h3>

            <div className="space-y-4 mb-6">
              {/* Immediate option */}
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: scheduleOption === 'immediate' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="schedule"
                  value="immediate"
                  checked={scheduleOption === 'immediate'}
                  onChange={(e) => setScheduleOption(e.target.value as 'immediate')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">Send Immediately</div>
                  <div className="text-sm text-gray-600">
                    Newsletter will be sent within the next 15 minutes
                  </div>
                </div>
              </label>

              {/* Scheduled option */}
              <label className="flex items-start gap-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                style={{ borderColor: scheduleOption === 'scheduled' ? '#3b82f6' : '#e5e7eb' }}>
                <input
                  type="radio"
                  name="schedule"
                  value="scheduled"
                  checked={scheduleOption === 'scheduled'}
                  onChange={(e) => setScheduleOption(e.target.value as 'scheduled')}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-gray-900 mb-2">Schedule for Later</div>
                  {scheduleOption === 'scheduled' && (
                    <input
                      type="datetime-local"
                      value={scheduledDateTime}
                      onChange={(e) => setScheduledDateTime(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      className="w-full px-3 py-2 border rounded"
                    />
                  )}
                </div>
              </label>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowSchedulePicker(false)
                  setCampaignToApprove(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleScheduleSubmit}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 font-semibold"
              >
                {loading ? 'Approving...' : '✅ Approve'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Pending Reviews */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ⏳ Pending Review ({pendingCampaigns.length})
        </h2>

        {pendingCampaigns.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow text-center text-gray-500">
            No newsletters pending review. Gumloop will create new ones automatically.
          </div>
        ) : (
          <div className="space-y-4">
            {pendingCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-orange-500">
                {/* Campaign Header */}
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {campaign.campaign_name}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      <strong>Subject:</strong> {campaign.subject_line}
                    </p>
                    <div className="text-sm text-gray-500">
                      Created: {campaign.created_at_formatted}
                      {campaign.scheduled_for_formatted && (
                        <> • Scheduled for: {campaign.scheduled_for_formatted}</>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaign(
                        selectedCampaign?.id === campaign.id ? null : campaign
                      )}
                      className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                    >
                      {selectedCampaign?.id === campaign.id ? 'Hide' : 'Preview'}
                    </button>
                  </div>
                </div>

                {/* Preview (collapsible) */}
                {selectedCampaign?.id === campaign.id && (
                  <div className="border-t pt-4 mt-4">
                    {/* Test Email */}
                    <div className="mb-4 flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="Test email address"
                        className="flex-1 px-3 py-2 border rounded"
                      />
                      <button
                        onClick={() => handleSendTest(campaign.id)}
                        disabled={loading}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                      >
                        Send Test
                      </button>
                    </div>

                    {campaign.test_email_sent_to && campaign.test_email_sent_at_formatted && (
                      <div className="mb-4 text-sm text-gray-600">
                        Last test sent to {campaign.test_email_sent_to} on{' '}
                        {campaign.test_email_sent_at_formatted}
                      </div>
                    )}

                    {/* Email Preview */}
                    <div className="border rounded-lg overflow-hidden mb-4">
                      <div className="bg-gray-100 p-3 border-b">
                        <div className="text-sm text-gray-600">Preview:</div>
                      </div>
                      <div
                        className="p-6 max-h-96 overflow-y-auto bg-white"
                        dangerouslySetInnerHTML={{ __html: campaign.body_html || '' }}
                      />
                    </div>

                    {/* Metadata */}
                    {campaign.metrics && (
                      <div className="mb-4 p-3 bg-gray-50 rounded">
                        <div className="text-sm font-semibold mb-2">AI Generation Info:</div>
                        <pre className="text-xs text-gray-600 overflow-x-auto">
                          {JSON.stringify(campaign.metrics, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleApprove(campaign.id)}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50"
                      >
                        ✅ Approve & Schedule
                      </button>
                      <button
                        onClick={() => handleReject(campaign.id)}
                        disabled={loading}
                        className="flex-1 px-6 py-3 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-50"
                      >
                        ❌ Reject
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Campaigns */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          ✅ Recent Campaigns
        </h2>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Campaign</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Opens</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {recentCampaigns.map((campaign) => (
                <tr key={campaign.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {campaign.campaign_name}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {campaign.subject_line}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      campaign.status === 'sent' ? 'bg-green-100 text-green-800' :
                      campaign.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.sent_at_formatted || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.total_recipients || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {campaign.total_opened || 0}
                    {campaign.total_recipients && campaign.total_opened ? (
                      <span className="text-xs text-gray-500 ml-1">
                        ({Math.round(campaign.total_opened / campaign.total_recipients * 100)}%)
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejected Campaigns */}
      {rejectedCampaigns.length > 0 && (
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            🚫 Rejected Campaigns
          </h2>

          <div className="space-y-4">
            {rejectedCampaigns.map((campaign) => (
              <div key={campaign.id} className="bg-white p-6 rounded-lg shadow border-l-4 border-red-500">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">
                      {campaign.campaign_name}
                    </h3>
                    <p className="text-gray-600 mb-2">
                      <strong>Subject:</strong> {campaign.subject_line}
                    </p>
                    <div className="text-sm text-gray-500">
                      Created: {campaign.created_at_formatted}
                    </div>
                    {campaign.metrics?.rejection?.reason && (
                      <div className="mt-2 text-sm text-red-600">
                        <strong>Rejection reason:</strong> {campaign.metrics.rejection.reason}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedCampaign(
                        selectedCampaign?.id === campaign.id ? null : campaign
                      )}
                      className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                    >
                      {selectedCampaign?.id === campaign.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => handleUnreject(campaign.id)}
                      disabled={loading}
                      className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                    >
                      🔄 Unreject
                    </button>
                  </div>
                </div>

                {/* Preview (collapsible) */}
                {selectedCampaign?.id === campaign.id && (
                  <div className="border-t pt-4 mt-4">
                    <div className="border rounded-lg overflow-hidden">
                      <div className="bg-gray-100 p-3 border-b">
                        <div className="text-sm text-gray-600">Preview:</div>
                      </div>
                      <div
                        className="p-6 max-h-96 overflow-y-auto bg-white"
                        dangerouslySetInnerHTML={{ __html: campaign.body_html || '' }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
