# AI Layer Enhancements for Brand Brain

**Purpose:** Optional enhancements to make Brand Brain more intelligent in product strategy through semantic search, knowledge sync, and instant context retrieval.

---

## 🧠 1. Vector Memory System

### Overview
Create an embeddings index of the entire codebase using OpenAI embeddings or Supabase pgvector. This enables Brand Brain to search semantically across code, documentation, and knowledge bases.

### Current State
✅ **Upstash Vector** already configured (`lib/upstash-vector.ts`)
- Namespaces defined: `competitorContent`, `userCampaigns`, `contentIdeas`, `emailTemplates`
- Client initialization ready
- Helper functions for embedding IDs

### Implementation Plan

#### Option A: OpenAI Embeddings + Upstash Vector (Recommended)

**Advantages:**
- Uses existing Upstash Vector infrastructure
- Fast semantic search
- No database schema changes needed
- Cost-effective for read-heavy workloads

**Setup:**

1. **Create Embedding Service**
```typescript
// lib/ai/embeddings.ts
import { openai } from "@ai-sdk/openai"
import { embed } from "ai"
import { getVectorClient, VectorNamespaces } from "@/lib/upstash-vector"

export async function indexCodebaseFile(
  filePath: string,
  content: string,
  metadata: {
    type: 'code' | 'docs' | 'api' | 'component'
    category?: string
    tags?: string[]
  }
) {
  const vectorClient = getVectorClient()
  
  // Generate embedding
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: content,
  })
  
  // Store in vector index
  const id = generateEmbeddingId('codebase', filePath)
  await vectorClient.upsert({
    id,
    vector: embedding,
    metadata: {
      filePath,
      content: content.substring(0, 1000), // First 1000 chars for preview
      ...metadata,
      indexedAt: new Date().toISOString(),
    }
  })
}
```

2. **Create Indexing Script**
```typescript
// scripts/index-codebase.ts
import { readFile, readdir } from 'fs/promises'
import { join } from 'path'
import { indexCodebaseFile } from '@/lib/ai/embeddings'

async function indexDirectory(dir: string, basePath: string = '') {
  const entries = await readdir(dir, { withFileTypes: true })
  
  for (const entry of entries) {
    const fullPath = join(dir, entry.name)
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name
    
    if (entry.isDirectory()) {
      // Skip node_modules, .git, etc.
      if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
        await indexDirectory(fullPath, relativePath)
      }
    } else if (entry.isFile()) {
      // Index relevant files
      const ext = entry.name.split('.').pop()
      if (['ts', 'tsx', 'js', 'jsx', 'md', 'sql'].includes(ext || '')) {
        const content = await readFile(fullPath, 'utf-8')
        await indexCodebaseFile(relativePath, content, {
          type: ext === 'md' ? 'docs' : 'code',
          category: getCategory(relativePath),
        })
      }
    }
  }
}

function getCategory(filePath: string): string {
  if (filePath.includes('/api/')) return 'api'
  if (filePath.includes('/components/')) return 'component'
  if (filePath.includes('/lib/')) return 'library'
  if (filePath.includes('/docs/')) return 'documentation'
  return 'other'
}
```

3. **Semantic Search Function**
```typescript
// lib/ai/semantic-search.ts
import { openai } from "@ai-sdk/openai"
import { embed } from "ai"
import { getVectorClient } from "@/lib/upstash-vector"

export async function searchCodebase(
  query: string,
  options: {
    limit?: number
    type?: 'code' | 'docs' | 'api' | 'component'
    category?: string
  } = {}
) {
  const vectorClient = getVectorClient()
  
  // Generate query embedding
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  })
  
  // Search vector index
  const results = await vectorClient.query({
    vector: embedding,
    topK: options.limit || 10,
    includeMetadata: true,
    filter: options.type ? { type: options.type } : undefined,
  })
  
  return results.map(result => ({
    filePath: result.metadata.filePath,
    content: result.metadata.content,
    score: result.score,
    metadata: result.metadata,
  }))
}
```

#### Option B: Supabase pgvector

**Advantages:**
- All data in one database
- SQL-based queries
- No external service needed

**Setup:**

1. **Enable pgvector Extension**
```sql
CREATE EXTENSION IF NOT EXISTS vector;
```

2. **Create Embeddings Table**
```sql
CREATE TABLE codebase_embeddings (
  id SERIAL PRIMARY KEY,
  file_path TEXT NOT NULL UNIQUE,
  content TEXT NOT NULL,
  embedding vector(1536), -- OpenAI embedding dimension
  file_type TEXT,
  category TEXT,
  tags TEXT[],
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX ON codebase_embeddings 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);
```

