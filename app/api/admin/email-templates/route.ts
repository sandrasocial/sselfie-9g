import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { createServerClient } from "@/lib/supabase/server"
import { getUserByAuthId } from "@/lib/user-mapping"
import { MARKETING_TEMPLATE_CATALOG } from "@/lib/email/marketing-template-catalog"

const sql = neon(process.env.DATABASE_URL!)
const ADMIN_EMAIL = "ssa@ssasocial.com"

async function requireAdmin() {
  const supabase = await createServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }

  const user = await getUserByAuthId(authUser.id)
  if (!user || user.email !== ADMIN_EMAIL) {
    return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) }
  }

  return { user }
}

export async function GET() {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const overrides = await sql`
    SELECT email_type, subject, body_html, body_text, updated_by, updated_at
    FROM email_template_overrides
  `

  const overrideMap = new Map(
    overrides.map((row: any) => [
      row.email_type,
      {
        subject: row.subject,
        html: row.body_html,
        text: row.body_text,
        updatedBy: row.updated_by,
        updatedAt: row.updated_at,
      },
    ]),
  )

  const templates = MARKETING_TEMPLATE_CATALOG.map((entry) => {
    const defaultContent = entry.getDefault()
    const override = overrideMap.get(entry.emailType) || null

    return {
      emailType: entry.emailType,
      label: entry.label,
      description: entry.description || null,
      default: {
        subject: defaultContent.subject || null,
        html: defaultContent.html,
        text: defaultContent.text,
      },
      override,
      active: Boolean(override),
    }
  })

  return NextResponse.json({ templates })
}

export async function PUT(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const body = await request.json()
  const { emailType, subject, html, text } = body

  if (!emailType || !html) {
    return NextResponse.json({ error: "emailType and html are required" }, { status: 400 })
  }

  const [row] = await sql`
    INSERT INTO email_template_overrides (
      email_type,
      subject,
      body_html,
      body_text,
      updated_by
    )
    VALUES (
      ${emailType},
      ${subject || null},
      ${html},
      ${text || null},
      ${auth.user?.email || null}
    )
    ON CONFLICT (email_type)
    DO UPDATE SET
      subject = EXCLUDED.subject,
      body_html = EXCLUDED.body_html,
      body_text = EXCLUDED.body_text,
      updated_by = EXCLUDED.updated_by,
      updated_at = NOW()
    RETURNING email_type, subject, body_html, body_text, updated_by, updated_at
  `

  await sql`
    UPDATE marketing_send_runs
    SET
      subject = ${row?.subject || null},
      body_html = ${row?.body_html || null},
      body_text = ${row?.body_text || null}
    WHERE email_type = ${emailType}
      AND status IN ('queued', 'syncing', 'broadcasting')
  `

  return NextResponse.json({ override: row })
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if ("error" in auth) return auth.error

  const { searchParams } = new URL(request.url)
  const emailType = searchParams.get("emailType")

  if (!emailType) {
    return NextResponse.json({ error: "emailType is required" }, { status: 400 })
  }

  await sql`
    DELETE FROM email_template_overrides
    WHERE email_type = ${emailType}
  `

  const defaultEntry = MARKETING_TEMPLATE_CATALOG.find((entry) => entry.emailType === emailType)
  if (defaultEntry) {
    const defaultContent = defaultEntry.getDefault()
    await sql`
      UPDATE marketing_send_runs
      SET
        subject = ${defaultContent.subject || null},
        body_html = ${defaultContent.html},
        body_text = ${defaultContent.text}
      WHERE email_type = ${emailType}
        AND status IN ('queued', 'syncing', 'broadcasting')
    `
  }

  return NextResponse.json({ success: true })
}
