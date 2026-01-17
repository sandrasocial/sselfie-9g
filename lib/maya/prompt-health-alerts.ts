/**
 * Prompt Health Alert Rules
 * 
 * Phase 5B: Simple alert evaluation for prompt health dashboard.
 * 
 * Evaluates audit event data and returns alerts based on thresholds.
 */

export interface Alert {
  severity: 'red' | 'orange' | 'yellow'
  title: string
  detail: string
  routeId?: string
  metricSnapshot?: Record<string, any>
}

export interface RouteStats {
  routeId: string
  total: number
  errors: number
  errorRate: number
}

export interface ProviderErrorStats {
  provider: string | null
  model: string | null
  errorCount: number
}

export interface DriftEvent {
  routeId: string
  changeCount: number
  lastChangedAt: string | null
}

/**
 * Stable routes expected to have consistent fingerprints.
 * Used for drift severity weighting.
 */
export const STABLE_ROUTES = [
  'EP-03', // Feed prompt generation
  'EP-06', // Blueprint concepts
  'EP-05', // Feed single post
] as const

/**
 * Evaluate alert rules based on audit event statistics.
 * 
 * @param routeStats - Route statistics (total, errors, errorRate)
 * @param providerErrors - Provider/model error counts
 * @param driftEvents - Fingerprint drift events
 * @param timeWindowHours - Time window in hours (default: 24)
 * @returns Array of alerts sorted by severity
 */
export function evaluateAlertRules(
  routeStats: RouteStats[],
  providerErrors: ProviderErrorStats[],
  driftEvents: DriftEvent[],
  timeWindowHours: number = 24
): Alert[] {
  const alerts: Alert[] = []

  // RED ALERTS
  // Rule: Any route errorRate >= 20% AND volume >= 20 in last 24h
  for (const route of routeStats) {
    if (route.errorRate >= 20 && route.total >= 20 && timeWindowHours <= 24) {
      alerts.push({
        severity: 'red',
        title: `High Error Rate: ${route.routeId}`,
        detail: `${route.routeId} has ${route.errorRate.toFixed(1)}% error rate (${route.errors} errors out of ${route.total} requests) in last ${timeWindowHours}h`,
        routeId: route.routeId,
        metricSnapshot: {
          errorRate: route.errorRate,
          errors: route.errors,
          total: route.total,
        },
      })
    }
  }

  // Rule: Any provider/model has >= 10 errors in last 1h
  if (timeWindowHours <= 1) {
    for (const providerError of providerErrors) {
      if (providerError.errorCount >= 10) {
        alerts.push({
          severity: 'red',
          title: `Provider Error Spike: ${providerError.provider || 'Unknown'}/${providerError.model || 'Unknown'}`,
          detail: `${providerError.provider || 'Unknown'}/${providerError.model || 'Unknown'} has ${providerError.errorCount} errors in last hour`,
          metricSnapshot: {
            provider: providerError.provider,
            model: providerError.model,
            errorCount: providerError.errorCount,
          },
        })
      }
    }
  }

  // ORANGE ALERTS
  // Rule: Any route error count >= 10 in last 24h
  if (timeWindowHours <= 24) {
    for (const route of routeStats) {
      if (route.errors >= 10 && route.errorRate < 20) {
        alerts.push({
          severity: 'orange',
          title: `Elevated Errors: ${route.routeId}`,
          detail: `${route.routeId} has ${route.errors} errors in last ${timeWindowHours}h (${route.errorRate.toFixed(1)}% error rate)`,
          routeId: route.routeId,
          metricSnapshot: {
            errors: route.errors,
            errorRate: route.errorRate,
            total: route.total,
          },
        })
      }
    }
  }

  // Rule: Any route drift count >= 3 in last 24h
  if (timeWindowHours <= 24) {
    for (const drift of driftEvents) {
      if (drift.changeCount >= 3) {
        alerts.push({
          severity: 'orange',
          title: `Frequent Drift: ${drift.routeId}`,
          detail: `${drift.routeId} has ${drift.changeCount} fingerprint changes in last ${timeWindowHours}h`,
          routeId: drift.routeId,
          metricSnapshot: {
            changeCount: drift.changeCount,
            lastChangedAt: drift.lastChangedAt,
          },
        })
      }
    }
  }

  // YELLOW ALERTS
  // Rule: Any drift detected in last 24h for stable routes
  if (timeWindowHours <= 24) {
    for (const drift of driftEvents) {
      if (STABLE_ROUTES.includes(drift.routeId as any) && drift.changeCount > 0) {
        alerts.push({
          severity: 'yellow',
          title: `Stable Route Drift: ${drift.routeId}`,
          detail: `Stable route ${drift.routeId} has ${drift.changeCount} fingerprint change(s) in last ${timeWindowHours}h. This may indicate accidental prompt edits.`,
          routeId: drift.routeId,
          metricSnapshot: {
            changeCount: drift.changeCount,
            lastChangedAt: drift.lastChangedAt,
          },
        })
      }
    }
  }

  // Rule: Any drift detected (general)
  for (const drift of driftEvents) {
    if (drift.changeCount > 0 && !STABLE_ROUTES.includes(drift.routeId as any)) {
      const existingAlert = alerts.find(
        (a) => a.routeId === drift.routeId && a.severity === 'orange'
      )
      if (!existingAlert) {
        alerts.push({
          severity: 'yellow',
          title: `Fingerprint Drift: ${drift.routeId}`,
          detail: `${drift.routeId} has ${drift.changeCount} fingerprint change(s) in last ${timeWindowHours}h`,
          routeId: drift.routeId,
          metricSnapshot: {
            changeCount: drift.changeCount,
            lastChangedAt: drift.lastChangedAt,
          },
        })
      }
    }
  }

  // Sort by severity: red → orange → yellow
  const severityOrder = { red: 0, orange: 1, yellow: 2 }
  alerts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity])

  return alerts
}
