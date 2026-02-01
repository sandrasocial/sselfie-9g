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

  const handleApprove = async (campaignId: number) => {
    if (!confirm('Approve this newsletter for sending?')) return

    setLoading(true)
    setMessage(null)

    try {
      const response = await fetch(`/api/admin/email-campaigns/${campaignId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })

      if (!response.ok) throw new Error('Failed to approve')

      setMessage({ type: 'success', text: '✅ Newsletter approved and scheduled for sending!' })

      // Refresh page after 2 seconds
      setTimeout(() => window.location.reload(), 2000)

    } catch (error) {
      setMessage({ type: 'error', text: '❌ Failed to approve newsletter' })
    } finally {
      setLoading(false)
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
    </div>
  )
}
