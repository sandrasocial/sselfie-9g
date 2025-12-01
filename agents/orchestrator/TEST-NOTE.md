# Orchestrator & Coordinator Testing Guide

## Overview

This document describes how to test the `PipelineOrchestrator` and `AgentCoordinator` components. These are structural tests to verify orchestration logic, not full integration tests.

## PipelineOrchestrator Testing

### How to Run a Fake Pipeline

```typescript
import { PipelineOrchestrator } from "@/agents/orchestrator"
import { AgentRegistry } from "@/agents/core/agent-registry"

// Create mock pipeline steps
const steps = [
  {
    name: "step-1-mock",
    agent: AgentRegistry.get("WinbackAgent")!,
    run: async (context: unknown) => {
      console.log("Step 1 executed with:", context)
      return { ...context, step1: "complete" }
    },
  },
  {
    name: "step-2-mock",
    agent: AgentRegistry.get("EmailSequenceAgent")!,
    run: async (context: unknown) => {
      console.log("Step 2 executed with:", context)
      return { ...context, step2: "complete" }
    },
  },
]

// Run pipeline
const orchestrator = new PipelineOrchestrator(steps)
const result = await orchestrator.run({ initial: "data" })

console.log("Pipeline result:", result)
// Expected: { success: true, context: { initial: "data", step1: "complete", step2: "complete" } }
```

### Expected Behavior

**Success Case:**
- All steps execute sequentially
- Context is passed from step to step
- Returns `{ success: true, context: <final context> }`

**Failure Case:**
- Execution stops at first error
- Returns `{ success: false, error: { step: "step-name", message: "error message" } }`
- Subsequent steps are not executed

### Edge Cases

1. **Empty Pipeline:**
   ```typescript
   const orchestrator = new PipelineOrchestrator([])
   const result = await orchestrator.run({})
   // Expected: { success: true, context: {} }
   ```

2. **Single Step:**
   ```typescript
   const steps = [{ name: "single", agent: agent, run: async (ctx) => ctx }]
   const orchestrator = new PipelineOrchestrator(steps)
   // Should execute normally
   ```

3. **Step Returns Null/Undefined:**
   ```typescript
   run: async (context) => null
   // Context becomes null for next step
   ```

4. **Step Throws Error:**
   ```typescript
   run: async (context) => {
     throw new Error("Step failed")
   }
   // Pipeline stops, returns error result
   ```

5. **Context Mutation:**
   ```typescript
   // Each step receives context from previous step
   // Modifications are passed forward
   ```

## AgentCoordinator Testing

### How to Run Coordinator with Mock Inputs

```typescript
import { AgentCoordinator } from "@/agents/orchestrator"
import { AgentRegistry } from "@/agents/core/agent-registry"

// Create coordinator with multiple agents
const agents = [
  AgentRegistry.get("WinbackAgent")!,
  AgentRegistry.get("UpgradeAgent")!,
  AgentRegistry.get("ChurnPreventionAgent")!,
]

const coordinator = new AgentCoordinator(agents)

// Execute all agents
const result = await coordinator.execute({ test: "input" })

console.log("Coordinator result:", result)
// Expected: { results: [{ agent: "Winback", output: {...} }, ...] }
```

### Expected Behavior

**Success Case:**
- All agents execute in sequence
- Each agent processes the same input
- Returns `{ results: [{ agent: "name", output: {...} }, ...] }`
- Metrics and traces are automatically recorded

**Partial Failure:**
- If one agent fails, others continue
- Failed agent returns `{ agent: "name", error: "error message" }`
- Successful agents return `{ agent: "name", output: {...} }`

### Edge Cases

1. **Empty Agent List:**
   ```typescript
   const coordinator = new AgentCoordinator([])
   const result = await coordinator.execute({})
   // Expected: { results: [] }
   ```

2. **Single Agent:**
   ```typescript
   const coordinator = new AgentCoordinator([agent])
   // Should execute normally
   ```

3. **Agent Throws Error:**
   ```typescript
   // Error is caught, recorded in results
   // Other agents continue execution
   ```

4. **Agent Returns Error Object:**
   ```typescript
   // If agent.process() returns { error: "..." }, it's treated as valid output
   // Only thrown errors are caught
   ```

5. **Execute Specific Agent:**
   ```typescript
   const output = await coordinator.executeAgent("WinbackAgent", { test: "input" })
   // Returns agent output directly
   // Throws if agent not found
   ```

## Failure Behavior

### PipelineOrchestrator Failures

- **Step Error**: Pipeline stops, returns error with step name
- **Invalid Step**: TypeScript error at compile time
- **Null Agent**: Runtime error when step.run() is called

### AgentCoordinator Failures

- **Agent Error**: Error recorded in results, other agents continue
- **Agent Not Found** (executeAgent): Throws Error
- **Invalid Input**: Agent handles validation, may return error object

## Testing Checklist

- [ ] Pipeline executes steps sequentially
- [ ] Context passes correctly between steps
- [ ] Pipeline stops on error
- [ ] Coordinator executes all agents
- [ ] Coordinator handles agent errors gracefully
- [ ] Metrics are recorded automatically
- [ ] Traces are recorded automatically
- [ ] Empty pipeline/coordinator handles gracefully
- [ ] Single step/agent works correctly
- [ ] Error messages are descriptive

## Mock Agent Example

```typescript
class MockAgent extends BaseAgent implements IAgent {
  async process(input: unknown): Promise<unknown> {
    return { processed: input, agent: this.name }
  }
  getMetadata() {
    return { name: "MockAgent", version: "1.0.0", description: "Test agent" }
  }
}

const mockAgent = new MockAgent()
const coordinator = new AgentCoordinator([mockAgent])
const result = await coordinator.execute({ test: "data" })
```

## Integration with Monitoring

Both orchestrator and coordinator automatically:
- Record metrics (calls, errors, durations)
- Create traces (start, complete, error events)
- Log events via logger

No additional setup required - observability is built-in.

