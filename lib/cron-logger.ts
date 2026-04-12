import "server-only"
import { logger } from "./logger"
import { sql } from "@/lib/db/client"
import { toErrorEnvelope } from "./error-envelope"


/**
 * Cron Job Logger
 * 
 * Provides consistent logging for cron jobs with:
 * - Unique job run ID for tracing
 * - Job name and schedule
 * - Success/failure status
 * - Job duration
 * - Error details when failures occur
 * - Summary statistics
 * - Database tracking in admin_cron_runs table
 */

/**
 * Generate a unique job run ID
 */
function generateJobRunId(): string {
  return `cron_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Cron Logger instance for a single job execution
 */
export class CronLogger {
  private jobRunId: string
  private jobName: string
  private startTime: number
  private cronRunId: number | null = null

  constructor(jobName: string) {
    this.jobRunId = generateJobRunId()
    this.jobName = jobName
    this.startTime = Date.now()
  }

  /**
   * Get the job run ID for this execution
   */
  getJobRunId(): string {
    return this.jobRunId
  }

  /**
   * Log the start of a cron job
   */
  async start(): Promise<void> {
    logger.info("Cron job started", {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      startTime: new Date().toISOString(),
    })

    // Record start in database
    try {
      const result = await sql`
        INSERT INTO admin_cron_runs (job_name, status, started_at)
        VALUES (${this.jobName}, 'running', NOW())
        RETURNING id
      `
      this.cronRunId = result[0]?.id || null
    } catch (error) {
      // Don't break cron execution if DB write fails
      console.error("[CronLogger] Failed to record start:", error)
    }
  }

  /**
   * Log successful completion of a cron job
   */
  async success(summary?: Record<string, unknown>): Promise<void> {
    const duration = Date.now() - this.startTime
    logger.info("Cron job completed successfully", {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      duration: `${duration}ms`,
      success: true,
      ...summary,
    })

    // Update database record
    try {
      if (this.cronRunId) {
        await sql`
          UPDATE admin_cron_runs
          SET 
            status = 'ok',
            finished_at = NOW(),
            duration_ms = ${duration},
            summary = ${JSON.stringify(summary || {})}
          WHERE id = ${this.cronRunId}
        `
      } else {
        // If start wasn't recorded, create a new record
        await sql`
          INSERT INTO admin_cron_runs (job_name, status, started_at, finished_at, duration_ms, summary)
          VALUES (${this.jobName}, 'ok', to_timestamp(${this.startTime / 1000}), NOW(), ${duration}, ${JSON.stringify(summary || {})})
        `
      }
    } catch (error) {
      // Don't break cron execution if DB write fails
      console.error("[CronLogger] Failed to record success:", error)
    }
  }

  /**
   * Log a cron job failure
   */
  async error(error: Error | unknown, summary?: Record<string, unknown>): Promise<void> {
    const duration = Date.now() - this.startTime
    const envelope = toErrorEnvelope(error, undefined, summary)
    const errorMessage = envelope.message
    const errorName = envelope.code

    logger.error("Cron job failed", error instanceof Error ? error : new Error(errorMessage), {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      duration: `${duration}ms`,
      success: false,
      errorCode: errorName,
      errorMessage,
      ...summary,
    })

    // Log error to admin_email_errors and link it
    let errorId: number | null = null
    try {
      // Insert error directly to get the ID for linking
      const errorResult = await sql`
        INSERT INTO admin_email_errors (tool_name, error_message, error_stack, context, created_at)
        VALUES (
          ${`cron:${this.jobName}`},
          ${envelope.message},
          ${envelope.stack || null},
          ${JSON.stringify({ jobRunId: this.jobRunId, errorCode: envelope.code, ...summary })},
          NOW()
        )
        RETURNING id
      `
      errorId = errorResult[0]?.id || null
    } catch (logError) {
      console.error("[CronLogger] Failed to log error:", logError)
    }

    // Update database record
    const failureSummary = { errorCode: envelope.code, errorMessage: envelope.message, ...summary }
    try {
      if (this.cronRunId) {
        await sql`
          UPDATE admin_cron_runs
          SET 
            status = 'failed',
            finished_at = NOW(),
            duration_ms = ${duration},
            summary = ${JSON.stringify(failureSummary)},
            error_id = ${errorId}
          WHERE id = ${this.cronRunId}
        `
      } else {
        // If start wasn't recorded, create a new record
        await sql`
          INSERT INTO admin_cron_runs (job_name, status, started_at, finished_at, duration_ms, summary, error_id)
          VALUES (
            ${this.jobName}, 
            'failed', 
            to_timestamp(${this.startTime / 1000}), 
            NOW(), 
            ${duration}, 
            ${JSON.stringify(failureSummary)},
            ${errorId}
          )
        `
      }
    } catch (dbError) {
      // Don't break cron execution if DB write fails
      console.error("[CronLogger] Failed to record error:", dbError)
    }
  }

  /**
   * Log a warning for a cron job
   */
  warn(message: string, context?: Record<string, unknown>): void {
    logger.warn(message, {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      ...context,
    })
  }
}

/**
 * Create a cron logger instance for a job
 */
export function createCronLogger(jobName: string): CronLogger {
  return new CronLogger(jobName)
}

