/**
 * Agent Logging Utilities
 * Provides structured logging for agent events
 */

/**
 * Log an agent event
 * @param agentName - Name of the agent
 * @param event - Event type (e.g., "started", "completed", "error")
 * @param data - Optional data to log
 */
export function logAgentEvent(agentName: string, event: string, data?: any): void {
  const timestamp = new Date().toISOString()
  const logMessage = `[${timestamp}] [Agent:${agentName}] ${event}`

  if (data !== undefined) {
    if (event === "error") {
      console.error(logMessage, data)
    } else {
      console.log(logMessage, data)
    }
  } else {
    console.log(logMessage)
  }
}

/**
 * Log agent start
 */
export function logAgentStart(agentName: string, input?: any): void {
  logAgentEvent(agentName, "started", input)
}

/**
 * Log agent completion
 */
export function logAgentComplete(agentName: string, result?: any): void {
  logAgentEvent(agentName, "completed", result)
}

/**
 * Log agent error
 */
export function logAgentError(agentName: string, error: Error | string): void {
  const errorData = error instanceof Error ? { message: error.message, stack: error.stack } : error
  logAgentEvent(agentName, "error", errorData)
}

