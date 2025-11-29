// Minimal internal types to preserve public API (no external dependency)
export type AgentState = Record<string, any>
export type AgentAction = { name: string; execute?: (input: any, state?: AgentState) => Promise<any> }

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
   * Process input (no-op pass-through to maintain API surface)
   */
  async process(
    input: string | object,
    state?: AgentState,
  ): Promise<{
    result: any
    state: AgentState
    error?: Error
  }> {
    const startTime = Date.now()
    this.log("info", "Run started", { input: typeof input === "string" ? input.substring(0, 100) : "object" })
    const duration = Date.now() - startTime
    this.log("info", "Run completed", { duration: `${duration}ms` })
    return { result: input, state: state || {} }
  }

  /**
   * Backwards-compatibility alias for older code calling run()
   */
  async run(
    input: string | object,
    state?: AgentState,
  ): Promise<{ result: any; state: AgentState; error?: Error }> {
    return this.process(input, state)
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
