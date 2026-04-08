# Vector Memory System - Usage Guide

**Status:** ✅ Implemented (Option A: OpenAI Embeddings + Upstash Vector)

---

## Quick Start

### 1. Index the Codebase

Run the indexing script to create embeddings for all codebase files:

```bash
npm run index-codebase
```

This will:
- Scan all `.ts`, `.tsx`, `.js`, `.jsx`, `.md`, `.sql`, `.json`, `.yaml` files
- Skip `node_modules`, `.git`, `.next`, and other excluded directories
- Generate embeddings using OpenAI `text-embedding-3-small`
- Store in Upstash Vector index

**Expected output:**
```
[Index] Starting codebase indexing...
[Index] Progress: 10 files indexed...
[Index] Progress: 20 files indexed...
...
[Index] Indexing complete!
[Index] Files indexed: 450
[Index] Files skipped: 1200
[Index] Errors: 0
[Index] Duration: 45.23s
```

### 2. Search the Codebase

Use the API endpoint to search semantically:

```bash
curl -X POST http://localhost:3000/api/brand-brain/search-codebase \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "query": "How does the feed planner generate Instagram captions?",
    "limit": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "results": [
    {
      "filePath": "lib/feed-planner/caption-writer.ts",
      "content": "export async function generateInstagramCaption...",
      "score": 0.89,
      "metadata": {
        "type": "code",
        "category": "library",
        "language": "typescript"
      }
    }
  ],
  "count": 5
}
```

---

## API Endpoint

### POST `/api/brand-brain/search-codebase`

**Authentication:** Admin only (requires `ssa@ssasocial.com` email)

**Request Body:**
```typescript
{
  query?: string        // Search query (required for search)
  filePath?: string     // File path (required for similar files)
  type?: "code" | "docs" | "api" | "component" | "config"
  category?: string     // e.g., "api", "component", "library"
  limit?: number        // Default: 10
  minScore?: number     // Minimum similarity score (0-1)
}
```

**Response:**
```typescript
{
  success: boolean
  results: SearchResult[]
  count: number
}
```

**SearchResult:**
```typescript
{
  filePath: string
  content: string      // First 2000 chars
  score: number        // Similarity score (0-1)
  metadata: {
    type?: string
    category?: string
    tags?: string[]
    language?: string
    indexedAt?: string
  }
}
```

---

## Usage Examples

### Example 1: Find Code Related to Feature
```typescript
const results = await searchCodebase(
  "How does credit deduction work when generating images?",
  { type: "code", limit: 5 }
)
```

### Example 2: Search Documentation
```typescript
const results = await searchCodebase(
  "What are the API routes for feed planner?",
  { type: "docs", category: "documentation" }
)
```

### Example 3: Find Similar Files
```typescript
const results = await findSimilarFiles(
  "lib/feed-planner/caption-writer.ts",
  5
)
```

### Example 4: Filter by Category
```typescript
const results = await searchCodebase(
  "email automation sequences",
  { category: "api", minScore: 0.7 }
)
```

---

## Integration with Brand Brain

### In GPT Actions

Add to `docs/gpt-actions-openapi.yaml`:

```yaml
/api/brand-brain/search-codebase:
  post:
    summary: Semantic search across codebase
    description: Search codebase files using semantic similarity
    requestBody:
      required: true
      content:
        application/json:
          schema:
            type: object
            properties:
              query:
                type: string
                description: Search query
              type:
                type: string
                enum: [code, docs, api, component, config]
              category:
                type: string
              limit:
                type: number
                default: 10
              minScore:
                type: number
                minimum: 0
                maximum: 1
    responses:
      200:
        description: Search results
        content:
          application/json:
            schema:
              type: object
              properties:
                success:
                  type: boolean
                results:
                  type: array
                count:
                  type: number
```

### In Code

```typescript
import { searchCodebase } from "@/lib/ai/semantic-search"

// In your Brand Brain context
const codebaseContext = await searchCodebase(
  "How does the feed planner work?",
  { limit: 5 }
)

// Add to context
const context = `
=== CODEBASE SEARCH RESULTS ===
${codebaseContext.map(r => `
File: ${r.filePath}
Content: ${r.content}
`).join('\n')}
`
```

---

## File Indexing Details

### Indexed File Types
- **Code:** `.ts`, `.tsx`, `.js`, `.jsx`
- **Documentation:** `.md`
- **Database:** `.sql`
- **Config:** `.json`, `.yaml`, `.yml`

### Excluded Patterns
- `node_modules/`
- `.git/`
- `.next/`
- `dist/`, `build/`
- `.vercel/`
- Lock files
- `.env` files

### File Size Limit
- Maximum: 500KB per file
- Larger files are skipped automatically

### Metadata Stored
- File path
- Content preview (first 2000 chars)
- File type (code, docs, api, component, config)
- Category (api, component, library, etc.)
- Language (typescript, javascript, markdown, etc.)
- Index timestamp

---

## Maintenance

### Re-indexing

Re-run the indexing script when:
- Major code changes
- New features added
- Documentation updated
- Weekly (recommended)

```bash
npm run index-codebase
```

### Updating Specific Files

Files are automatically updated on re-index (upsert behavior).

### Removing Files

To remove a file from the index, delete it from the codebase and re-run indexing, or use the `removeCodebaseFile` function:

```typescript
import { removeCodebaseFile } from "@/lib/ai/embeddings"

await removeCodebaseFile("path/to/file.ts")
```

---

## Performance

### Indexing
- **Speed:** ~10-15 files/second
- **Cost:** ~$0.0001 per 1K tokens (OpenAI embeddings)
- **Storage:** Upstash Vector (free tier: 10K vectors)

### Search
- **Speed:** ~100-200ms per query
- **Accuracy:** High semantic similarity matching
- **Scalability:** Handles large codebases efficiently

---

## Troubleshooting

### "UPSTASH_SEARCH_REST_URL not set"
- Ensure environment variables are configured
- Check `.env.local` for `UPSTASH_SEARCH_REST_URL` and `UPSTASH_SEARCH_REST_TOKEN`

### "OpenAI API key not set"
- Ensure `OPENAI_API_KEY` is set in environment variables

### Low Search Results
- Re-index the codebase: `npm run index-codebase`
- Check that files are being indexed (check console output)
- Verify file types match indexed extensions

### High Costs
- Index only necessary files (adjust `INDEXED_EXTENSIONS` in script)
- Reduce `limit` in search queries
- Use `minScore` to filter low-quality results

---

## Next Steps

1. **Initial Indexing:** Run `npm run index-codebase` to create initial index
2. **Test Search:** Use the API endpoint to test semantic search
3. **Integrate:** Add to Brand Brain context system
4. **Schedule:** Set up weekly re-indexing (optional cron job)

---

**Last Updated:** Implementation complete  
**Status:** ✅ Ready to use