3. **Semantic Search Query**
```sql
SELECT 
  file_path,
  content,
  1 - (embedding <=> $1::vector) as similarity
FROM codebase_embeddings
WHERE file_type = $2 OR $2 IS NULL
ORDER BY similarity DESC
LIMIT 10;
```

### Usage in Brand Brain

**API Endpoint:**
```typescript
// app/api/brand-brain/search-codebase/route.ts
export async function POST(request: Request) {
  const { query, type, category } = await request.json()
  
  const results = await searchCodebase(query, { type, category })
  
  return NextResponse.json({ results })
}
```

**Benefits:**
- Brand Brain can ask: "How does the feed planner generate captions?"
- System searches codebase semantically
- Returns relevant code/docs even if exact keywords don't match
- Understands context and relationships

---

## 📊 2. Knowledge Sync Cron Job

### Overview
Weekly automated job that summarizes:
- Top support issues
- New feature releases
- Growth metrics

Then stores summaries in `admin_knowledge_base` for Brand Brain's awareness.

### Current State
✅ **admin_knowledge_base** table exists (`scripts/36-create-admin-knowledge-base.sql`)
- Fields: `knowledge_type`, `category`, `title`, `content`, `confidence_level`
- Already integrated into admin context system

### Implementation Plan

#### Weekly Knowledge Sync Job

**Location:** `/app/api/cron/knowledge-sync/route.ts`

**Schedule:** Weekly (e.g., Sunday 9 AM UTC)

**Process:**

1. **Collect Data Sources**
```typescript
async function collectWeeklyData() {
  // Support issues from feedback table
  const supportIssues = await sql`
    SELECT 
      feedback_type,
      message,
      COUNT(*) as frequency,
      MAX(created_at) as last_occurrence
    FROM feedback
    WHERE created_at >= NOW() - INTERVAL '7 days'
    GROUP BY feedback_type, message
    ORDER BY frequency DESC
    LIMIT 10
  `
  
  // New features (from git commits or changelog)
  const newFeatures = await getRecentFeatures()
  
  // Growth metrics
  const growthMetrics = await sql`
    SELECT 
      COUNT(DISTINCT user_id) as new_users,
      COUNT(*) as new_subscriptions,
      SUM(amount_cents) / 100.0 as revenue
    FROM stripe_payments
    WHERE payment_date >= NOW() - INTERVAL '7 days'
      AND status = 'succeeded'
      AND is_test_mode = false
  `
  
  return { supportIssues, newFeatures, growthMetrics }
}
```

2. **Generate AI Summary**
```typescript
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

async function generateWeeklySummary(data: WeeklyData) {
  const prompt = `You are Brand Brain's knowledge sync system. 
Summarize this week's data into actionable insights for product strategy.

SUPPORT ISSUES (Top 10):
${data.supportIssues.map(issue => 
  `- ${issue.feedback_type}: ${issue.message} (${issue.frequency} times)`
).join('\n')}

NEW FEATURES:
${data.newFeatures.map(feature => 
  `- ${feature.name}: ${feature.description}`
).join('\n')}

GROWTH METRICS:
- New Users: ${data.growthMetrics.new_users}
- New Subscriptions: ${data.growthMetrics.new_subscriptions}
- Revenue: $${data.growthMetrics.revenue}

Generate a concise summary (3-5 paragraphs) that:
1. Highlights top support pain points
2. Notes new feature adoption
3. Identifies growth trends
4. Suggests strategic priorities

Format as structured insights Brand Brain can use.`

  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt,
  })
  
  return text
}
```

3. **Store in Knowledge Base**
```typescript
async function storeWeeklySummary(summary: string, data: WeeklyData) {
  await sql`
    INSERT INTO admin_knowledge_base (
      knowledge_type,
      category,
      title,
      content,
      confidence_level,
      performance_data,
      created_by
    ) VALUES (
      'weekly_summary',
      'growth',
      'Weekly Summary - ${new Date().toISOString().split('T')[0]}',
      ${summary},
      0.9,
      ${JSON.stringify({
        newUsers: data.growthMetrics.new_users,
        newSubscriptions: data.growthMetrics.new_subscriptions,
        revenue: data.growthMetrics.revenue,
        topIssues: data.supportIssues.length,
      })},
      'system'
    )
  `
}
```

