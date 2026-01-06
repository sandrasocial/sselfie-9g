import "server-only"
import { logger } from "./logger"

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
  start(): void {
    logger.info("Cron job started", {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      startTime: new Date().toISOString(),
    })
  }

  /**
   * Log successful completion of a cron job
   */
  success(summary?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime
    logger.info("Cron job completed successfully", {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      duration: `${duration}ms`,
      success: true,
      ...summary,
    })
  }

  /**
   * Log a cron job failure
   */
  error(error: Error | unknown, summary?: Record<string, unknown>): void {
    const duration = Date.now() - this.startTime
    const errorMessage = error instanceof Error ? error.message : String(error)
    const errorName = error instanceof Error ? error.name : "UnknownError"

    logger.error("Cron job failed", error instanceof Error ? error : new Error(errorMessage), {
      jobRunId: this.jobRunId,
      jobName: this.jobName,
      duration: `${duration}ms`,
      success: false,
      errorName,
      errorMessage,
      ...summary,
    })
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

