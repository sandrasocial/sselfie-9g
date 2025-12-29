/**
 * Proactive Email Suggestions System
 * 
 * Analyzes email history, performance patterns, and user behavior
 * to proactively suggest email campaigns with warm, enthusiastic messaging
 */

import { neon } from "@neondatabase/serverless"
import { triggers, UserContext, Suggestion } from "./suggestion-triggers"

const sql = neon(process.env.DATABASE_URL!)

export interface ProactiveSuggestion {
  id?: number
  type: string
  text: string // Warm, enthusiastic message for user
  action?: string // Suggested action button text
  reasoning: string // Data-driven reasoning
  priority: 'urgent' | 'high' | 'medium' | 'low'
  metadata?: Record<string, any>
  created_at?: Date
}

/**
 * Get proactive suggestions for a user
 */
export async function getProactiveSuggestions(
  userId: string,
  userEmail?: string
): Promise<ProactiveSuggestion[]> {
  const suggestions: ProactiveSuggestion[] = []
  
  try {
    const context: UserContext = {
      userId,
      userEmail: userEmail || userId
    }
    
    // Check each trigger
    for (const trigger of triggers) {
      try {
        const suggestion = await trigger.check(context)
        if (suggestion) {
          // Check if we should skip based on recent history
          const recentSameType = await sql`
            SELECT id, dismissed, acted_upon, created_at
            FROM alex_suggestion_history
            WHERE user_id = ${userId}
              AND suggestion_type = ${suggestion.type}
              AND created_at > NOW() - ${trigger.cooldown} * INTERVAL '1 day'
            ORDER BY created_at DESC
            LIMIT 1
          `
          
          // Skip if recently dismissed and not acted upon
          if (recentSameType && recentSameType.length > 0) {
            const recent = recentSameType[0]
            if (recent.dismissed && !recent.acted_upon) {
              continue // Skip this suggestion, still in cooldown
            }
          }
          
          // Convert priority string to integer (urgent=4, high=3, medium=2, low=1)
          const priorityMap: Record<string, number> = {
            urgent: 4,
            high: 3,
            medium: 2,
            low: 1
          }
          const priorityValue = priorityMap[suggestion.priority] || 2 // Default to medium
          
          // Save suggestion to history
          const saved = await sql`
            INSERT INTO alex_suggestion_history (
              user_id, suggestion_type, suggestion_text,
              reasoning, priority
            ) VALUES (
              ${userId}, ${suggestion.type}, ${suggestion.text},
              ${suggestion.reasoning}, ${priorityValue}
            )
            RETURNING id, created_at
          `
          
          suggestions.push({
            id: saved[0]?.id,
            type: suggestion.type,
            text: suggestion.text,
            action: suggestion.action,
            reasoning: suggestion.reasoning,
            priority: suggestion.priority,
            metadata: suggestion.metadata,
            created_at: saved[0]?.created_at
          })
        }
      } catch (error: any) {
        console.error(`[Alex] Error checking trigger ${trigger.name}:`, error)
        // Continue with other triggers even if one fails
      }
    }
    
    // Sort by priority (urgent > high > medium > low)
    const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 }
    suggestions.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99))
    
    // Limit to top 3 to avoid overwhelming
    return suggestions.slice(0, 3)
    
  } catch (error: any) {
    console.error('[Alex] Error getting proactive suggestions:', error)
    return [] // Return empty array on error
  }
}

/**
 * Mark suggestion as dismissed
 */
export async function dismissSuggestion(
  suggestionId: number,
  userId: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE alex_suggestion_history
      SET dismissed = true, dismissed_at = NOW()
      WHERE id = ${suggestionId} AND user_id = ${userId}
    `
    return true
  } catch (error) {
    console.error('[Alex] Error dismissing suggestion:', error)
    return false
  }
}

/**
 * Mark suggestion as acted upon
 */
export async function markSuggestionActedUpon(
  suggestionId: number,
  userId: string
): Promise<boolean> {
  try {
    await sql`
      UPDATE alex_suggestion_history
      SET acted_upon = true, acted_upon_at = NOW()
      WHERE id = ${suggestionId} AND user_id = ${userId}
    `
    return true
  } catch (error) {
    console.error('[Alex] Error marking suggestion acted upon:', error)
    return false
  }
}

/**
 * Get suggestion history for a user
 */
export async function getSuggestionHistory(
  userId: string,
  limit: number = 20
): Promise<ProactiveSuggestion[]> {
  try {
    const history = await sql`
      SELECT 
        id, suggestion_type, suggestion_text, reasoning,
        priority, dismissed, acted_upon, created_at,
        dismissed_at, acted_upon_at
      FROM alex_suggestion_history
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT ${limit}
    `
    
    // Convert priority integer back to string (4=urgent, 3=high, 2=medium, 1=low)
    const priorityReverseMap: Record<number, 'urgent' | 'high' | 'medium' | 'low'> = {
      4: 'urgent',
      3: 'high',
      2: 'medium',
      1: 'low'
    }
    
    return history.map((row: any) => ({
      id: row.id,
      type: row.suggestion_type,
      text: row.suggestion_text,
      reasoning: row.reasoning,
      priority: priorityReverseMap[row.priority] || 'medium',
      dismissed: row.dismissed,
      acted_upon: row.acted_upon,
      created_at: row.created_at
    }))
  } catch (error) {
    console.error('[Alex] Error getting suggestion history:', error)
    return []
  }
}

