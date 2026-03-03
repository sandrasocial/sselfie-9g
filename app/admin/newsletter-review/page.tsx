import { getDb } from "@/lib/db/client"
import { NewsletterReviewClient } from "./newsletter-review-client"

// Disable caching for this page
export const dynamic = 'force-dynamic'
export const revalidate = 0

/**
 * Newsletter Review Dashboard
 *
 * Review and approve AI-generated newsletters from Gumloop
 * before they are sent to your audience.
 */
export default async function NewsletterReviewPage() {
  const sql = getDb()

  // Fetch pending newsletters (drafts awaiting approval)
  const pendingCampaignsRaw = await sql`
    SELECT
      id,
      campaign_name,
      campaign_type,
      subject_line,
      preview_text,
      body_html,
      status,
      approval_status,
      scheduled_for,
      created_by,
      created_at,
      metrics,
      test_email_sent_to,
      test_email_sent_at
    FROM admin_email_campaigns
    WHERE created_by = 'gumloop-automation'
      AND approval_status IN ('pending', 'draft')
      AND status != 'sent'
    ORDER BY created_at DESC
  `

  // Format dates on server to prevent hydration mismatches
  const pendingCampaigns = pendingCampaignsRaw.map((c: any) => ({
    ...c,
    created_at_formatted: new Date(c.created_at).toLocaleString('en-US', { timeZone: 'UTC' }),
    scheduled_for_formatted: c.scheduled_for ? new Date(c.scheduled_for).toLocaleString('en-US', { timeZone: 'UTC' }) : null,
    test_email_sent_at_formatted: c.test_email_sent_at ? new Date(c.test_email_sent_at).toLocaleString('en-US', { timeZone: 'UTC' }) : null
  }))

  // Fetch recent approved/sent newsletters
  const recentCampaignsRaw = await sql`
    SELECT
      id,
      campaign_name,
      subject_line,
      status,
      approval_status,
      scheduled_for,
      sent_at,
      resend_broadcast_id,
      total_recipients,
      total_opened,
      total_clicked,
      approved_by,
      approved_at,
      created_at
    FROM admin_email_campaigns
    WHERE created_by = 'gumloop-automation'
      AND (approval_status = 'approved' OR status = 'sent')
    ORDER BY COALESCE(sent_at, approved_at, created_at) DESC
    LIMIT 10
  `

  // Format dates on server to prevent hydration mismatches
  const recentCampaigns = recentCampaignsRaw.map((c: any) => ({
    ...c,
    sent_at_formatted: c.sent_at ? new Date(c.sent_at).toLocaleDateString('en-US', { timeZone: 'UTC' }) : null
  }))

  // Fetch rejected campaigns (for reference)
  const rejectedCampaignsRaw = await sql`
    SELECT
      id,
      campaign_name,
      subject_line,
      body_html,
      approval_status,
      created_at,
      metrics
    FROM admin_email_campaigns
    WHERE created_by = 'gumloop-automation'
      AND approval_status = 'rejected'
    ORDER BY created_at DESC
    LIMIT 5
  `

  // Format dates on server to prevent hydration mismatches
  const rejectedCampaigns = rejectedCampaignsRaw.map((c: any) => ({
    ...c,
    created_at_formatted: new Date(c.created_at).toLocaleString('en-US', { timeZone: 'UTC' })
  }))

  // Calculate stats
  const stats = {
    pending: pendingCampaigns.length,
    approved: recentCampaigns.filter((c: any) => c.status === 'sent').length,
    rejected: rejectedCampaigns.length
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            📧 Newsletter Review
          </h1>
          <p className="text-gray-600">
            Review and approve AI-generated newsletters from Gumloop before sending
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">Pending Review</div>
            <div className="text-3xl font-bold text-orange-600">{stats.pending}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">Approved & Sent</div>
            <div className="text-3xl font-bold text-green-600">{stats.approved}</div>
          </div>
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="text-sm text-gray-500 mb-1">Rejected</div>
            <div className="text-3xl font-bold text-red-600">{stats.rejected}</div>
          </div>
        </div>

        {/* Pass data to client component */}
        <NewsletterReviewClient
          pendingCampaigns={pendingCampaigns}
          recentCampaigns={recentCampaigns}
          rejectedCampaigns={rejectedCampaigns}
        />
      </div>
    </div>
  )
}
