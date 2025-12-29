# Tool Extraction Guide

## Pattern Established ✅

All tools follow the same pattern. Here's the template:

```typescript
/**
 * Tool Name Description
 */

import type { Tool, ToolResult } from '../../types'
import { sql, resend, stripHtml, buildEmailSystemPrompt } from '../../shared/dependencies'

interface ToolNameInput {
  // Define input interface
  field1: string
  field2?: number
}

export const toolNameTool: Tool<ToolNameInput> = {
  name: "tool_name",
  description: `Tool description...`,
  
  input_schema: {
    type: "object",
    properties: {
      field1: {
        type: "string",
        description: "..."
      },
      // ... more properties
    },
    required: ["field1"]
  },
  
  async execute(input: ToolNameInput): Promise<ToolResult> {
    try {
      // Tool implementation
      return {
        success: true,
        data: result,
        message: "Success message"
      }
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Tool execution failed'
      }
    }
  }
}
```

## Steps to Extract a Tool

1. Find the tool definition in `app/api/admin/alex/chat/route.ts`
   - Search for: `const toolNameTool = { name: "tool_name"`
   
2. Copy the tool code
   - Copy the entire tool object (from `const toolNameTool = {` to closing `}`)
   
3. Create new file
   - Location: `lib/alex/tools/{category}/{tool-name}.ts`
   - Categories: email, analytics, content, business, automation, historical
   
4. Convert to module format
   - Import types from `../../types`
   - Import dependencies from `../../shared/dependencies`
   - Define input interface
   - Export tool with proper typing
   
5. Register in index
   - Add import to `lib/alex/tools/index.ts`
   - Add to `allTools` array
   
6. Update progress
   - Update `REFACTORING_PROGRESS.md`

## Dependencies Available

From `lib/alex/shared/dependencies.ts`:
- `sql` - Database connection (neon)
- `resend` - Resend client (null if not configured)
- `stripHtml()` - HTML stripping helper
- `buildEmailSystemPrompt()` - Email prompt builder

## Common Patterns

### Database Queries
```typescript
const result = await sql`SELECT * FROM table WHERE id = ${id}`
```

### Resend API Calls
```typescript
if (!resend) {
  return { success: false, error: "Resend not configured" }
}
const { data, error } = await resend.emails.send({ ... })
```

### Error Handling
```typescript
try {
  // implementation
  return { success: true, data, message }
} catch (error: any) {
  console.error('[Alex] ❌ Error:', error)
  return { success: false, error: error.message || 'Failed' }
}
```

## Remaining Tools

See `REFACTORING_PROGRESS.md` for complete list of remaining tools.

