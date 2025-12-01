/**
 * Pipeline Runs Data Access
 * Handles persistence and retrieval of pipeline execution history
 */

import { neon } from "@neondatabase/serverless"

const sql = neon(process.env.DATABASE_URL!)

export interface PipelineRun {
  id: string
  pipeline: string
  ok: boolean
  steps: unknown
  result: unknown
  duration_ms: number | null
  started_at: Date | null
  ended_at: Date | null
  created_at: Date | null
}

/**
 * Save a pipeline run to the database
 */
export async function savePipelineRun(
  pipeline: string,
  steps: unknown,
  result: unknown,
  duration: number,
): Promise<string> {
  const id = crypto.randomUUID()
  const ok = typeof result === "object" && result !== null && "ok" in result ? (result as any).ok : false

  await sql`
    INSERT INTO pipeline_runs (id, pipeline, ok, steps, result, duration_ms, started_at, ended_at)
    VALUES (
      ${id},
      ${pipeline},
      ${ok},
      ${JSON.stringify(steps)},
      ${JSON.stringify(result)},
      ${duration},
      NOW(),
      NOW()
    )
  `

  return id
}

/**
 * Get recent pipeline runs
 */
export async function getRecentPipelineRuns(limit: number = 20): Promise<PipelineRun[]> {
  const rows = await sql`
    SELECT 
      id,
      pipeline,
      ok,
      steps,
      result,
      duration_ms,
      started_at,
      ended_at,
      created_at
    FROM pipeline_runs
    ORDER BY started_at DESC
    LIMIT ${limit}
  `

  return rows as PipelineRun[]
}

/**
 * Get a pipeline run by ID
 */
export async function getPipelineRunById(id: string): Promise<PipelineRun | null> {
  const rows = await sql`
    SELECT 
      id,
      pipeline,
      ok,
      steps,
      result,
      duration_ms,
      started_at,
      ended_at,
      created_at
    FROM pipeline_runs
    WHERE id = ${id}
    LIMIT 1
  `

  return (rows[0] as PipelineRun) || null
}

/**
 * Get pipeline runs for a specific pipeline name
 */
export async function getPipelineRunsByName(pipeline: string, limit: number = 20): Promise<PipelineRun[]> {
  const rows = await sql`
    SELECT 
      id,
      pipeline,
      ok,
      steps,
      result,
      duration_ms,
      started_at,
      ended_at,
      created_at
    FROM pipeline_runs
    WHERE pipeline = ${pipeline}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `

  return rows as PipelineRun[]
}

/**
 * Get pipeline runs by success status
 */
export async function getPipelineRunsByStatus(ok: boolean, limit: number = 20): Promise<PipelineRun[]> {
  const rows = await sql`
    SELECT 
      id,
      pipeline,
      ok,
      steps,
      result,
      duration_ms,
      started_at,
      ended_at,
      created_at
    FROM pipeline_runs
    WHERE ok = ${ok}
    ORDER BY started_at DESC
    LIMIT ${limit}
  `

  return rows as PipelineRun[]
}

