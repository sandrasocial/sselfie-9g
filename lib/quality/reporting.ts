/**
 * PROMPT QUALITY REPORTING
 * Phase 2C-4-3: Quality Baseline Reporting Functions
 * 
 * Purpose: Generate summary reports of quality metrics
 * - Weekly/monthly quality summaries
 * - Trend detection (improving/stable/degrading)
 * - Baseline comparisons (future use)
 * 
 * CRITICAL: Internal use only
 * - Not user-facing
 * - Admin/founder access only
 * - Console output or admin logs
 */

import { sql } from "@/lib/neon"

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface QualitySummary {
  period: string // e.g., '2026-01-17 to 2026-01-24'
  totalGenerations: number
  
  // Aggregate Scores
  avgFaceConsistency: number | null
  avgRealism: number | null
  avgStability: number | null
  
  // Score Ranges
  minFaceConsistency: number | null
  maxFaceConsistency: number | null
  minRealism: number | null
  maxRealism: number | null
  
  // Breakdowns
  bySource: Record<string, { count: number; avgRealism: number | null }>
  byModel: Record<string, { count: number; avgRealism: number | null }>
  byCategory: Record<string, { count: number; avgRealism: number | null }>
  
  // Baseline Info
  baselineVersion: string
  isBaseline: boolean
}

export interface QualityTrend {
  metric: 'face_consistency' | 'realism' | 'stability'
  currentAvg: number | null
  previousAvg: number | null
  change: number | null // percentage change
  direction: 'improving' | 'stable' | 'degrading' | 'unknown'
}

// ============================================================================
// SUMMARY FUNCTIONS
// ============================================================================

/**
 * Get quality summary for a time period
 * 
 * @param days Number of days to look back (default: 7)
 * @returns Quality summary with aggregated metrics
 */
export async function getQualitySummary(days: number = 7): Promise<QualitySummary | null> {
  try {
    console.log(`[PROMPT-QUALITY-REPORT] Generating summary for last ${days} days...`)
    
    if (!sql) {
      console.log('[PROMPT-QUALITY-REPORT] Database not available')
      return null
    }
    
    // Get aggregate scores
    const aggregates = await sql`
      SELECT 
        COUNT(*) as total_generations,
        AVG(face_consistency_score) as avg_face_consistency,
        AVG(realism_score) as avg_realism,
        AVG(stability_score) as avg_stability,
        MIN(face_consistency_score) as min_face_consistency,
        MAX(face_consistency_score) as max_face_consistency,
        MIN(realism_score) as min_realism,
        MAX(realism_score) as max_realism,
        MAX(baseline_version) as baseline_version,
        BOOL_OR(is_baseline) as is_baseline
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
    `
    
    if (aggregates.length === 0 || aggregates[0].total_generations === '0') {
      console.log('[PROMPT-QUALITY-REPORT] No data found for period')
      return null
    }
    
    const agg = aggregates[0]
    
    // Get breakdown by source
    const bySource = await sql`
      SELECT 
        source,
        COUNT(*) as count,
        AVG(realism_score) as avg_realism
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      AND source IS NOT NULL
      GROUP BY source
      ORDER BY count DESC
    `
    
    // Get breakdown by model
    const byModel = await sql`
      SELECT 
        model_used,
        COUNT(*) as count,
        AVG(realism_score) as avg_realism
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY model_used
      ORDER BY count DESC
    `
    
    // Get breakdown by category
    const byCategory = await sql`
      SELECT 
        category,
        COUNT(*) as count,
        AVG(realism_score) as avg_realism
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      AND category IS NOT NULL
      GROUP BY category
      ORDER BY count DESC
    `
    
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)
    const endDate = new Date()
    
    const summary: QualitySummary = {
      period: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
      totalGenerations: parseInt(agg.total_generations),
      avgFaceConsistency: agg.avg_face_consistency ? parseFloat(agg.avg_face_consistency) : null,
      avgRealism: agg.avg_realism ? parseFloat(agg.avg_realism) : null,
      avgStability: agg.avg_stability ? parseFloat(agg.avg_stability) : null,
      minFaceConsistency: agg.min_face_consistency ? parseFloat(agg.min_face_consistency) : null,
      maxFaceConsistency: agg.max_face_consistency ? parseFloat(agg.max_face_consistency) : null,
      minRealism: agg.min_realism ? parseFloat(agg.min_realism) : null,
      maxRealism: agg.max_realism ? parseFloat(agg.max_realism) : null,
      bySource: Object.fromEntries(
        bySource.map(row => [
          row.source,
          {
            count: parseInt(row.count),
            avgRealism: row.avg_realism ? parseFloat(row.avg_realism) : null,
          },
        ])
      ),
      byModel: Object.fromEntries(
        byModel.map(row => [
          row.model_used,
          {
            count: parseInt(row.count),
            avgRealism: row.avg_realism ? parseFloat(row.avg_realism) : null,
          },
        ])
      ),
      byCategory: Object.fromEntries(
        byCategory.map(row => [
          row.category,
          {
            count: parseInt(row.count),
            avgRealism: row.avg_realism ? parseFloat(row.avg_realism) : null,
          },
        ])
      ),
      baselineVersion: agg.baseline_version || 'unknown',
      isBaseline: agg.is_baseline || false,
    }
    
    console.log('[PROMPT-QUALITY-REPORT] ✅ Summary generated')
    return summary
  } catch (error) {
    console.error('[PROMPT-QUALITY-REPORT] Error generating summary:', error)
    return null
  }
}

