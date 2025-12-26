# Alex Codebase Access Tool

## New Tool: `read_codebase_file`

Alex now has the ability to read and analyze files from the SSELFIE codebase to understand the app structure, content, and features.

## What It Does

The `read_codebase_file` tool allows Alex to:
- Read files from safe directories (content-templates, docs, app, lib, scripts, components)
- Understand what freebies, guides, and resources exist
- Read content templates and documentation
- Analyze code structure and features
- Help manage and improve the codebase
- Reference actual content when creating emails or campaigns

## Security

- Only allows reading from specific safe directories
- Prevents directory traversal attacks
- Validates file paths before reading
- Limits file size (default 500 lines, configurable)

## Usage Examples

### When Sandra asks:
- "What freebies do we have?" → Alex can read `app/api/freebie/subscribe/route.ts`
- "What's in the brand blueprint?" → Alex can read `app/blueprint/page.tsx`
- "What prompts are in the guide?" → Alex can read `docs/PROMPT-GUIDE-BUILDER.md`
- "What Instagram templates exist?" → Alex can read `content-templates/instagram/README.md`
- "How does the freebie system work?" → Alex can read relevant files

### Example Tool Call:
```typescript
read_codebase_file({
  filePath: "content-templates/instagram/README.md",
  maxLines: 500  // optional, defaults to 500
})
```

## Allowed Directories

- `content-templates/` - Instagram templates, guides
- `docs/` - Documentation, guides
- `app/` - Pages and routes
- `lib/` - Utilities and helpers
- `scripts/` - Database schemas, migrations
- `components/` - React components

## Response Format

```typescript
{
  success: true,
  filePath: "content-templates/instagram/README.md",
  fileType: "markdown",
  totalLines: 202,
  linesRead: 202,
  truncated: false,
  content: "...",
  note: undefined
}
```

Or on error:
```typescript
{
  success: false,
  error: "File not found: ...",
  filePath: "...",
  suggestion: "..."
}
```

## Benefits

1. **Better Email Creation**: Alex can reference actual freebie content, guide prompts, and templates when creating emails
2. **Code Management**: Alex can help Sandra understand and manage the codebase
3. **Content Awareness**: Alex knows what resources exist and can suggest improvements
4. **Accurate References**: Alex can quote actual content from files instead of guessing

## Integration

The tool is automatically available to Alex when she needs to:
- Understand the app structure
- Reference specific content
- Help with code management
- Create emails that reference actual resources

## Next Steps

Alex can now:
1. Read the prompt guide to understand what prompts are available
2. Read the brand blueprint to understand what users get
3. Read content templates to reference actual templates
4. Analyze code structure to suggest improvements
5. Help Sandra manage the codebase more effectively


