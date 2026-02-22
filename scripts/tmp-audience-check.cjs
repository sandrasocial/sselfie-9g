require('dotenv').config({ path: '/Users/MD760HA/sselfie-9g/.env.local' })
const { neon } = require('@neondatabase/serverless')
const { Resend } = require('resend')

const sql = neon(process.env.DATABASE_URL)
const resend = new Resend(process.env.RESEND_API_KEY)

;(async () => {
  const dbCount = await sql`select count(*)::int as count from freebie_subscribers`
  const dbEmailCount = await sql`select count(*)::int as count from freebie_subscribers where email is not null and trim(email) <> ''`
  const audienceId = process.env.RESEND_AUDIENCE_ID

  let audienceCount = null
  let listError = null
  if (audienceId) {
    try {
      let total = 0
      let after = undefined
      while (true) {
        const page = await resend.contacts.list({ audienceId, after })
        const data = Array.isArray(page?.data?.data) ? page.data.data : []
        total += data.length
        if (!page?.data?.has_more || !page?.data?.next_after) break
        after = page.data.next_after
      }
      audienceCount = total
    } catch (e) {
      listError = e?.message || String(e)
    }
  }

  const campaigns = await sql`select id,campaign_name,status,approval_status,total_recipients,total_sent,resend_broadcast_id,created_at,sent_at from admin_email_campaigns where campaign_name='Brand Engine Launch Broadcast Feb 2026' order by created_at desc limit 5`

  console.log(JSON.stringify({
    resendAudienceIdConfigured: !!audienceId,
    audienceId,
    dbCount: dbCount[0]?.count || 0,
    dbEmailCount: dbEmailCount[0]?.count || 0,
    audienceCount,
    listError,
    recentCampaigns: campaigns,
  }, null, 2))
})().catch((e) => {
  console.error(e)
  process.exit(1)
})