/**
 * Detect quality trends (improving/stable/degrading)
 * 
 * Compares current period vs previous period
 * 
 * @param currentDays Days in current period (default: 7)
 * @param previousDays Days in previous period (default: 7)
 * @returns Array of trend indicators
 */
export async function detectQualityTrends(
  currentDays: number = 7,
  previousDays: number = 7
): Promise<QualityTrend[]> {
  try {
    console.log('[PROMPT-QUALITY-REPORT] Detecting quality trends...')
    
    if (!sql) {
      console.log('[PROMPT-QUALITY-REPORT] Database not available')
      return []
    }
    
    // Get current period metrics
    const currentMetrics = await sql`
      SELECT 
        AVG(face_consistency_score) as avg_face,
        AVG(realism_score) as avg_realism,
        AVG(stability_score) as avg_stability
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${currentDays} days'
    `
    
    // Get previous period metrics
    const previousMetrics = await sql`
      SELECT 
        AVG(face_consistency_score) as avg_face,
        AVG(realism_score) as avg_realism,
        AVG(stability_score) as avg_stability
      FROM prompt_quality_metrics
      WHERE created_at >= NOW() - INTERVAL '${currentDays + previousDays} days'
      AND created_at < NOW() - INTERVAL '${currentDays} days'
    `
    
    if (currentMetrics.length === 0 || previousMetrics.length === 0) {
      console.log('[PROMPT-QUALITY-REPORT] Insufficient data for trend analysis')
      return []
    }
    
    const current = currentMetrics[0]
    const previous = previousMetrics[0]
    
    const trends: QualityTrend[] = []
    
    // Helper to calculate trend
    const calculateTrend = (
      metric: 'face_consistency' | 'realism' | 'stability',
      currentVal: string | null,
      previousVal: string | null
    ): QualityTrend => {
      const curr = currentVal ? parseFloat(currentVal) : null
      const prev = previousVal ? parseFloat(previousVal) : null
      
      let change: number | null = null
      let direction: 'improving' | 'stable' | 'degrading' | 'unknown' = 'unknown'
      
      if (curr !== null && prev !== null && prev !== 0) {
        change = ((curr - prev) / prev) * 100
        
        if (Math.abs(change) < 2) {
          direction = 'stable'
        } else if (change > 0) {
          direction = 'improving'
        } else {
          direction = 'degrading'
        }
      }
      
      return {
        metric,
        currentAvg: curr,
        previousAvg: prev,
        change,
        direction,
      }
    }
    
    trends.push(calculateTrend('face_consistency', current.avg_face, previous.avg_face))
    trends.push(calculateTrend('realism', current.avg_realism, previous.avg_realism))
    trends.push(calculateTrend('stability', current.avg_stability, previous.avg_stability))
    
    console.log('[PROMPT-QUALITY-REPORT] ✅ Trends detected')
    return trends
  } catch (error) {
    console.error('[PROMPT-QUALITY-REPORT] Error detecting trends:', error)
    return []
  }
}

// ============================================================================
// FORMATTED OUTPUT
// ============================================================================

/**
 * Format quality summary for console output
 * 
 * Produces readable text summary for logs
 */
export function formatSummaryForConsole(summary: QualitySummary): string {
  const lines: string[] = []
  
  lines.push('╔════════════════════════════════════════════════════════════════╗')
  lines.push('║         PROMPT QUALITY BASELINE - WEEKLY SUMMARY              ║')
  lines.push('╚════════════════════════════════════════════════════════════════╝')
  lines.push('')
  lines.push(`Period: ${summary.period}`)
  lines.push(`Total Generations: ${summary.totalGenerations}`)
  lines.push(`Baseline Version: ${summary.baselineVersion}`)
  lines.push(`Is Baseline: ${summary.isBaseline ? 'Yes' : 'No'}`)
  lines.push('')
  lines.push('─────────────────────────────────────────────────────────────────')
  lines.push('QUALITY SCORES (0-100 scale)')
  lines.push('─────────────────────────────────────────────────────────────────')
  lines.push(`Face Consistency: ${summary.avgFaceConsistency?.toFixed(1) ?? 'N/A'} (min: ${summary.minFaceConsistency?.toFixed(1) ?? 'N/A'}, max: ${summary.maxFaceConsistency?.toFixed(1) ?? 'N/A'})`)
  lines.push(`Realism:          ${summary.avgRealism?.toFixed(1) ?? 'N/A'} (min: ${summary.minRealism?.toFixed(1) ?? 'N/A'}, max: ${summary.maxRealism?.toFixed(1) ?? 'N/A'})`)
  lines.push(`Stability:        ${summary.avgStability?.toFixed(1) ?? 'N/A'}`)
  lines.push('')
  lines.push('─────────────────────────────────────────────────────────────────')
  lines.push('BY SOURCE')
  lines.push('─────────────────────────────────────────────────────────────────')
  Object.entries(summary.bySource).forEach(([source, data]) => {
    lines.push(`${source.padEnd(15)} ${data.count} generations, avg realism: ${data.avgRealism?.toFixed(1) ?? 'N/A'}`)
  })
  lines.push('')
  lines.push('─────────────────────────────────────────────────────────────────')
  lines.push('BY MODEL')
  lines.push('─────────────────────────────────────────────────────────────────')
  Object.entries(summary.byModel).forEach(([model, data]) => {
    lines.push(`${model.padEnd(15)} ${data.count} generations, avg realism: ${data.avgRealism?.toFixed(1) ?? 'N/A'}`)
  })
  lines.push('')
  
  return lines.join('\n')
}

