-- Debug: Check all recent campaigns
SELECT
  id,
  campaign_name,
  subject_line,
  created_by,
  status,
  approval_status,
  created_at,
  LENGTH(body_html) as html_length,
  LENGTH(body_text) as text_length
FROM admin_email_campaigns
ORDER BY created_at DESC
LIMIT 20;

-- Check specifically for Gumloop campaigns
SELECT
  id,
  campaign_name,
  subject_line,
  status,
  approval_status,
  created_at
FROM admin_email_campaigns
WHERE created_by = 'gumloop-automation'
ORDER BY created_at DESC;

-- Check what the review page query would return
SELECT
  id,
  campaign_name,
  subject_line,
  created_by,
  status,
  approval_status
FROM admin_email_campaigns
WHERE created_by = 'gumloop-automation'
  AND approval_status IN ('pending', 'draft')
  AND status != 'sent'
ORDER BY created_at DESC;
