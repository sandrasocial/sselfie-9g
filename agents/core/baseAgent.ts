import { Agent, type AgentState, type AgentAction } from "@vercel/ai-agent-kit"

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
 * BaseAgent - Foundation class for all agents in the system
 * Wraps @vercel/ai-agent-kit Agent with logging, error handling, and hooks
 */
export class BaseAgent {
  public name: string
  public description: string
  public agentRef: Agent | null = null
  private systemPrompt: string
  private tools: AgentAction[]
  private model: string

  constructor(config: BaseAgentConfig) {
    this.name = config.name
    this.description = config.description
    this.systemPrompt = config.systemPrompt
    this.tools = config.tools || []
    this.model = config.model || "anthropic/claude-sonnet-4"

    this.log("info", "Initialized", { tools: this.tools.length })
    this.initializeAgent()
  }

  /**
   * Initialize the Agent Kit agent
   */
  private initializeAgent(): void {
    try {
      this.agentRef = new Agent({
        name: this.name,
        description: this.description,
        instructions: this.systemPrompt,
        actions: this.tools,
        model: this.model,
      })

      this.log("info", "Agent created successfully")
    } catch (error) {
      this.log("error", "Failed to initialize agent", { error })
      throw error
    }
  }

  /**
   * Run the agent with input
   */
  async run(
    input: string | object,
    state?: AgentState,
  ): Promise<{
    result: any
    state: AgentState
    error?: Error
  }> {
    const startTime = Date.now()
    this.log("info", "Run started", { input: typeof input === "string" ? input.substring(0, 100) : "object" })

    try {
      if (!this.agentRef) {
        throw new Error(`Agent ${this.name} not initialized`)
      }

      // Convert string input to proper format
      const agentInput = typeof input === "string" ? { message: input } : input

      // Run the agent
      const result = await this.agentRef.run(agentInput, state)

      const duration = Date.now() - startTime
      this.log("info", "Run completed", { duration: `${duration}ms` })

      return {
        result,
        state: state || {},
      }
    } catch (error) {
      const duration = Date.now() - startTime
      this.log("error", "Run failed", {
        duration: `${duration}ms`,
        error: error instanceof Error ? error.message : "Unknown error",
      })

      return {
        result: null,
        state: state || {},
        error: error instanceof Error ? error : new Error(String(error)),
      }
    }
  }

  /**
   * Register a new tool/action
   */
  registerTool(tool: AgentAction): void {
    this.tools.push(tool)
    this.log("info", "Tool registered", { toolName: tool.name })

    // Reinitialize agent with new tools
    this.initializeAgent()
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
  } {
    return {
      name: this.name,
      description: this.description,
      toolsCount: this.tools.length,
      model: this.model,
    }
  }

  // TODO: Memory adapter integration
  // async saveMemory(key: string, value: any): Promise<void> {}
  // async loadMemory(key: string): Promise<any> {}
  // async clearMemory(): Promise<void> {}
}

/**
 * Helper function to create a basic agent
 */
export function createAgent(config: BaseAgentConfig): BaseAgent {
  return new BaseAgent(config)
}