/**
 * Format trends for console output
 */
export function formatTrendsForConsole(trends: QualityTrend[]): string {
  const lines: string[] = []
  
  lines.push('╔════════════════════════════════════════════════════════════════╗')
  lines.push('║              PROMPT QUALITY TRENDS                            ║')
  lines.push('╚════════════════════════════════════════════════════════════════╝')
  lines.push('')
  
  trends.forEach(trend => {
    const arrow = trend.direction === 'improving' ? '↑' : trend.direction === 'degrading' ? '↓' : '→'
    const changeStr = trend.change !== null ? `${trend.change > 0 ? '+' : ''}${trend.change.toFixed(1)}%` : 'N/A'
    
    lines.push(`${trend.metric.toUpperCase()}:`)
    lines.push(`  Current:  ${trend.currentAvg?.toFixed(1) ?? 'N/A'}`)
    lines.push(`  Previous: ${trend.previousAvg?.toFixed(1) ?? 'N/A'}`)
    lines.push(`  Change:   ${changeStr} ${arrow} ${trend.direction}`)
    lines.push('')
  })
  
  return lines.join('\n')
}

// ============================================================================
// WEEKLY REPORT GENERATION
// ============================================================================

/**
 * Generate complete weekly quality report
 * 
 * This is the main function to call for periodic quality checks
 * 
 * Usage:
 * - Run manually via admin endpoint
 * - Run via cron job
 * - Run in development for testing
 */
export async function generateWeeklyReport(): Promise<void> {
  try {
    console.log('\n')
    console.log('[PROMPT-QUALITY-REPORT] 📊 Generating weekly quality report...')
    console.log('\n')
    
    // Get summary
    const summary = await getQualitySummary(7)
    
    if (!summary) {
      console.log('[PROMPT-QUALITY-REPORT] No data available for report')
      return
    }
    
    // Get trends
    const trends = await detectQualityTrends(7, 7)
    
    // Output formatted report
    console.log(formatSummaryForConsole(summary))
    console.log(formatTrendsForConsole(trends))
    
    console.log('[PROMPT-QUALITY-REPORT] ✅ Weekly report complete')
    console.log('\n')
  } catch (error) {
    console.error('[PROMPT-QUALITY-REPORT] Error generating weekly report:', error)
  }
}

// ============================================================================
// FOUNDER QUESTION: "Are we degrading, stable, or improving?"
// ============================================================================

/**
 * Answer the founder's key question
 * 
 * Returns simple verdict based on aggregate trends
 */
export async function getQualityVerdict(): Promise<{
  verdict: 'improving' | 'stable' | 'degrading' | 'insufficient_data'
  confidence: 'high' | 'medium' | 'low'
  summary: string
}> {
  try {
    const trends = await detectQualityTrends()
    
    if (trends.length === 0) {
      return {
        verdict: 'insufficient_data',
        confidence: 'low',
        summary: 'Not enough data to determine quality trend',
      }
    }
    
    // Count directions
    const improving = trends.filter(t => t.direction === 'improving').length
    const degrading = trends.filter(t => t.direction === 'degrading').length
    const stable = trends.filter(t => t.direction === 'stable').length
    const unknown = trends.filter(t => t.direction === 'unknown').length
    
    // Determine verdict
    let verdict: 'improving' | 'stable' | 'degrading' | 'insufficient_data'
    let confidence: 'high' | 'medium' | 'low'
    
    if (unknown >= 2) {
      verdict = 'insufficient_data'
      confidence = 'low'
    } else if (degrading >= 2) {
      verdict = 'degrading'
      confidence = degrading === 3 ? 'high' : 'medium'
    } else if (improving >= 2) {
      verdict = 'improving'
      confidence = improving === 3 ? 'high' : 'medium'
    } else {
      verdict = 'stable'
      confidence = stable >= 2 ? 'high' : 'medium'
    }
    
    const summary = `Based on ${trends.length} metrics: ${improving} improving, ${stable} stable, ${degrading} degrading, ${unknown} unknown`
    
    return { verdict, confidence, summary }
  } catch (error) {
    console.error('[PROMPT-QUALITY-REPORT] Error getting quality verdict:', error)
    return {
      verdict: 'insufficient_data',
      confidence: 'low',
      summary: 'Error analyzing quality data',
    }
  }
}
