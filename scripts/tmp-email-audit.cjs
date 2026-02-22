require('dotenv').config({ path: '/Users/MD760HA/sselfie-9g/.env.local' })
const { neon } = require('@neondatabase/serverless')
const { Resend } = require('resend')

const sql = neon(process.env.DATABASE_URL)
const resend = new Resend(process.env.RESEND_API_KEY)

async function listAudienceContactsCount(audienceId) {
  let total = 0
  let after = undefined
  let pages = 0
  while (true) {
    const page = await resend.contacts.list({ audienceId, after })
    const rows = Array.isArray(page?.data?.data) ? page.data.data : []
    total += rows.length
    pages += 1
    if (!page?.data?.has_more || !page?.data?.next_after) break
    after = page.data.next_after
    if (pages > 500) break
  }
  return { total, pages }
}

;(async () => {
  const configuredAudienceId = String(process.env.RESEND_AUDIENCE_ID || '').trim()
  const audiencesRes = await resend.audiences.list()
  const audiences = Array.isArray(audiencesRes?.data?.data) ? audiencesRes.data.data : []

  let configuredAudience = null
  let configuredAudienceCount = null
  let configuredAudienceError = null

  if (configuredAudienceId) {
    configuredAudience = audiences.find(a => a.id === configuredAudienceId) || null
    try {
      configuredAudienceCount = await listAudienceContactsCount(configuredAudienceId)
    } catch (e) {
      configuredAudienceError = e?.message || String(e)
    }
  }

  const allAudienceCounts = []
  for (const a of audiences) {
    try {
      const c = await listAudienceContactsCount(a.id)
      allAudienceCounts.push({ id: a.id, name: a.name, contacts: c.total, pages: c.pages })
    } catch (e) {
      allAudienceCounts.push({ id: a.id, name: a.name, contacts: null, error: e?.message || String(e) })
    }
  }

  const [lastBroadcast] = await sql`
    SELECT id, campaign_name, campaign_type, status, approval_status, subject_line, resend_broadcast_id, target_audience, sent_at, created_at
    FROM admin_email_campaigns
    WHERE campaign_name = 'Brand Engine Launch Broadcast Feb 2026'
    ORDER BY created_at DESC
    LIMIT 1
  `

  const [mainAudienceDbCount] = await sql`
    SELECT COUNT(*)::int AS count
    FROM freebie_subscribers
    WHERE email IS NOT NULL AND BTRIM(email) <> ''
  `

  const [emailLogs30] = await sql`
    SELECT COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='delivered')::int AS delivered,
           COUNT(*) FILTER (WHERE status='sent')::int AS sent,
           COUNT(*) FILTER (WHERE status='queued')::int AS queued,
           COUNT(*) FILTER (WHERE status='opened')::int AS opened,
           COUNT(*) FILTER (WHERE status='clicked')::int AS clicked,
           COUNT(*) FILTER (WHERE status='failed')::int AS failed,
           COUNT(*) FILTER (WHERE status='bounced')::int AS bounced,
           COUNT(*) FILTER (WHERE status='complained')::int AS complained
    FROM email_logs
    WHERE sent_at >= NOW() - INTERVAL '30 days'
  `

  const transactionalBreakdown = await sql`
    SELECT email_type,
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE status='delivered')::int AS delivered,
           COUNT(*) FILTER (WHERE status='sent')::int AS sent,
           COUNT(*) FILTER (WHERE status='queued')::int AS queued,
           COUNT(*) FILTER (WHERE status='failed')::int AS failed,
           COUNT(*) FILTER (WHERE status='bounced')::int AS bounced
    FROM email_logs
    WHERE sent_at >= NOW() - INTERVAL '30 days'
      AND email_type IN (
        'welcome-day-0','welcome-day-3','welcome-day-7',
        'onboarding-day-0','onboarding-day-2','onboarding-day-7',
        'nurture-day-1','nurture-day-3','nurture-day-7','nurture-day-10',
        'blueprint-discovery-1','blueprint-discovery-2','blueprint-discovery-5',
        'reactivation-day-0','reactivation-day-2','reactivation-day-5','reactivation-day-7','reactivation-day-10','reactivation-day-14','reactivation-day-20','reactivation-day-25',
        'reengagement-day-0','reengagement-day-7','reengagement-day-14',
        'monthly-usage-recap','win-back-offer',
        'upsell-day-10','upsell-freebie-membership',
        'blueprint-followup-day-3','blueprint-followup-day-7','blueprint-followup-day-14'
      )
    GROUP BY email_type
    ORDER BY total DESC, email_type ASC
  `

  const topFailures = await sql`
    SELECT email_type,
           COUNT(*)::int AS failures,
           MAX(sent_at) AS last_seen
    FROM email_logs
    WHERE sent_at >= NOW() - INTERVAL '30 days'
      AND status IN ('failed','bounced','complained')
    GROUP BY email_type
    ORDER BY failures DESC, email_type ASC
    LIMIT 20
  `

  console.log(JSON.stringify({
    configuredAudienceId,
    configuredAudience,
    configuredAudienceCount,
    configuredAudienceError,
    allAudienceCounts: allAudienceCounts.sort((a,b)=> (b.contacts||0)-(a.contacts||0)),
    mainAudienceDbCount: mainAudienceDbCount?.count || 0,
    lastBroadcast,
    emailLogs30,
    transactionalBreakdown,
    topFailures,
    generatedAt: new Date().toISOString(),
  }, null, 2))
})().catch((e) => {
  console.error('AUDIT_ERROR', e)
  process.exit(1)
})
