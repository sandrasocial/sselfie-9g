/**
 * Agent Result Types
 * Standard return types for all agent operations
 */

export interface AgentSuccess<T = unknown> {
  ok: true
  agent: string
  timestamp: number
  data: T
}

export interface AgentFailure {
  ok: false
  agent: string
  timestamp: number
  error: {
    message: string
    stack?: string
    step?: string
  }
}

export type AgentResult<T = unknown> = AgentSuccess<T> | AgentFailure

/**
 * Create a success result
 */
export function success(agent: string, data: unknown): AgentSuccess {
  return {
    ok: true,
    agent,
    timestamp: Date.now(),
    data,
  }
}

/**
 * Create a failure result
 */
export function failure(agent: string, error: Error | string, step?: string): AgentFailure {
  const message = typeof error === "string" ? error : error.message
  const stack = typeof error === "string" ? undefined : error.stack

  return {
    ok: false,
    agent,
    timestamp: Date.now(),
    error: {
      message,
      stack,
      step,
    },
  }
}

/**
 * Check if result is success
 */
export function isSuccess<T>(result: AgentResult<T>): result is AgentSuccess<T> {
  return result.ok === true
}

/**
 * Check if result is failure
 */
export function isFailure<T>(result: AgentResult<T>): result is AgentFailure {
  return result.ok === false
}

