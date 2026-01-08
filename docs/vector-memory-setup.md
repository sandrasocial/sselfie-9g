# Vector Memory Setup Guide

**Status:** ✅ Implementation Complete  
**Next Step:** Configure environment variables and run initial indexing

---

## Prerequisites

### Required Environment Variables

Add these to your `.env.local` file:

```bash
# Upstash Vector (for storing embeddings)
UPSTASH_SEARCH_REST_URL=https://your-index.upstash.io
UPSTASH_SEARCH_REST_TOKEN=your-token-here

# OpenAI (for generating embeddings)
OPENAI_API_KEY=sk-your-key-here
```

### Getting Upstash Vector Credentials

1. Go to [Upstash Console](https://console.upstash.com/)
2. Create a new Vector Index (or use existing)
3. Copy the REST URL and Token
4. Add to `.env.local`

### Getting OpenAI API Key

1. Go to [OpenAI Platform](https://platform.openai.com/api-keys)
2. Create a new API key
3. Add to `.env.local`

---

## Initial Setup

### Step 1: Run Initial Indexing

```bash
npm run index-codebase
```

**Expected Output:**
```
[Index] Starting codebase indexing...
[Index] This may take a few minutes...
[Index] Progress: 10 files indexed...
[Index] Progress: 20 files indexed...
...
[Index] ✅ Indexing complete!
[Index] Files indexed: 450
[Index] Files skipped: 1200
[Index] Errors: 0
[Index] Duration: 45.23s
```

### Step 2: Test the API Endpoint

Start your dev server:

```bash
npm run dev
```

Test the health endpoint:

```bash
curl http://localhost:3000/api/brand-brain/search-codebase
```

Test a search query (requires admin authentication):

```bash
curl -X POST http://localhost:3000/api/brand-brain/search-codebase \
  -H "Content-Type: application/json" \
  -H "Cookie: your-auth-cookie" \
  -d '{
    "query": "How does the feed planner generate captions?",
    "limit": 5
  }'
```

---

## Weekly Re-indexing

### Automatic Re-indexing

A cron job is configured to automatically re-index the codebase every Sunday at 3 AM UTC:

**Cron Schedule:** `0 3 * * 0` (Sunday 3 AM UTC)

**Endpoint:** `/api/cron/reindex-codebase`

**Status:** ✅ Added to `vercel.json`

### Manual Re-indexing

You can also manually trigger re-indexing:

```bash
npm run index-codebase
```

Or via API (requires CRON_SECRET):

```bash
curl -X GET http://localhost:3000/api/cron/reindex-codebase \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

## Testing the Search API

### Test Query Examples

**1. Search for Feed Planner Code:**
```json
{
  "query": "How does feed planner generate Instagram captions?",
  "type": "code",
  "category": "library",
  "limit": 5
}
```

**2. Search Documentation:**
```json
{
  "query": "What are the API routes for feed planner?",
  "type": "docs",
  "limit": 10
}
```

**3. Find Similar Files:**
```json
{
  "filePath": "lib/feed-planner/caption-writer.ts",
  "limit": 5
}
```

**4. Search API Endpoints:**
```json
{
  "query": "email automation sequences",
  "type": "api",
  "category": "api",
  "minScore": 0.7
}
```

---

## Troubleshooting

### Error: "UPSTASH_SEARCH_REST_URL and UPSTASH_SEARCH_REST_TOKEN must be set"

**Solution:** Add the environment variables to `.env.local`:
```bash
UPSTASH_SEARCH_REST_URL=your-url
UPSTASH_SEARCH_REST_TOKEN=your-token
```

### Error: "Missing OpenAI API key"

**Solution:** Add to `.env.local`:
```bash
OPENAI_API_KEY=sk-your-key
```

### No Search Results

**Possible Causes:**
1. Codebase not indexed yet - Run `npm run index-codebase`
2. Query too specific - Try broader queries
3. Low similarity scores - Lower `minScore` or remove it

### High Costs

**Optimization Tips:**
1. Index only necessary files (adjust `INDEXED_EXTENSIONS` in script)
2. Reduce `limit` in search queries
3. Use `minScore` to filter low-quality results
4. Re-index less frequently (monthly instead of weekly)

---

## Cost Estimation

### Indexing Costs

- **OpenAI Embeddings:** ~$0.0001 per 1K tokens
- **Average file:** ~2K tokens
- **450 files:** ~$0.09 per full index
- **Weekly re-indexing:** ~$0.36/month

### Search Costs

- **Query embedding:** ~$0.0001 per query
- **100 queries/day:** ~$0.003/day = ~$0.09/month

### Upstash Vector

- **Free tier:** 10K vectors
- **Storage:** Minimal cost
- **Queries:** Included in free tier

**Total Estimated Cost:** ~$0.50/month for weekly re-indexing + daily searches

---

## Next Steps

1. ✅ **Configure Environment Variables** - Add Upstash and OpenAI credentials
2. ✅ **Run Initial Indexing** - `npm run index-codebase`
3. ✅ **Test Search API** - Try sample queries
4. ✅ **Weekly Re-indexing** - Already configured in cron
5. **Integrate with Brand Brain** - Add to context system (optional)

---

## Integration with Brand Brain

Once indexing is complete, you can integrate semantic search into Brand Brain's context:

```typescript
// In lib/admin/get-complete-context.ts
import { searchCodebase } from "@/lib/ai/semantic-search"

// Add to context when query is provided
if (query) {
  const codebaseResults = await searchCodebase(query, { limit: 5 })
  contextParts.push("\n=== CODEBASE SEARCH RESULTS ===")
  for (const result of codebaseResults) {
    contextParts.push(`File: ${result.filePath}`)
    contextParts.push(`Content: ${result.content}`)
  }
}
```

---

**Last Updated:** Setup guide created  
**Status:** ⚠️ Waiting for environment variables to be configured
