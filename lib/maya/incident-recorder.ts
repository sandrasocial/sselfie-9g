/**
 * Incident Recorder
 * 
 * Phase 6A: Non-blocking incident event recording for safe mode system.
 * 
 * Records incident events from RED alerts automatically, with deduplication.
 * Failures must not break requests (fail silently).
 */

import "server-only"
import { getDb } from "@/lib/db"

export interface IncidentEvent {
  severity: 'red' | 'orange' | 'yellow'
  title: string
  detail: string
  snapshot?: Record<string, any>
  dedupeKey?: string
}

/**
 * Generate deduplication key from alert metadata.
 * 
 * Uses routeId + fingerprint + provider to form stable key.
 * 
 * @param alert - Alert metadata
 * @returns Deduplication key string
 */
function generateDedupeKey(alert: {
  routeId?: string
  metricSnapshot?: Record<string, any>
}): string {
  const parts: string[] = []
  
  if (alert.routeId) {
    parts.push(`route:${alert.routeId}`)
  }
  
  if (alert.metricSnapshot) {
    // Use fingerprint if available
    if (alert.metricSnapshot.fingerprint) {
      parts.push(`fp:${alert.metricSnapshot.fingerprint}`)
    }
    // Use provider/model if available
    if (alert.metricSnapshot.provider) {
      parts.push(`provider:${alert.metricSnapshot.provider}`)
    }
    if (alert.metricSnapshot.model) {
      parts.push(`model:${alert.metricSnapshot.model}`)
    }
  }
  
  return parts.join('|') || `generic:${Date.now()}`
}

/**
 * Check if a similar incident was created recently (within deduplication window).
 * 
 * @param dedupeKey - Deduplication key
 * @param windowMinutes - Deduplication window in minutes (default: 60)
 * @returns True if recent incident exists
 */
export async function hasRecentIncident(
  dedupeKey: string,
  windowMinutes: number = 60
): Promise<boolean> {
  try {
    const sql = getDb()
    
    const [result] = await sql`
      SELECT COUNT(*) as count
      FROM incident_events
      WHERE dedupe_key = ${dedupeKey}
        AND created_at >= NOW() - INTERVAL ${`${windowMinutes} minutes`}
        AND resolved_at IS NULL
    `
    
    return Number(result?.count || 0) > 0
  } catch (error) {
    // Fail silently - don't break requests if deduplication check fails
    console.warn('[INCIDENT-RECORDER] Failed to check recent incidents:', error)
    return false // Allow incident creation if check fails
  }
}

/**
 * Record an incident event.
 * 
 * Non-blocking: Failures must not break requests.
 * 
 * @param event - Incident event data
 * @returns True if incident was recorded, false otherwise
 */
export async function recordIncidentEvent(event: IncidentEvent): Promise<boolean> {
  try {
    const sql = getDb()
    
    // Generate deduplication key
    const dedupeKey = event.dedupeKey || generateDedupeKey({
      routeId: event.snapshot?.routeId,
      metricSnapshot: event.snapshot,
    })
    
    // Check for recent duplicate
    const hasRecent = await hasRecentIncident(dedupeKey, 60) // 60 minute window
    if (hasRecent) {
      console.log(`[INCIDENT-RECORDER] Skipping duplicate incident: ${dedupeKey}`)
      return false
    }
    
    // Insert incident event
    await sql`
      INSERT INTO incident_events (
        severity,
        title,
        detail,
        snapshot,
        dedupe_key
      ) VALUES (
        ${event.severity},
        ${event.title},
        ${event.detail},
        ${event.snapshot ? JSON.stringify(event.snapshot) : null},
        ${dedupeKey}
      )
    `
    
    console.log(`[INCIDENT-RECORDER] Recorded incident: ${event.title} (${event.severity})`)
    return true
  } catch (error) {
    // Fail silently - don't break requests if incident recording fails
    console.warn('[INCIDENT-RECORDER] Failed to record incident:', error)
    return false
  }
}

/**
 * Mark an incident as resolved.
 * 
 * @param incidentId - Incident event ID
 * @param resolutionNote - Optional resolution note
 * @returns True if incident was resolved
 */
export async function resolveIncident(
  incidentId: string,
  resolutionNote?: string
): Promise<boolean> {
  try {
    const sql = getDb()
    
    await sql`
      UPDATE incident_events
      SET resolved_at = NOW(),
          resolution_note = ${resolutionNote || null}
      WHERE id = ${incidentId}
    `
    
    console.log(`[INCIDENT-RECORDER] Resolved incident: ${incidentId}`)
    return true
  } catch (error) {
    console.warn('[INCIDENT-RECORDER] Failed to resolve incident:', error)
    return false
  }
}