4. **Cron Job Implementation**
```typescript
// app/api/cron/knowledge-sync/route.ts
export async function GET(request: Request) {
  const cronLogger = createCronLogger("knowledge-sync")
  await cronLogger.start()
  
  try {
    // Verify cron secret
    const authHeader = request.headers.get("authorization")
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    
    // Collect data
    const data = await collectWeeklyData()
    
    // Generate summary
    const summary = await generateWeeklySummary(data)
    
    // Store in knowledge base
    await storeWeeklySummary(summary, data)
    
    await cronLogger.success({
      summaryLength: summary.length,
      issuesFound: data.supportIssues.length,
      featuresTracked: data.newFeatures.length,
    })
    
    return NextResponse.json({ success: true, summary })
  } catch (error) {
    await cronLogger.error(error)
    return NextResponse.json({ error: "Failed" }, { status: 500 })
  }
}
```

5. **Add to vercel.json**
```json
{
  "crons": [
    {
      "path": "/api/cron/knowledge-sync",
      "schedule": "0 9 * * 0"
    }
  ]
}
```

### Knowledge Types to Track

**Weekly Summaries:**
- Support issues patterns
- Feature adoption rates
- Growth trends
- User feedback themes

**Feature Releases:**
- New API endpoints
- New components
- New integrations
- Breaking changes

**Growth Metrics:**
- User acquisition
- Revenue trends
- Engagement patterns
- Conversion rates

### Benefits

- **Brand Brain Awareness:** Automatically knows what's happening
- **Proactive Insights:** Identifies patterns before manual review
- **Historical Context:** Builds knowledge over time
- **Strategic Planning:** Data-driven product decisions

---

## 🔍 3. Custom Tool: /analyze_repo

### Overview
Meta-endpoint that aggregates `list_files` + `read_file` + heuristics (feature detection) to give Brand Brain instant context in one call.

### Implementation Plan

**Location:** `/app/api/brand-brain/analyze-repo/route.ts`

**Purpose:**
- Single endpoint for comprehensive codebase analysis
- Returns structured context about features, architecture, and capabilities
- Faster than multiple individual calls

**Implementation:**

