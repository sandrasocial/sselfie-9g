/**
 * Get Sandra Journal Tool
 * Fetches Sandra's recent weekly journal entries
 */

import type { Tool, ToolResult } from '../../types'
import { sql, ALEX_CONSTANTS } from '../../shared/dependencies'

interface GetSandraJournalInput {
  weeks?: number
}

export const getSandraJournalTool: Tool<GetSandraJournalInput> = {
  name: "get_sandra_journal",
  description: "Get Sandra's recent weekly journal entries with her stories, struggles, wins, and product updates. Use this to create authentic content that reflects Sandra's current reality.",

  input_schema: {
    type: "object",
    properties: {
      weeks: {
        type: "number",
        description: "Number of recent weeks to fetch (default: 4, max: 12)"
      }
    },
    required: []
  },

  async execute(params: GetSandraJournalInput = {}): Promise<ToolResult> {
    try {
      const weeks = Math.min(params?.weeks || 4, 12)
      
      // Get Sandra's user ID from email
      const sandraUser = await sql`
        SELECT id FROM users WHERE email = ${ALEX_CONSTANTS.ADMIN_EMAIL} LIMIT 1
      `
      
      if (!sandraUser || sandraUser.length === 0) {
        return {
          success: false,
          message: "Sandra's user account not found"
        }
      }
      
      const sandraUserId = String(sandraUser[0].id)
      
      const journals = await sql`
        SELECT 
          week_start_date,
          week_end_date,
          features_built_enhanced,
          personal_story_enhanced,
          struggles_enhanced,
          wins_enhanced,
          fun_activities,
          weekly_goals,
          future_self_vision_enhanced,
          created_at
        FROM weekly_journal
        WHERE user_id = ${sandraUserId}
          AND published = TRUE
        ORDER BY week_start_date DESC
        LIMIT ${weeks}
      `
      
      if (journals.length === 0) {
        return {
          success: false,
          message: "No journal entries found. Sandra hasn't published any weekly updates yet."
        }
      }
      
      // Format for Alex's consumption
      const formattedJournal = journals.map((j: any) => ({
        week: `${j.week_start_date} to ${j.week_end_date}`,
        what_sandra_built: j.features_built_enhanced,
        sandra_story: j.personal_story_enhanced,
        struggles: j.struggles_enhanced,
        wins: j.wins_enhanced,
        fun: j.fun_activities,
        goals: j.weekly_goals,
        vision: j.future_self_vision_enhanced
      }))
      
      return {
        success: true,
        weeks_retrieved: journals.length,
        journal_entries: formattedJournal,
        usage_note: "Use this context to create emails, captions, and content that reflects Sandra's current reality and authentic voice. Reference specific stories, struggles, and wins to make content genuine."
      }
    } catch (error: any) {
      console.error('[Alex] ❌ Error getting Sandra journal:', error)
      return { success: false, error: `Failed to get journal: ${error.message}` }
    }
  }
}

