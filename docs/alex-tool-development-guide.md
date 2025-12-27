# Alex Tool Development Guide

## Overview

Alex uses **native Anthropic JSON Schema format** for tool definitions. This guide explains how to add new tools and maintain existing ones.

## Tool Format Standards

### ✅ USE: Native Anthropic Format

All new tools should use the native Anthropic format:

```typescript
const myTool = {
  name: "my_tool",
  description: `Clear description of what the tool does and when to use it.

Use this when Sandra asks:
- "Example question 1"
- "Example question 2"

Returns:
- Data point 1
- Data point 2`,
  
  input_schema: {
    type: "object",
    properties: {
      param1: {
        type: "string",
        description: "What this parameter does"
      },
      param2: {
        type: "number",
        description: "Another parameter"
      }
    },
    required: ["param1"] // Only include required params
  },
  
  execute: async ({ param1, param2 }) => {
    // Tool execution logic
    return {
      success: true,
      data: result
    }
  }
}
```

### ❌ DON'T USE: AI SDK + Zod Format

**Do NOT use this format for new tools:**

```typescript
// ❌ OLD FORMAT - DO NOT USE
const myTool = tool({
  description: "...",
  parameters: z.object({
    param1: z.string().describe("...")
  }),
  execute: async ({ param1 }) => { ... }
})
```

## Why Native Format?

1. **Direct API Compatibility**: Native format works directly with Anthropic API
2. **No Conversion Needed**: No Zod-to-JSON-Schema conversion required
3. **Better Performance**: Fewer transformations, faster execution
4. **Standard Format**: Uses standard JSON Schema (documented, maintainable)

## Tool Registration

All tools must be added to the `tools` object:

```typescript
const tools = {
  compose_email: composeEmailTool,
  schedule_campaign: scheduleCampaignTool,
  my_new_tool: myNewTool, // Add here
  // ... other tools
}
```

## Tool Filtering

The system automatically filters tools:

```typescript
// Only native Anthropic format tools are passed to API
const nativeAnthropicTools = Object.entries(tools)
  .filter(([name, toolDef]) => {
    const hasNativeFormat = toolDef &&
      typeof toolDef === 'object' &&
      'name' in toolDef &&
      'input_schema' in toolDef
    return hasNativeFormat
  })
  .map(([_, toolDef]) => ({
    name: toolDef.name,
    description: toolDef.description,
    input_schema: toolDef.input_schema
  }))
```

**Important**: Tools using the old AI SDK format will be filtered out and won't be available to Claude.

## Converting Existing Tools

### Step 1: Find the Tool Definition

```typescript
const oldTool = tool({
  description: "...",
  parameters: z.object({...}),
  execute: async ({...}) => {...}
})
```

### Step 2: Convert Schema

**Zod to JSON Schema Mapping:**

| Zod | JSON Schema |
|-----|-------------|
| `z.string()` | `{ type: "string" }` |
| `z.number()` | `{ type: "number" }` |
| `z.boolean()` | `{ type: "boolean" }` |
| `z.enum(["a", "b"])` | `{ type: "string", enum: ["a", "b"] }` |
| `z.array(z.string())` | `{ type: "array", items: { type: "string" } }` |
| `z.object({...})` | `{ type: "object", properties: {...} }` |
| `.optional()` | Don't include in `required` array |
| `.describe("...")` | `description: "..."` |

### Step 3: Replace Tool Definition

```typescript
const newTool = {
  name: "tool_name",
  description: "...", // Keep same description
  input_schema: {
    type: "object",
    properties: {
      // Converted schema here
    },
    required: [] // Only non-optional params
  },
  execute: async ({...}) => {
    // Keep EXACT SAME execute function
  }
}
```

### Step 4: Verify

1. Build passes: `npm run build`
2. Tool appears in console: `[Alex] 🔧 Tool names: ..., tool_name, ...`
3. Test tool execution

## Current Tool Status

### ✅ Converted to Native Format