```typescript
// app/api/brand-brain/analyze-repo/route.ts
import { NextResponse } from "next/server"
import { readFile, readdir } from "fs/promises"
import { join } from "path"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

interface RepoAnalysis {
  architecture: {
    framework: string
    database: string
    keyIntegrations: string[]
  }
  features: {
    name: string
    description: string
    location: string
    status: 'active' | 'experimental' | 'deprecated'
  }[]
  apiEndpoints: {
    path: string
    method: string
    category: string
  }[]
  components: {
    name: string
    type: string
    location: string
  }[]
  documentation: {
    file: string
    type: string
  }[]
}

export async function POST(request: Request) {
  try {
    const { query, focus } = await request.json()
    
    // 1. Analyze file structure
    const structure = await analyzeFileStructure()
    
    // 2. Detect features
    const features = await detectFeatures()
    
    // 3. Extract API routes
    const apiRoutes = await extractAPIRoutes()
    
    // 4. Identify components
    const components = await identifyComponents()
    
    // 5. Find documentation
    const docs = await findDocumentation()
    
    // 6. If query provided, use AI to generate focused analysis
    let focusedAnalysis = null
    if (query) {
      focusedAnalysis = await generateFocusedAnalysis({
        query,
        structure,
        features,
        apiRoutes,
        components,
        docs,
      })
    }
    
    return NextResponse.json({
      analysis: {
        architecture: {
          framework: "Next.js 16 (App Router)",
          database: "Neon PostgreSQL",
          keyIntegrations: [
            "Stripe",
            "Supabase Auth",
            "Replicate (AI)",
            "Vercel Blob",
            "Upstash Redis",
          ],
        },
        features: features,
        apiEndpoints: apiRoutes,
        components: components,
        documentation: docs,
      },
      focusedAnalysis,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    return NextResponse.json(
      { error: "Analysis failed", message: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function analyzeFileStructure() {
  // Analyze app/, components/, lib/ structure
  const appRoutes = await getRoutesInDirectory('app')
  const components = await getComponentsInDirectory('components')
  const libModules = await getModulesInDirectory('lib')
  
  return {
    appRoutes,
    components,
    libModules,
  }
}

async function detectFeatures(): Promise<RepoAnalysis['features']> {
  const features: RepoAnalysis['features'] = []
  
  // Check for Feed Planner
  if (await fileExists('app/feed-planner/page.tsx')) {
    features.push({
      name: 'Feed Planner',
      description: 'Instagram feed planning with 9-post grids, captions, and strategy',
      location: 'app/feed-planner',
      status: 'active',
    })
  }
  
  // Check for Maya AI
  if (await fileExists('app/maya/page.tsx')) {
    features.push({
      name: 'Maya AI Stylist',
      description: 'AI stylist chat for generating styled photoshoots',
      location: 'app/maya',
      status: 'active',
    })
  }
  
  // Check for Academy
  if (await fileExists('app/api/academy/courses/route.ts')) {
    features.push({
      name: 'Academy',
      description: 'Course platform with video and interactive lessons',
      location: 'app/api/academy',
      status: 'active',
    })
  }
  
  // Check for Pro Photoshoot
  if (await fileExists('app/api/maya/pro/photoshoot/start-session/route.ts')) {
    features.push({
      name: 'Pro Photoshoot',
      description: 'Admin-only Pro Photoshoot feature',
      location: 'app/api/maya/pro/photoshoot',
      status: 'experimental',
    })
  }
  
  // Add more feature detection...
  
  return features
}

async function extractAPIRoutes(): Promise<RepoAnalysis['apiEndpoints']> {
  const routes: RepoAnalysis['apiEndpoints'] = []
  
  // Scan app/api directory
  const apiFiles = await getAllRouteFiles('app/api')
  
  for (const file of apiFiles) {
    const content = await readFile(file, 'utf-8')
    const methods = extractHTTPMethods(content)
    const category = extractCategory(file)
    
    for (const method of methods) {
      routes.push({
        path: file.replace('app/api/', '/api/').replace('/route.ts', ''),
        method,
        category,
      })
    }
  }
  
  return routes
}

async function identifyComponents(): Promise<RepoAnalysis['components']> {
  const components: RepoAnalysis['components'] = []
  
  // Scan components directory
  const componentFiles = await getAllComponentFiles('components')
  
  for (const file of componentFiles) {
    const content = await readFile(file, 'utf-8')
    const type = detectComponentType(content)
    
    components.push({
      name: file.split('/').pop()?.replace('.tsx', '') || '',
      type,
      location: file,
    })
  }
  
  return components
}

async function findDocumentation(): Promise<RepoAnalysis['documentation']> {
  const docs: RepoAnalysis['documentation'] = []
  
  const docFiles = [
    'ARCHITECTURE.md',
    'docs/schema.md',
    'docs/api-routes.md',
    'docs/feature-flags-and-cron.md',
    'docs/marketing-assets.md',
    'README.md',
  ]
  
  for (const file of docFiles) {
    if (await fileExists(file)) {
      docs.push({
        file,
        type: file.includes('docs/') ? 'technical' : 'general',
      })
    }
  }
  
  return docs
}

async function generateFocusedAnalysis(context: any) {
  const { text } = await generateText({
    model: openai('gpt-4-turbo'),
    prompt: `Analyze this codebase and answer: ${context.query}

Available context:
- Features: ${JSON.stringify(context.features)}
- API Routes: ${context.apiRoutes.length} endpoints
- Components: ${context.components.length} components
- Documentation: ${context.docs.length} files

Provide a comprehensive analysis focusing on: ${context.query}`,
  })
  
  return text
}

// Helper functions
async function fileExists(path: string): Promise<boolean> {
  try {
    await readFile(path)
    return true
  } catch {
    return false
  }
}

async function getAllRouteFiles(dir: string): Promise<string[]> {
  // Recursively find all route.ts files
  // Implementation...
}

function extractHTTPMethods(content: string): string[] {
  const methods: string[] = []
  if (content.includes('export async function GET')) methods.push('GET')
  if (content.includes('export async function POST')) methods.push('POST')
  if (content.includes('export async function PUT')) methods.push('PUT')
  if (content.includes('export async function DELETE')) methods.push('DELETE')
  return methods
}

function extractCategory(filePath: string): string {
  if (filePath.includes('/admin/')) return 'admin'
  if (filePath.includes('/maya/')) return 'maya'
  if (filePath.includes('/feed/')) return 'feed'
  if (filePath.includes('/training/')) return 'training'
  if (filePath.includes('/academy/')) return 'academy'
  return 'other'
}

function detectComponentType(content: string): string {
  if (content.includes('use client')) return 'client'
  if (content.includes('export default function')) return 'server'
  return 'shared'
}
```

### Usage Example

**Request:**
```json
POST /api/brand-brain/analyze-repo
{
  "query": "How does the feed planner generate Instagram captions?",
  "focus": "feed-planner"
}
```

**Response:**
```json
{
  "analysis": {
    "architecture": { ... },
    "features": [ ... ],
    "apiEndpoints": [ ... ],
    "components": [ ... ],
    "documentation": [ ... ]
  },
  "focusedAnalysis": "The feed planner generates Instagram captions through...",
  "timestamp": "2025-01-15T10:00:00Z"
}
```

