import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface MarketingTemplateOverride {
  email_type: string
  subject: string | null
  body_html: string | null
  body_text: string | null
  updated_by: string | null
  updated_at: string
}

export async function getMarketingTemplateOverride(emailType: string) {
  const [row] = await sql`
    SELECT email_type, subject, body_html, body_text, updated_by, updated_at
    FROM email_template_overrides
    WHERE email_type = ${emailType}
    LIMIT 1
  `

  return (row as MarketingTemplateOverride) || null
}

export async function listMarketingTemplateOverrides() {
  const rows = await sql`
    SELECT email_type, subject, body_html, body_text, updated_by, updated_at
    FROM email_template_overrides
    ORDER BY email_type ASC
  `
  return rows as MarketingTemplateOverride[]
}

export async function resolveMarketingTemplateContent(input: {
  emailType: string
  subject?: string
  html: string
  text: string
}) {
  const override = await getMarketingTemplateOverride(input.emailType)
  if (!override) {
    return {
      subject: input.subject,
      html: input.html,
      text: input.text,
      override: null,
    }
  }

  return {
    subject: override.subject || input.subject,
    html: override.body_html || input.html,
    text: override.body_text || input.text,
    override,
  }
}
