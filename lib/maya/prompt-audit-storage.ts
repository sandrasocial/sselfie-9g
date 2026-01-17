/**
 * Prompt Audit Event Storage
 * 
 * Phase 5A: Persists prompt audit events to database for health monitoring.
 * 
 * Fails silently if database insert fails (non-blocking).
 */

import "server-only"
import { getDb } from "@/lib/db"

export interface PromptAuditEvent {
  routeId: string
  routePath?: string
  promptType?: string
  fingerprint: string
  provider?: string
  model?: string
  status: 'ok' | 'error'
  errorCode?: string
  requestId?: string
  userId?: string
  mode?: string
  feature?: string
  builder?: string
  executionTimeMs?: number
  promptLength?: number
  inputHash?: string
  outputHash?: string
  pathUsed?: 'authority' | 'legacy'
}

/**
 * Persist prompt audit event to database.
 * 
 * Fails silently if database insert fails (non-blocking).
 * 
 * @param event - Audit event data
 */
export async function persistPromptAuditEvent(event: PromptAuditEvent): Promise<void> {
  try {
    const sql = getDb()
    
    await sql`
      INSERT INTO prompt_audit_events (
        route_id,
        route_path,
        prompt_type,
        fingerprint,
        provider,
        model,
        status,
        error_code,
        request_id,
        user_id,
        mode,
        feature,
        builder,
        execution_time_ms,
        prompt_length,
        input_hash,
        output_hash,
        path_used
      ) VALUES (
        ${event.routeId},
        ${event.routePath || null},
        ${event.promptType || null},
        ${event.fingerprint},
        ${event.provider || null},
        ${event.model || null},
        ${event.status},
        ${event.errorCode || null},
        ${event.requestId || null},
        ${event.userId || null},
        ${event.mode || null},
        ${event.feature || null},
        ${event.builder || null},
        ${event.executionTimeMs || null},
        ${event.promptLength || null},
        ${event.inputHash || null},
        ${event.outputHash || null},
        ${event.pathUsed || null}
      )
    `
  } catch (error) {
    // Fail silently - don't break prompt generation if audit logging fails
    console.warn('[PROMPT-AUDIT] Failed to persist audit event:', error)
  }
}
