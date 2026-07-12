import "server-only"

import { sql } from "@/lib/db/client"

export type AudienceSignals = {
  windowDays: number
  promptDemand: Array<{ title: string; copies: number }>
  vaultActivity: {
    landingViews: number
    promptViews: number
    promptCopies: number
    purchases: number
  }
}

type CountRow = { title?: string; event_name?: string; count: string | number }

export async function collectAudienceSignals(windowDays = 30): Promise<AudienceSignals> {
  const interval = `${Math.max(7, Math.min(windowDays, 90))} days`

  const [promptRows, vaultRows] = await Promise.all([
    sql`
      SELECT properties->>'prompt_title' AS title, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name IN ('ai_prompts_prompt_copied', 'prompt_vault_prompt_copied')
        AND properties->>'prompt_title' IS NOT NULL
        AND created_at > NOW() - ${interval}::interval
      GROUP BY 1
      ORDER BY 2 DESC
      LIMIT 15
    ` as unknown as Promise<CountRow[]>,
    sql`
      SELECT event_name, COUNT(*) AS count
      FROM analytics_events
      WHERE event_name IN (
        'prompt_vault_landing_view',
        'prompt_vault_prompt_viewed',
        'prompt_vault_prompt_copied',
        'prompt_vault_checkout_success'
      )
        AND created_at > NOW() - ${interval}::interval
      GROUP BY 1
    ` as unknown as Promise<CountRow[]>,
  ])

  const vaultByEvent: Record<string, number> = {}
  for (const row of vaultRows) {
    vaultByEvent[String(row.event_name)] = Number(row.count || 0)
  }

  return {
    windowDays,
    promptDemand: promptRows.map((row) => ({
      title: String(row.title || ""),
      copies: Number(row.count || 0),
    })),
    vaultActivity: {
      landingViews: vaultByEvent["prompt_vault_landing_view"] || 0,
      promptViews: vaultByEvent["prompt_vault_prompt_viewed"] || 0,
      promptCopies: vaultByEvent["prompt_vault_prompt_copied"] || 0,
      purchases: vaultByEvent["prompt_vault_checkout_success"] || 0,
    },
  }
}
