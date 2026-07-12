export const WORK_WITH_ME_ADMIN_ACTIONS = [
  "contacted",
  "call_booked",
  "lost",
  "save_notes",
] as const

export type WorkWithMeAdminAction = (typeof WORK_WITH_ME_ADMIN_ACTIONS)[number]

type Sql = (
  strings: TemplateStringsArray,
  ...values: unknown[]
) => Promise<Array<Record<string, unknown>>>

type CloseWorkWithMeApplicationInput = {
  applicationId: number
  amountCents: number
  checkoutSessionId: string
}

export function isWorkWithMeAdminAction(value: unknown): value is WorkWithMeAdminAction {
  return WORK_WITH_ME_ADMIN_ACTIONS.includes(value as WorkWithMeAdminAction)
}

export async function ensureWorkWithMePipelineSchema(sql: Sql) {
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS checkout_session_id TEXT
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS checkout_url TEXT
  `
  await sql`
    ALTER TABLE brand_engine_applications
    ADD COLUMN IF NOT EXISTS checkout_created_at TIMESTAMP
  `
}

export async function closeWorkWithMeApplicationForPayment(
  sql: Sql,
  input: CloseWorkWithMeApplicationInput,
) {
  if (!Number.isInteger(input.applicationId) || input.applicationId <= 0) {
    return { updated: false, applicationId: null }
  }

  const rows = await sql`
    UPDATE brand_engine_applications
    SET
      pipeline_stage = 'closed_won',
      status = 'closed_won',
      next_action = 'follow_up',
      call_required = FALSE,
      closed_at = COALESCE(closed_at, NOW()),
      closed_reason = COALESCE(closed_reason, 'paid_via_checkout'),
      cash_collected_cents = GREATEST(COALESCE(cash_collected_cents, 0), ${input.amountCents}),
      checkout_mode = 'payment_link',
      checkout_mode_reason = COALESCE(checkout_mode_reason, 'checkout_completed'),
      checkout_session_id = COALESCE(checkout_session_id, ${input.checkoutSessionId}),
      updated_at = NOW()
    WHERE id = ${input.applicationId}
      AND (
        offer_type = 'work_with_me'
        OR source_channel IN ('work_with_me', 'work-with-me')
        OR lead_tags ? 'work-with-me'
      )
    RETURNING id
  `

  return {
    updated: rows.length > 0,
    applicationId: rows.length > 0 ? input.applicationId : null,
  }
}
