// Minimal internal types to preserve public API (no external dependency)
export type AgentState = Record<string, any>
export type AgentAction = { name: string; execute?: (input: any, state?: AgentState) => Promise<any> }

// Import agent result types
import type { AgentResult } from "./agent-result"
import { success, failure } from "./agent-result"

/**
 * BaseAgent Configuration
 */
export interface BaseAgentConfig {
  name: string
  description: string
  systemPrompt: string
  tools?: AgentAction[]
  model?: string
}

/**
 * BaseAgent - Internal lightweight agent container without external dependencies
 */
export class BaseAgent {
  public name: string
  public description: string
  private systemPrompt: string
  private tools: AgentAction[]
  private model: string
  public supportsStreaming: boolean = false

  constructor(config: BaseAgentConfig) {
    this.name = config.name
    this.description = config.description
    this.systemPrompt = config.systemPrompt
    this.tools = config.tools || []
    this.model = config.model || "anthropic/claude-sonnet-4"
    this.log("info", "Initialized", { tools: this.tools.length })
  }

  /**
   * Internal run method - agents should override this
   * Returns raw data (not wrapped in AgentResult)
   */
  async run(input: unknown): Promise<unknown> {
    // Default implementation - agents should override
    return input
  }

  /**
   * Process input - universal wrapper that returns AgentResult
   * Automatically wraps success/failure and handles critical alerts
   */
  async process(input: unknown): Promise<AgentResult> {
    try {
      const data = await this.run(input)
      return success(this.name, data)
    } catch (err: unknown) {
      const error = err instanceof Error ? err : new Error(String(err))
      const result = failure(this.name, error)

      // Send critical alert if agent is marked as critical
      const metadata = this.getMetadata() as any
      if (metadata.critical === true) {
        // Import dynamically to avoid circular dependencies
        import("@/agents/monitoring/alerts")
          .then(({ sendCriticalAlert }) => {
            sendCriticalAlert(this.name, error.message).catch(console.error)
          })
          .catch(console.error)
      }

      return result
    }
  }

  /**
   * Optional streaming API - disabled by default
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async stream(_input: string | object, _state?: AgentState): Promise<AsyncIterable<string>> {
    throw new Error(`Streaming not enabled for agent ${this.name}`)
  }

  /**
   * Register a new tool/action
   */
  registerTool(tool: AgentAction): void {
    this.tools.push(tool)
    this.log("info", "Tool registered", { toolName: tool.name })
  }

  /**
   * Get all registered tools
   */
  getTools(): AgentAction[] {
    return this.tools
  }

  /**
   * Built-in logging with tags
   */
  private log(level: "info" | "warn" | "error", message: string, meta?: Record<string, any>): void {
    const timestamp = new Date().toISOString()
    const tag = `[Agent:${this.name}]`
    const logMessage = `${timestamp} ${tag} ${message}`
    if (level === "error") {
      console.error(logMessage, meta || "")
    } else if (level === "warn") {
      console.warn(logMessage, meta || "")
    } else {
      console.log(logMessage, meta || "")
    }
  }

  /**
   * Get agent metadata
   */
  getMetadata(): {
    name: string
    description: string
    toolsCount: number
    model: string
    critical?: boolean
  } {
    return {
      name: this.name,
      description: this.description,
      toolsCount: this.tools.length,
      model: this.model,
    }
  }
}

/**
 * Helper function to create a basic agent
 */
export function createAgent(config: BaseAgentConfig): BaseAgent {
  return new BaseAgent(config)
}
