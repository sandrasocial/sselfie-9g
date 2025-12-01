# SSELFIE Agent Architecture

## Overview

The SSELFIE agent system is a unified, type-safe architecture for AI-powered automation. It provides:

- **Single Responsibility Agents**: Each agent has one clear purpose
- **Standardized Interface**: All agents implement `IAgent` for consistency
- **Pipeline Orchestration**: Multi-step workflows with context passing
- **Agent Coordination**: Run multiple agents in parallel
- **Observability**: Built-in logging, metrics, and tracing
- **Admin Integration**: API routes for dashboard control

## Architecture Principles

1. **Single Responsibility**: Each agent has one clear purpose
2. **Composability**: Agents can be combined into pipelines
3. **Type Safety**: Full TypeScript typing throughout
4. **Observability**: Built-in monitoring and logging
5. **Maya Isolation**: User-facing agents (Maya) are completely isolated from admin agents

## Agent Registry

The `AgentRegistry` provides centralized access to all agents:

```typescript
import { AgentRegistry } from "@/agents/core/agent-registry"

// List all agents
const agents = AgentRegistry.list()

// Get specific agent
const agent = AgentRegistry.get("WinbackAgent")

// Check if agent exists
if (AgentRegistry.has("DailyContentAgent")) {
  // ...
}

// Get all metadata
const metadata = AgentRegistry.getAllMetadata()
```

## All Agents

### Content Agents

- **DailyContentAgent**: Generates daily social content (reels, carousels, stories, hooks, captions)
- **FeedDesignerAgent**: Analyzes Instagram feed layouts and provides design recommendations
- **AutoPostingAgent**: Handles automated Instagram post scheduling (stub)
- **FeedPerformanceAgent**: Analyzes feed performance and generates insights (stub)

### Admin Agents

- **AdminSupervisorAgent**: Top-level supervisor for administrative automation, delegates to specialized agents
- **AdminAnalyticsAgent**: Generates analytics summaries and business intelligence
- **SalesDashboardAgent**: Generates weekly sales insights and revenue analytics

### Marketing Agents

- **MarketingAutomationAgent**: High-level marketing orchestration, delegates to queue and sequence agents
- **EmailQueueManager**: Manages email queue (enqueue, dequeue, validation, retry)
- **EmailSequenceAgent**: Manages email sequences (step progression, scheduling, state)

### Sales Agents

- **WinbackAgent**: Generates winback messages for inactive users
- **UpgradeAgent**: Detects upgrade opportunities and generates upgrade recommendations
- **ChurnPreventionAgent**: Handles subscription lifecycle events and retention
- **LeadMagnetAgent**: Delivers lead magnets and tracks conversion

### Strategist Agents

- **PersonalBrandStrategistAgent**: Wrapper for personal brand strategy (accessed via API route)
- **InstagramBioStrategistAgent**: Generates high-converting Instagram bios
- **ContentResearchStrategistAgent**: Conducts Instagram trend research
- **InstagramStrategyAgent**: Creates comprehensive Instagram growth strategies

## Pipeline Orchestrator

The `PipelineOrchestrator` executes multi-step agent workflows sequentially:

```typescript
import { PipelineOrchestrator } from "@/agents/orchestrator"
import { AgentRegistry } from "@/agents/core/agent-registry"

const steps = [
  {
    name: "step-1",
    agent: AgentRegistry.get("WinbackAgent")!,
    run: async (context) => await agent.process(context),
  },
  {
    name: "step-2",
    agent: AgentRegistry.get("EmailSequenceAgent")!,
    run: async (context) => await agent.process(context),
  },
]

const orchestrator = new PipelineOrchestrator(steps)
const result = await orchestrator.run(input)
```

**Features:**
- Sequential execution with context passing
- Error handling with step identification
- Returns structured `PipelineResult`

## Agent Coordinator

The `AgentCoordinator` runs multiple agents in parallel:

```typescript
import { AgentCoordinator } from "@/agents/orchestrator"
import { AgentRegistry } from "@/agents/core/agent-registry"

const agents = [
  AgentRegistry.get("WinbackAgent")!,
  AgentRegistry.get("UpgradeAgent")!,
]

const coordinator = new AgentCoordinator(agents)
const results = await coordinator.execute(input)
```