- `compose_email` - Create/refine email content
- `create_email_sequence` - Create multi-email sequences
- `schedule_campaign` - Schedule email campaigns
- `check_campaign_status` - Check campaign status
- `get_resend_audience_data` - Get audience data
- `get_email_timeline` - Get email timeline
- `analyze_email_strategy` - Analyze email strategy
- `read_codebase_file` - Read files from codebase
- `web_search` - Search the web
- `get_revenue_metrics` - Get business metrics
- `get_prompt_guides` - Get prompt guides
- `update_prompt_guide` - Update prompt guides

### ⚠️ Still Using AI SDK Format (Need Conversion)

- `get_email_campaign` - Fetch campaign by ID
- `get_platform_analytics` - Platform analytics
- `get_business_insights` - Business insights
- `get_content_performance` - Content performance
- `get_email_recommendations` - Email recommendations
- `research_content_strategy` - Content strategy research
- `get_brand_strategy` - Brand strategy

## Imports

### Current Imports

```typescript
import { tool, generateText } from "ai"  // tool still needed for unconverted tools
import { z } from "zod"                  // z still needed for unconverted tools
```

### After All Tools Converted

```typescript
import { generateText } from "ai"  // Only generateText needed
// z can be removed
```

**Note**: `streamText` was removed - not used anywhere.

## Best Practices

### 1. Tool Naming

- Use snake_case: `my_tool_name`
- Be descriptive: `get_user_metrics` not `get_data`
- Match the `name` field exactly

### 2. Descriptions

- Start with what the tool does
- Include "Use this when Sandra asks:" examples
- List what the tool returns
- Be specific about use cases

### 3. Parameters

- Make parameters optional when possible
- Provide clear descriptions
- Use enums for limited choices
- Include defaults in execute function

### 4. Execute Function

- Always return `{ success: boolean, ... }`
- Handle errors gracefully
- Log important actions
- Return useful error messages

### 5. Testing

- Test with actual queries
- Verify tool appears in `nativeAnthropicTools`
- Check console logs
- Verify tool execution works

## Example: Adding a New Tool

```typescript
// 1. Define the tool
const getUserStatsTool = {
  name: "get_user_stats",
  description: `Get user statistics and activity metrics.

Use this when Sandra asks:
- "How many active users do we have?"
- "Show me user engagement"

Returns:
- Total users
- Active users (last 30 days)
- Engagement metrics`,
  
  input_schema: {
    type: "object",
    properties: {
      userId: {
        type: "string",
        description: "Optional user ID for specific user stats"
      },
      timeRange: {
        type: "string",
        enum: ["week", "month", "all_time"],
        description: "Time range for stats (defaults to 'month')"
      }
    },
    required: []
  },
  
  execute: async ({ userId, timeRange = 'month' }) => {
    try {
      // Tool logic here
      return {
        success: true,
        stats: { /* ... */ }
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message
      }
    }
  }
}

// 2. Add to tools object
const tools = {
  // ... existing tools
  get_user_stats: getUserStatsTool,
}

// 3. Test
// Send: "show me user stats"
// Check console: "[Alex] 🔧 Tool names: ..., get_user_stats, ..."
```

## Troubleshooting

### Tool Not Appearing in API

**Problem**: Tool is filtered out

**Solution**: Check tool has:
- `name` property
- `input_schema` property
- Not using `tool()` wrapper

### Tool Execution Fails

**Problem**: Tool executes but returns error

**Solution**: 
- Check execute function logic
- Verify database queries
- Check error handling
- Review console logs

### Build Errors

**Problem**: TypeScript errors after conversion

**Solution**:
- Verify schema types match execute function
- Check all properties are defined
- Ensure required array is correct

## Migration Checklist

When converting a tool:

- [ ] Find tool definition
- [ ] Convert Zod schema to JSON Schema
- [ ] Update tool definition format
- [ ] Keep execute function unchanged
- [ ] Test build: `npm run build`
- [ ] Verify tool in console logs
- [ ] Test tool execution
- [ ] Update this guide if needed

## Resources

- [Anthropic Tools Documentation](https://docs.anthropic.com/claude/docs/tool-use)
- [JSON Schema Specification](https://json-schema.org/)
- [Native Format Examples](./alex-tool-examples.md) (if exists)

---

**Last Updated**: December 2025
**Maintained By**: Alex Development Team