### Benefits

- **Instant Context:** Single call gets comprehensive analysis
- **Focused Answers:** AI-generated analysis for specific queries
- **Feature Detection:** Automatically identifies capabilities
- **Architecture Overview:** Understands system structure
- **Documentation Links:** Points to relevant docs

---

## 🔗 Integration with Brand Brain

### GPT Actions Integration

Add to `docs/gpt-actions-openapi.yaml`:

```yaml
/api/brand-brain/search-codebase:
  post:
    summary: Semantic search across codebase
    requestBody:
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
                enum: [code, docs, api, component]
              category:
                type: string
    responses:
      200:
        description: Search results

/api/brand-brain/analyze-repo:
  post:
    summary: Comprehensive codebase analysis
    requestBody:
      content:
        application/json:
          schema:
            type: object
            properties:
              query:
                type: string
                description: Optional focused query
              focus:
                type: string
                description: Focus area (e.g., feed-planner, maya)
    responses:
      200:
        description: Analysis results
```

### Brand Brain Context Enhancement

Update `lib/admin/get-complete-context.ts`:

```typescript
// Add vector search results to context
if (query) {
  const codebaseResults = await searchCodebase(query, { limit: 5 })
  contextParts.push("\n=== CODEBASE SEARCH RESULTS ===")
  for (const result of codebaseResults) {
    contextParts.push(`File: ${result.filePath}`)
    contextParts.push(`Content: ${result.content}`)
  }
}

// Add weekly summaries
const weeklySummaries = await sql`
  SELECT title, content, created_at
  FROM admin_knowledge_base
  WHERE knowledge_type = 'weekly_summary'
  ORDER BY created_at DESC
  LIMIT 3
`
if (weeklySummaries.length > 0) {
  contextParts.push("\n=== RECENT WEEKLY SUMMARIES ===")
  for (const summary of weeklySummaries) {
    contextParts.push(`${summary.title}: ${summary.content}`)
  }
}
```

---

## 📋 Implementation Checklist

### Phase 1: Vector Memory
- [ ] Set up OpenAI embeddings service
- [ ] Create codebase indexing script
- [ ] Index all relevant files (code, docs, APIs)
- [ ] Create semantic search endpoint
- [ ] Test search accuracy

### Phase 2: Knowledge Sync
- [ ] Create weekly data collection functions
- [ ] Implement AI summary generation
- [ ] Create knowledge sync cron job
- [ ] Add to vercel.json schedule
- [ ] Test first sync

### Phase 3: Analyze Repo
- [ ] Create file structure analyzer
- [ ] Implement feature detection
- [ ] Build API route extractor
- [ ] Create component identifier
- [ ] Add focused analysis with AI
- [ ] Test with various queries

### Phase 4: Integration
- [ ] Add endpoints to GPT Actions OpenAPI
- [ ] Update Brand Brain context system
- [ ] Test end-to-end workflow
- [ ] Document usage patterns

---

## 💡 Usage Examples

### Example 1: Semantic Code Search
**Query:** "How does credit deduction work?"
**Result:** Finds `lib/credits.ts`, `app/api/credits/*`, related documentation

### Example 2: Weekly Summary
**Auto-generated:** "This week: 5 users reported feed planner caption issues. New Pro Photoshoot feature launched. Revenue up 12%."

### Example 3: Repo Analysis
**Query:** "What marketing automation exists?"
**Result:** Comprehensive list of email sequences, cron jobs, landing pages, and their connections

---

## 🎯 Expected Benefits

### For Brand Brain
- **Instant Context:** Understands codebase without reading every file
- **Semantic Understanding:** Finds relevant code even with different terminology
- **Proactive Awareness:** Knows what's happening weekly
- **Strategic Insights:** Data-driven product recommendations

### For Product Strategy
- **Pattern Recognition:** Identifies recurring issues
- **Feature Adoption:** Tracks what users actually use
- **Growth Trends:** Understands business metrics
- **Technical Debt:** Spots areas needing attention

---

**Status:** Planning Document  
**Priority:** Optional Enhancement  
**Estimated Effort:** 
- Vector Memory: 2-3 days
- Knowledge Sync: 1-2 days
- Analyze Repo: 2-3 days
- Integration: 1 day

**Total:** ~1 week of development

---

**Last Updated:** Planning phase  
**Next Steps:** Review and prioritize enhancements based on Brand Brain usage patterns