**Features:**
- Parallel execution of multiple agents
- Automatic metrics and tracing
- Error handling per agent (doesn't stop on failure)
- Execute specific agent by name

## Monitoring Layer

### Logger

Structured logging with timestamps:

```typescript
import { logAgentEvent, logAgentStart, logAgentComplete, logAgentError } from "@/agents/monitoring"

logAgentStart("WinbackAgent", input)
logAgentComplete("WinbackAgent", result)
logAgentError("WinbackAgent", error)
```

### Metrics

In-memory metrics tracking:

```typescript
import { AgentMetrics, getAgentMetrics, getAllMetrics } from "@/agents/monitoring"

// Metrics are automatically recorded by AgentCoordinator
const metrics = getAllMetrics()
const agentMetrics = getAgentMetrics("WinbackAgent")
```

**Tracks:**
- Call counts per agent
- Error counts per agent
- Execution durations per agent

### Tracer

Execution tracing for observability:

```typescript
import { AgentTrace, getAgentTraces, getRecentTraces } from "@/agents/monitoring"

// Traces are automatically recorded by AgentCoordinator
const traces = getRecentTraces(50)
const agentTraces = getAgentTraces("WinbackAgent")
```

**Tracks:**
- Timestamped events (start, complete, error)
- Agent name and event type
- Optional data payload

## Maya Isolation Rule

**CRITICAL**: Maya (user-facing chat agent) is completely isolated from the admin agent system.

- Maya cannot be run via admin APIs
- Admin agents cannot modify Maya
- User-facing flows are protected
- Safety checks block any agent name containing "maya"

## Admin API Routes

### Run Any Agent

**Endpoint**: `POST /api/admin/agents/run`

**Request:**
```json
{
  "agent": "WinbackAgent",
  "input": {
    "action": "generateMessage",
    "params": { ... }
  }
}
```

**Response:**
```json
{
  "success": true,
  "agent": "WinbackAgent",
  "output": { ... },
  "metadata": { ... }
}
```

**List Agents**: `GET /api/admin/agents/run` returns all available agents with metadata.

### Run Pipeline

**Endpoint**: `POST /api/admin/pipelines/run`

**Request:**
```json
{
  "steps": [
    { "agent": "WinbackAgent", "input": { ... } },
    { "agent": "EmailSequenceAgent", "input": { ... } }
  ]
}
```

**Response:**
```json
{
  "success": true,
  "output": { ... },
  "trace": [ ... ],
  "metrics": { ... }
}
```

## Do's and Don'ts

### ✅ Do's

- **Do** implement `IAgent` interface for all new agents
- **Do** add agents to `AgentRegistry` when creating new ones
- **Do** use `AgentCoordinator` for parallel agent execution
- **Do** use `PipelineOrchestrator` for sequential workflows
- **Do** add logging via monitoring helpers
- **Do** keep agents single-responsibility
- **Do** use TypeScript types throughout
- **Do** add JSDoc comments for clarity

### ❌ Don'ts

- **Don't** modify Maya or user-facing agents
- **Don't** bypass `requireAdmin()` in admin routes
- **Don't** create agents that mix multiple responsibilities
- **Don't** use Supabase for database queries (use Neon SQL)
- **Don't** modify existing agent logic without approval
- **Don't** skip input validation in API routes
- **Don't** remove safety checks (Maya blocking, etc.)

## File Structure

```
agents/
├── core/
│   ├── baseAgent.ts          # Base agent class
│   ├── agent-interface.ts    # IAgent interface
│   └── agent-registry.ts     # Central agent registry
├── orchestrator/
│   ├── pipeline.ts           # PipelineOrchestrator (sequential)
│   ├── parallel-pipeline.ts  # ParallelPipeline (mixed parallel/sequential)
│   ├── parallel.ts           # ParallelExecutor (parallel execution)
│   ├── batch-manager.ts      # BatchJobManager (large batch processing)
│   ├── concurrency.ts        # Concurrency limits and throttling
│   ├── coordinator.ts        # AgentCoordinator
│   ├── types.ts              # Pipeline types
│   └── index.ts              # Exports
├── monitoring/
│   ├── logger.ts             # Logging utilities
│   ├── metrics.ts             # Metrics collection
│   ├── tracer.ts              # Execution tracing
│   └── index.ts               # Exports
├── content/                   # Content generation agents
├── admin/                     # Admin automation agents
├── marketing/                 # Marketing automation agents
├── sales/                     # Sales automation agents
└── ARCHITECTURE.md            # This file
```

## Future Enhancements

- **Retry Logic**: Automatic retries for failed agent calls
- **Rate Limiting**: Per-agent rate limiting
- **Caching**: Agent output caching for performance
- **External Observability**: Integration with monitoring services
- **Agent Dependencies**: Declarative agent dependencies
- **Workflow Templates**: Pre-built pipeline templates

## Diagrams

### Agent Execution Flow

```
Input → AgentCoordinator → Agent.process() → Output
         ↓
    Metrics + Tracing
```

### Pipeline Execution Flow

```
Input → Step 1 (AgentResult) → Context → Step 2 (AgentResult) → Context → Step 3 (AgentResult) → Output
         ↓ ok: false?              ↓ ok: false?              ↓ ok: false?
         ↓                         ↓                         ↓
    Stop Pipeline            Stop Pipeline            Stop Pipeline
    Return PipelineResult    Return PipelineResult    Return PipelineResult
    { ok: false,            { ok: false,            { ok: false,
      failedAt: "step-1",     failedAt: "step-2",     failedAt: "step-3",
      steps: [...],           steps: [...],           steps: [...],
      trace: [...],           trace: [...],           trace: [...],
      metrics: {...} }         metrics: {...} }         metrics: {...} }
```

### Coordinator Execution Flow

```
Input → Agent 1 (AgentResult) → Continue
         ↓ ok: false?
         ↓ (record error, continue)
      Agent 2 (AgentResult) → Continue
         ↓ ok: false?
         ↓ (record error, continue)
      Agent 3 (AgentResult) → Complete
         ↓
    Return CoordinatorResult
    { ok: true/false (all succeeded?),
      results: [AgentResult, AgentResult, AgentResult],
      trace: [...],
      metrics: {...} }
```

### Agent Registry Lookup

```
Admin API → AgentRegistry.get(name) → Agent → process(input) → Output
```

## Success/Failure Handling

All agents return `AgentResult` objects:

```typescript
interface AgentSuccess<T> {
  ok: true
  agent: string
  timestamp: number
  data: T
}

interface AgentFailure {
  ok: false
  agent: string
  timestamp: number
  error: {
    message: string
    stack?: string
    step?: string
  }
}
```

**BaseAgent automatically wraps all `run()` calls:**
- `process()` calls `run()` and wraps result in `AgentResult`
- Success → `AgentSuccess` with data
- Failure → `AgentFailure` with error details

**Critical Agents:**
- AdminSupervisorAgent
- MarketingAutomationAgent
- EmailSequenceAgent
- SalesDashboardAgent

Critical agents automatically send email alerts on failure.

**Retry Logic:**
Email-related agents (EmailQueueManager, EmailSequenceAgent, MarketingAutomationAgent) automatically retry on recoverable errors (network/timeout) with exponential backoff (3 retries max).

## Parallel Execution & Concurrency

The SSELFIE agent system supports parallel execution for improved performance and throughput.

### ParallelExecutor

Execute multiple agents concurrently:

```typescript
import { ParallelExecutor } from "@/agents/orchestrator"

const executor = new ParallelExecutor([
  { agent: "DailyContentAgent", input: { type: "reel", topic: "..." } },
  { agent: "FeedDesignerAgent", input: { feedData: {...} } },
  { agent: "AutoPostingAgent", input: { action: "schedule", ... } }
])

const result = await executor.run()
// result.ok = true if all succeeded
// result.results = [AgentResult, AgentResult, AgentResult]
```

### Concurrency Limits

- **CONCURRENCY_LIMIT**: 5 agents max in parallel
- **QUEUE_INTERVAL**: 50ms throttle between tasks
- Automatic throttling for batches > 5 tasks

### BatchJobManager

Process large batches of tasks:

```typescript
import { batchJobManager } from "@/agents/orchestrator"

// Process 100 emails in batches of 5
const result = await batchJobManager.runBatch("EmailQueueManager", [
  { userId: "1", email: "...", ... },
  { userId: "2", email: "...", ... },
  // ... 98 more
])

// result.batches = [ParallelResult, ParallelResult, ...]
// result.totalTasks = 100
// result.successfulTasks = 95
// result.failedTasks = 5
```

### ParallelPipeline

Mixed parallel and sequential execution:

```typescript
import { ParallelPipeline } from "@/agents/orchestrator"

const pipeline = new ParallelPipeline([
  // Parallel block: run these concurrently
  [
    { agent: "DailyContentAgent", input: {...} },
    { agent: "FeedDesignerAgent", input: {...} }
  ],
  // Sequential step: run after parallel block completes
  { agent: "AutoPostingAgent", input: {...} }
])

const result = await pipeline.run({})
```

### When to Use Parallel vs Sequential

**Use Parallel:**
- Independent tasks (no dependencies)
- Large batches (email campaigns, content generation)
- Performance-critical operations
- Tasks that can run concurrently

**Use Sequential:**
- Dependent tasks (step 2 needs step 1's output)
- Critical workflows (must complete in order)
- Resource-intensive tasks (avoid overloading)
- Tasks with shared state

### Parallel API Route

**Endpoint**: `POST /api/admin/pipelines/parallel`

**Request:**
```json
{
  "steps": [
    [
      { "agent": "DailyContentAgent", "input": {...} },
      { "agent": "FeedDesignerAgent", "input": {...} }
    ],
    { "agent": "AutoPostingAgent", "input": {...} }
  ]
}
```

**Response:**
```json
{
  "ok": true,
  "steps": [...],
  "context": {...},
  "trace": [...],
  "metrics": {...}
}
```

### Race Condition Safety

- Each agent execution is isolated
- No shared mutable state between parallel tasks
- Results are collected atomically
- Throttling prevents database/API overload

## Contributing

When adding a new agent:

1. Create agent class extending `BaseAgent` and implementing `IAgent`
2. Add to `AgentRegistry` in `agents/core/agent-registry.ts`
3. Add JSDoc header documenting purpose
4. Implement `run()` method (returns raw data) - `process()` is automatically handled by BaseAgent
5. Implement `getMetadata()` method
6. Add to appropriate category (content/admin/marketing/sales)
7. Mark as `critical: true` in `getMetadata()` if failures should trigger alerts
8. Update this document

## Support

For questions or issues:
- Check this architecture document
- Review agent JSDoc comments
- Examine existing agent implementations
- Consult the monitoring layer for debugging

