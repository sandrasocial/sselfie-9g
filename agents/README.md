# SSELFIE Agent System

New unified agent architecture for SSELFIE. This is a clean-slate refactor of the existing agent logic.

## Structure

\`\`\`
/agents
  /core           - Base agent classes, types, factory
  /tools          - Reusable tools (search, analytics, email, etc.)
  /workflows      - Multi-agent workflow orchestration
  /admin          - Admin/Sandra business assistant agent
  /marketing      - Marketing-focused agents (email, campaigns)
  /memory         - Long-term memory and context management
\`\`\`

## Design Principles

1. **Single Responsibility** - Each agent has one clear purpose
2. **Composability** - Tools and workflows are reusable
3. **Type Safety** - Full TypeScript typing throughout
4. **Testability** - Easy to test individual agents and tools
5. **Observability** - Built-in logging and monitoring hooks

## Status

🚧 **IN DEVELOPMENT** - This is scaffolding only. No implementation yet.

## Next Steps

1. Implement BaseAgent with AI SDK integration
2. Build out tools with actual functionality
3. Create specialized agents (content researcher, brand strategist, etc.)
4. Implement workflow orchestration
5. Add memory/context management
6. Migrate existing agent logic to new system
7. Update routes to use new agents

## Do Not Touch

- Existing Maya chat system (`app/api/maya/chat/route.ts`)
- Existing admin agent (`app/api/admin/agent/chat/route.ts`)
- Any current specialist agents

These will be migrated later.
