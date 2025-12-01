# SSELFIE Agent Architecture Report
**Generated:** 2025-01-27  
**Scope:** Complete repository analysis of all agent implementations

---

## EXECUTIVE SUMMARY

This report provides a comprehensive map of all agents in the SSELFIE codebase, identifies architectural issues, security concerns, and proposes a scalable future architecture.

### Key Findings
- **Total Agents Identified:** 20+ agent classes across multiple categories
- **Critical Issues:** 2 base agent classes (duplication), incomplete implementations, security gaps
- **Maya Status:** ✅ Properly isolated to user-facing tasks only
- **Admin Security:** ⚠️ Email-based auth (needs hardening)
- **Architecture:** Mixed patterns (class-based agents + workflow orchestration + specialist functions)

---

## 1. AGENT INVENTORY TABLE

| Agent Name | File Path | Role | Responsibilities | Trigger/Event | Inputs | Outputs | Dependencies | Notes/Issues |
|------------|-----------|------|------------------|---------------|--------|----------|--------------|-------------|
| **BaseAgent** | `agents/core/baseAgent.ts` | Internal | Base class for all agents | N/A | Config object | Agent instance | None | ⚠️ **DUPLICATE** - Two base classes exist |
| **BaseAgent (Abstract)** | `agents/core/base-agent.ts` | Internal | Abstract base class | N/A | Config object | Agent instance | types.ts | ⚠️ **DUPLICATE** - Not used, abstract |
| **AdminAgent** | `agents/admin/admin-agent.ts` | Admin | Sandra's business assistant | Manual/admin chat | Message string | AgentResponse | BaseAgent (abstract), AgentFactory | ❌ **INCOMPLETE** - TODO stubs only |
| **AdminSupervisorAgent** | `agents/admin/adminSupervisorAgent.ts` | Admin | Top-level admin automation supervisor | Admin workflows, cron jobs | Workflow params | Workflow results | BaseAgent, all tools, all workflows | ✅ Active, orchestrates workflows |
| **SalesDashboardAgent** | `agents/admin/salesDashboardAgent.ts` | Admin | Sales analytics & insights | Weekly cron, manual trigger | None | Weekly insights JSON | BaseAgent, Neon SQL | ✅ Active, caches insights |
| **EmailMarketer** | `agents/marketing/email-marketer.ts` | Admin/Internal | Email campaign creation | Manual/admin chat | Message string | AgentResponse | BaseAgent (abstract) | ❌ **INCOMPLETE** - TODO stubs only |
| **MarketingAutomationAgent** | `agents/marketing/marketingAutomationAgent.ts` | Admin | Email flows, campaigns, retention | Workflows, email queue | Workflow config | Email results | BaseAgent, email tools, Neon SQL | ✅ Active, handles email queue |
| **DailyContentAgent** | `agents/content/dailyContentAgent.ts` | Admin | Generate Sandra's daily social content | Content workflow | Topic, content type | Content JSON (reel/carousel/story) | BaseAgent, AI SDK | ✅ Active, generates content |
| **FeedDesignerAgent** | `agents/content/feedDesignerAgent.ts` | User/Admin | Analyze feed layouts & design | Feed designer workflow | Feed data, posts | Design recommendations | BaseAgent | ⚠️ **STUB** - Returns hardcoded data |
| **AutoPostingAgent** | `agents/content/autoPostingAgent.ts` | Admin | Schedule & queue Instagram posts | Auto-posting workflow | User ID, feed post ID | Queue status | BaseAgent | ⚠️ **STUB** - No implementation |
| **FeedPerformanceAgent** | `agents/content/feedPerformanceAgent.ts` | User/Admin | Analyze feed performance | Feed performance workflow | Feed ID, user ID | Performance insights | BaseAgent | ⚠️ **STUB** - No implementation |
| **LeadMagnetAgent** | `agents/sales/leadMagnetAgent.ts` | Admin | Deliver lead magnets to new users | User signup, manual trigger | User ID, email, magnet type | Delivery status | BaseAgent, Neon SQL | ✅ Active, tracks engagement |
| **WinbackAgent** | `agents/sales/winbackAgent.ts` | Admin | Reactivate inactive users | Winback workflow | User ID, days inactive | Winback message | BaseAgent, AI SDK, Neon SQL | ✅ Active, generates messages |
| **UpgradeAgent** | `agents/sales/upgradeAgent.ts` | Admin | Detect & recommend upgrades | Upgrade workflow | User ID | Upgrade recommendation | BaseAgent, AI SDK, Neon SQL | ✅ Active, detects opportunities |
| **ChurnPreventionAgent** | `agents/sales/churnPreventionAgent.ts` | Admin | Prevent subscription churn | Subscription events | User ID, event type | Retention message | BaseAgent, AI SDK, Neon SQL | ✅ Active, handles events |
| **Maya** | `app/api/maya/chat/route.ts` | **User** | User-facing AI assistant for photoshoots | User chat messages | Chat messages, user context | AI responses, image generation | AI SDK, Maya libs | ✅ **ISOLATED** - User-only |
| **ContentResearchStrategist** | `lib/content-research-strategist/` | User | Research Instagram trends & content | User request via API | Niche, brand profile | Research results | AI SDK, web search | ✅ Active, user-facing |
| **PersonalBrandStrategist** | `lib/personal-brand-strategist/` | User | Personal brand strategy advice | User request via API | User profile, goals | Strategy recommendations | AI SDK | ✅ Active, user-facing |
| **InstagramBioStrategist** | `lib/instagram-bio-strategist/` | User | Instagram bio optimization | User request via API | Current bio, goals | Optimized bio | AI SDK | ✅ Active, user-facing |
| **InstagramStrategyAgent** | `lib/feed-planner/instagram-strategy-agent.ts` | User | Feed planning strategy | Feed planner feature | Feed data, goals | Strategy plan | AI SDK | ✅ Active, user-facing |

---

## 2. AGENT CONFLICT & ISSUE SUMMARY

### 🔴 CRITICAL ISSUES

#### 1. **Duplicate Base Agent Classes**
- **Location:** `agents/core/baseAgent.ts` AND `agents/core/base-agent.ts`
- **Issue:** Two different base classes exist:
  - `baseAgent.ts`: Concrete implementation with no-op methods (ACTIVE - used by all agents)
  - `base-agent.ts`: Abstract class with abstract methods (UNUSED - referenced by incomplete agents)
- **Impact:** Confusion, maintenance burden, incomplete agents can't instantiate
- **Fix:** Remove `base-agent.ts`, migrate `AdminAgent` and `EmailMarketer` to use `baseAgent.ts`

#### 2. **Incomplete Agent Implementations**
- **AdminAgent** (`agents/admin/admin-agent.ts`): Extends abstract base, has TODO stubs only
- **EmailMarketer** (`agents/marketing/email-marketer.ts`): Extends abstract base, has TODO stubs only
- **Impact:** These agents cannot function, dead code
- **Fix:** Either implement or remove

#### 3. **Stub Agents Without Implementation**
- **FeedDesignerAgent**: Returns hardcoded data instead of AI analysis
- **AutoPostingAgent**: Empty class, no posting logic
- **FeedPerformanceAgent**: Empty class, no analysis logic
- **Impact:** Features appear available but don't work
- **Fix:** Implement or mark as "coming soon"

### ⚠️ MODERATE ISSUES

#### 4. **Mixed Architecture Patterns**
- **Issue:** Three different patterns coexist:
  1. Class-based agents (`/agents/*/`)
  2. Function-based specialists (`/lib/*-strategist/`)
  3. Workflow orchestration (`/agents/workflows/`)
- **Impact:** Inconsistent patterns, harder to maintain
- **Recommendation:** Standardize on one pattern or document when to use each

#### 5. **Agent Factory Not Used**
- **Location:** `agents/core/agent-factory.ts`
- **Issue:** Factory defines agent configs but no agents actually use it
- **Impact:** Dead code, unused abstraction
- **Fix:** Either use it or remove

#### 6. **Tool Usage Inconsistency**
- **Issue:** Some agents use tools (AdminSupervisorAgent), others don't (most content agents)
- **Impact:** Inconsistent capabilities, harder to extend
- **Recommendation:** Standardize tool usage pattern

### 🟡 MINOR ISSUES

#### 7. **Workflow Orchestrator Incomplete**
- **Location:** `agents/workflows/orchestrator.ts`
- **Issue:** Has TODO comments, no actual execution logic
- **Impact:** Workflows work but not through orchestrator
- **Fix:** Implement or remove orchestrator

#### 8. **Memory Manager Unused**
- **Location:** `agents/memory/memory-manager.ts`
- **Issue:** Memory system defined but not integrated with agents
- **Impact:** Missing long-term context capability
- **Fix:** Integrate or document as future feature

---

## 3. MAYA BOUNDARY REPORT

### ✅ Maya Isolation Status: **SECURE**

**Maya is properly isolated to user-facing tasks only.**

#### Evidence:
1. **Separate API Routes:** All Maya endpoints in `/app/api/maya/` (not `/admin/`)
2. **User Authentication:** Maya requires user auth, not admin auth
3. **No Admin Dependencies:** Maya does not import or use:
   - AdminSupervisorAgent
   - MarketingAutomationAgent
   - Any admin workflows
   - Admin tools
4. **User Context Only:** Maya uses `getUserContextForMaya()` for user personalization
5. **Image Generation:** Maya handles user photoshoot generation (user-facing feature)

#### Admin Agent References to Maya:
- ✅ **Safe References:** Admin agents only READ Maya data for analytics:
  - `app/api/admin/agent/analytics/route.ts` - Counts Maya chats for metrics
  - `app/api/admin/agent/index-content/route.ts` - Indexes Maya messages for search
  - `app/api/admin/dashboard/stats/route.ts` - Dashboard statistics
- ✅ **No Write Access:** Admin agents never modify Maya chats or user data
- ✅ **No Generation:** Admin agents never trigger Maya image generation

#### Conclusion:
**Maya boundaries are secure.** Admin agents can read Maya data for analytics but cannot interfere with user-facing Maya functionality.

---

## 4. ADMIN AGENT AUDIT

### Security Analysis

#### ✅ **Properly Secured Endpoints:**
- `/app/api/admin/agent/chat/route.ts` - Email check: `user.email !== ADMIN_EMAIL`
- `/app/api/admin/agent/analytics/route.ts` - Email check
- `/app/api/admin/agent/send-email/route.ts` - Email check
- `/app/api/admin/agent/memory/route.ts` - Email check
- `/app/api/admin/agent/load-chat/route.ts` - Email check
- `/app/api/admin/agent/chats/route.ts` - Email check
- `/app/api/admin/agent/save-message/route.ts` - Email check

#### ⚠️ **Security Concerns:**

1. **Email-Based Auth Only**
   - **Issue:** All admin endpoints check `user.email !== ADMIN_EMAIL` (hardcoded: "ssa@ssasocial.com")
   - **Risk:** Single point of failure, no role-based access, email can be changed
   - **Recommendation:** 
     - Add `is_admin` boolean column to users table
     - Use `requireAdmin()` helper (exists in `lib/security/require-admin.ts`)
     - Add audit logging for admin actions

2. **Missing Input Validation**
   - **Issue:** Some endpoints accept user IDs without validation
   - **Example:** `/app/api/agents/sales/upgrade/route.ts` accepts `userId` without checking ownership
   - **Risk:** Potential unauthorized access if auth bypassed
   - **Recommendation:** Validate all user IDs match authenticated user or are admin-accessible

3. **No Rate Limiting**
   - **Issue:** Admin endpoints have no rate limiting
   - **Risk:** Abuse, accidental loops, resource exhaustion
   - **Recommendation:** Add rate limiting to all admin endpoints

4. **Insufficient Logging**
   - **Issue:** Admin actions logged to console only
   - **Risk:** No audit trail, hard to debug, no compliance
   - **Recommendation:** 
     - Log to database table `admin_activity_log`
     - Include: user_id, action, timestamp, params, result
     - Add error tracking

5. **Workflow Queue Security**
   - **Issue:** `marketing_email_queue` can be written by any code path
   - **Risk:** Unauthorized email sending
   - **Recommendation:** 
     - Add approval workflow for email sends
     - Validate queue entries before processing
     - Add sender verification

### Missing Validation

1. **Workflow Inputs:** Workflows accept params without schema validation
2. **Email Content:** No HTML sanitization before sending
3. **User IDs:** No format validation (UUID vs integer)
4. **Date Ranges:** Analytics queries don't validate date ranges

### Missing Logs

1. **Agent Invocations:** No log when agents are called
2. **Workflow Executions:** No log of workflow runs
3. **Email Sends:** Logged to `email_logs` but not comprehensive
4. **Error Tracking:** Errors logged to console only

### Overly Complex Logic

1. **AdminSupervisorAgent:** 295 lines, orchestrates 15+ workflows
   - **Issue:** Too many responsibilities
   - **Fix:** Split into smaller supervisor agents

2. **MarketingAutomationAgent:** 448 lines, handles email + workflows + queue
   - **Issue:** Mixing concerns
   - **Fix:** Separate email queue manager from agent

3. **Admin Chat Route:** 1117 lines, handles chat + tools + workflows
   - **Issue:** Monolithic file
   - **Fix:** Split into separate route handlers

### Opportunities to Consolidate

1. **Admin Auth:** Use `requireAdmin()` helper consistently (some routes use it, others don't)
2. **Email Sending:** Centralize email sending logic (multiple implementations)
3. **Workflow Triggers:** Unify workflow trigger pattern (inconsistent across routes)
4. **Error Handling:** Standardize error response format

---

## 5. SCALABLE AGENT ARCHITECTURE PROPOSAL

### Current Architecture Problems

1. **Inconsistent Patterns:** Class-based + function-based + workflow-based
2. **Tight Coupling:** Agents directly call workflows, tools mixed with agents
3. **No Standard Interface:** Each agent has different methods
4. **Hard to Test:** Agents depend on database, external APIs
5. **No Observability:** Limited logging, no metrics, no tracing

### Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT ARCHITECTURE                        │
└─────────────────────────────────────────────────────────────┘

┌──────────────────┐
│  User Layer      │
│  ────────────    │
│  • Maya          │  ← User-facing only, isolated
│  • Strategists   │  ← User-facing specialists
└──────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│              AGENT INTERFACE (Standard)                       │
│  ───────────────────────────────────────────────────────    │
│  interface IAgent {                                           │
│    process(input: AgentInput): Promise<AgentOutput>          │
│    stream(input: AgentInput): AsyncIterable<AgentOutput>      │
│    getMetadata(): AgentMetadata                               │
│  }                                                            │
└─────────────────────────────────────────────────────────────┘
         │
         ├──────────────────┬──────────────────┬──────────────┐
         ▼                  ▼                  ▼              ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Maya Engine  │  │ Admin Engine │  │ Marketing    │  │ Content       │
│ (User)       │  │ (Admin)       │  │ Engine       │  │ Engine        │
│              │  │              │  │              │  │               │
│ • Chat       │  │ • Supervisor │  │ • Email      │  │ • Generation  │
│ • Images     │  │ • Analytics  │  │ • Campaigns  │  │ • Analysis    │
│ • Concepts   │  │ • Sales      │  │ • Sequences   │  │ • Planning    │
└──────────────┘  └──────────────┘  └──────────────┘  └──────────────┘
         │                  │                  │              │
         └──────────────────┴──────────────────┴──────────────┘
                            │
                            ▼
              ┌─────────────────────────┐
              │  Pipeline Orchestrator  │
              │  ───────────────────    │
              │  • Workflow execution   │
              │  • Agent coordination   │
              │  • Error recovery       │
              │  • Retry logic          │
              └─────────────────────────┘
                            │
         ┌──────────────────┼──────────────────┐
         ▼                  ▼                  ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Tool Registry │  │   Memory     │  │  Analytics   │
│               │  │   Manager    │  │   Agent       │
│ • Email       │  │              │  │               │
│ • Search      │  │ • Context    │  │ • Metrics     │
│ • Database    │  │ • History    │  │ • Insights   │
│ • External    │  │ • Learning   │  │ • Reporting  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Proposed Structure

```
/agents
  /core
    - base-agent.ts          # Single base class (remove duplicate)
    - agent-interface.ts     # Standard IAgent interface
    - agent-factory.ts       # Factory for creating agents
    - types.ts               # Shared types
  /engines
    /maya                    # User-facing Maya engine
      - maya-agent.ts
      - maya-tools.ts
    /admin                   # Admin automation engine
      - admin-supervisor.ts
      - admin-analytics.ts
      - admin-sales.ts
    /marketing               # Marketing automation engine
      - email-agent.ts
      - campaign-agent.ts
      - sequence-agent.ts
    /content                 # Content creation engine
      - content-generator.ts
      - feed-analyzer.ts
      - performance-agent.ts
  /orchestrator
    - pipeline.ts            # Workflow orchestration
    - coordinator.ts         # Agent coordination
    - scheduler.ts           # Task scheduling
  /tools
    - registry.ts            # Central tool registry
    - email-tools.ts
    - analytics-tools.ts
    - database-tools.ts
  /memory
    - manager.ts             # Long-term memory
    - context-builder.ts     # Context assembly
  /monitoring
    - logger.ts              # Structured logging
    - metrics.ts             # Performance metrics
    - tracer.ts              # Request tracing
```

### Key Principles

1. **Single Responsibility:** Each agent does one thing well
2. **Standard Interface:** All agents implement `IAgent`
3. **Dependency Injection:** Agents receive tools, not create them
4. **Observability First:** Logging, metrics, tracing built-in
5. **Testability:** Agents can be tested in isolation
6. **Isolation:** Maya stays user-facing, admin stays admin-only

### Migration Path

**Phase 1: Foundation (Week 1-2)**
- Remove duplicate base classes
- Create standard `IAgent` interface
- Implement tool registry
- Add structured logging

**Phase 2: Engine Separation (Week 3-4)**
- Split AdminSupervisorAgent into focused agents
- Separate Maya into dedicated engine
- Create Marketing engine
- Create Content engine

**Phase 3: Orchestration (Week 5-6)**
- Implement pipeline orchestrator
- Migrate workflows to use orchestrator
- Add error recovery
- Add retry logic

**Phase 4: Observability (Week 7-8)**
- Add metrics collection
- Implement request tracing
- Create admin dashboard for agent monitoring
- Add alerting

**Phase 5: Integration (Week 9-10)**
- Integrate email sequence engine
- Connect analytics agent
- Add memory manager
- Performance optimization

---

## 6. FILE-BY-FILE RECOMMENDATIONS

### `/agents/core/`

#### `base-agent.ts` ✅ KEEP
- **Status:** Active, used by all agents
- **Action:** Keep as single base class
- **Improvements:**
  - Add `getMetadata()` method
  - Add structured logging helper
  - Add error handling wrapper

#### `base-agent.ts` ❌ REMOVE
- **Status:** Unused, abstract class
- **Action:** Delete file
- **Migration:** Move any useful methods to `baseAgent.ts`

#### `agent-factory.ts` ⚠️ FIX OR REMOVE
- **Status:** Defined but unused
- **Action:** Either:
  1. Implement factory pattern and use it, OR
  2. Remove if not needed
- **Recommendation:** Remove (agents are simple enough to construct directly)

#### `types.ts` ✅ KEEP
- **Status:** Used by workflows
- **Action:** Keep, but consider merging with base-agent types

### `/agents/admin/`

#### `admin-agent.ts` ❌ REMOVE OR IMPLEMENT
- **Status:** Incomplete, TODO stubs
- **Action:** 
  - Option 1: Remove (AdminSupervisorAgent handles this)
  - Option 2: Implement as lightweight admin chat agent
- **Recommendation:** Remove (redundant with AdminSupervisorAgent)

#### `adminSupervisorAgent.ts` ⚠️ REFACTOR
- **Status:** Active but too large (295 lines)
- **Action:** Split into:
  - `AdminSupervisorAgent` - Main orchestrator (keep)
  - `AdminWorkflowTrigger` - Workflow triggering (extract)
  - `AdminAnalyticsAgent` - Analytics (extract)
- **Improvements:**
  - Add input validation
  - Add error handling
  - Add logging

#### `salesDashboardAgent.ts` ✅ KEEP
- **Status:** Active, working
- **Action:** Keep, minor improvements:
  - Add caching TTL
  - Add error retry
  - Add metrics export

### `/agents/marketing/`

#### `email-marketer.ts` ❌ REMOVE OR IMPLEMENT
- **Status:** Incomplete, TODO stubs
- **Action:** Remove (MarketingAutomationAgent handles this)

#### `marketingAutomationAgent.ts` ⚠️ REFACTOR
- **Status:** Active but mixed concerns (448 lines)
- **Action:** Split into:
  - `EmailQueueManager` - Queue operations (extract)
  - `MarketingAutomationAgent` - Campaign logic (keep)
  - `EmailSequenceAgent` - Sequence handling (extract)
- **Improvements:**
  - Add email validation
  - Add rate limiting
  - Add approval workflow

#### `marketingAutomationAgent.tsx` ⚠️ CONSOLIDATE
- **Status:** Duplicate file (TSX version)
- **Action:** Merge with `.ts` version or remove if unused

### `/agents/content/`

#### `dailyContentAgent.ts` ✅ KEEP
- **Status:** Active, working
- **Action:** Keep, minor improvements:
  - Add content validation
  - Add brand voice consistency check
  - Add content quality scoring

#### `feedDesignerAgent.ts` ⚠️ IMPLEMENT
- **Status:** Stub, returns hardcoded data
- **Action:** Implement AI analysis or mark as "coming soon"

#### `autoPostingAgent.ts` ⚠️ IMPLEMENT
- **Status:** Empty stub
- **Action:** Implement posting logic or remove

#### `feedPerformanceAgent.ts` ⚠️ IMPLEMENT
- **Status:** Empty stub
- **Action:** Implement analysis logic or remove

### `/agents/sales/`

#### All Sales Agents ✅ KEEP
- **Status:** All active and working
- **Action:** Keep, minor improvements:
  - Add input validation
  - Add error handling
  - Add logging

### `/agents/workflows/`

#### `orchestrator.ts` ⚠️ IMPLEMENT OR REMOVE
- **Status:** Incomplete, TODO stubs
- **Action:** Either implement full orchestration or remove (workflows work without it)

#### All Workflow Files ✅ KEEP
- **Status:** Active, used by API routes
- **Action:** Keep, standardize:
  - Input validation
  - Error handling
  - Return types

### `/agents/tools/`

#### All Tool Files ✅ KEEP
- **Status:** Active, used by agents
- **Action:** Keep, improvements:
  - Add tool validation
  - Add error handling
  - Add rate limiting where needed
  - **CRITICAL:** Fix `analyticsTools.ts` - uses Supabase client (should use Neon)

### `/lib/*-strategist/`

#### All Strategist Files ✅ KEEP
- **Status:** Active, user-facing
- **Action:** Keep, these are fine as function-based specialists
- **Note:** These don't need to be class-based agents

### `/app/api/`

#### `/api/maya/*` ✅ KEEP
- **Status:** User-facing, isolated
- **Action:** Keep, no changes needed

#### `/api/admin/agent/*` ⚠️ SECURITY HARDENING
- **Status:** Active but email-based auth only
- **Action:** 
  - Replace email checks with `requireAdmin()` helper
  - Add audit logging
  - Add rate limiting
  - Add input validation

#### `/api/agents/*` ⚠️ SECURITY REVIEW
- **Status:** Active, workflow triggers
- **Action:**
  - Add admin checks where needed
  - Add input validation
  - Add error handling

---

## 7. DATABASE ARCHITECTURE COMPLIANCE

### ✅ Compliant Agents
- All agents use Neon SQL (`@neondatabase/serverless`)
- No Supabase SQL helpers in agent code
- No RLS references
- User IDs passed from app layer

### ⚠️ Non-Compliant Code

#### `agents/tools/analyticsTools.ts`
- **Issue:** Uses Supabase client for database queries
- **Lines:** 1-4, 24-42, etc.
- **Fix:** Replace with Neon SQL queries
- **Impact:** Violates project rules (Supabase = auth only)

#### `app/api/admin/agent/chat/route.ts`
- **Issue:** Uses Supabase for auth (acceptable) but also queries
- **Status:** ✅ OK - Supabase used only for auth
- **Note:** This is correct usage

### Recommendations
1. Audit all tool files for Supabase usage
2. Replace any Supabase database queries with Neon
3. Keep Supabase only for authentication

---

## 8. INTEGRATION WITH EMAIL AUTOMATION ENGINE

### Current Email System
- **Location:** `lib/data/email-sequence.ts`, `lib/email/send-sequence-email.ts`
- **Status:** New email sequence system
- **Integration Points:**
  1. MarketingAutomationAgent should use sequence engine
  2. AdminSupervisorAgent should trigger sequences
  3. Workflows should integrate with sequences

### Recommendations
1. **Create EmailSequenceAgent:**
   ```typescript
   class EmailSequenceAgent extends BaseAgent {
     async triggerSequence(userId, sequenceId, step)
     async pauseSequence(userId, sequenceId)
     async resumeSequence(userId, sequenceId)
   }
   ```

2. **Integrate with MarketingAutomationAgent:**
   - Replace direct email sends with sequence triggers
   - Use sequence engine for campaigns
   - Track sequence performance

3. **Add to AdminSupervisorAgent:**
   - Add sequence management tools
   - Allow admin to trigger sequences
   - Monitor sequence performance

---

## 9. SUMMARY & ACTION ITEMS

### Immediate Actions (This Week)

1. **Remove Duplicate Base Class**
   - Delete `agents/core/base-agent.ts`
   - Update any imports (if any)

2. **Fix Supabase Usage**
   - Replace Supabase queries in `analyticsTools.ts` with Neon
   - Audit all tools for compliance

3. **Remove Dead Code**
   - Delete `admin-agent.ts` (incomplete)
   - Delete `email-marketer.ts` (incomplete)
   - Remove or implement stub agents

4. **Security Hardening**
   - Replace email checks with `requireAdmin()` helper
   - Add audit logging to admin endpoints
   - Add rate limiting

### Short-Term (Next 2 Weeks)

5. **Refactor Large Agents**
   - Split AdminSupervisorAgent
   - Split MarketingAutomationAgent
   - Split admin chat route

6. **Implement Stub Agents**
   - FeedDesignerAgent
   - AutoPostingAgent
   - FeedPerformanceAgent
   - OR mark as "coming soon"

7. **Standardize Patterns**
   - Document when to use class vs function agents
   - Create agent interface standard
   - Unify error handling

### Medium-Term (Next Month)

8. **Architecture Migration**
   - Implement engine separation
   - Create pipeline orchestrator
   - Add observability layer

9. **Email Sequence Integration**
   - Create EmailSequenceAgent
   - Integrate with marketing workflows
   - Add sequence monitoring

10. **Testing & Documentation**
    - Add unit tests for agents
    - Document agent architecture
    - Create agent usage guide

---

## 10. APPENDIX: AGENT DEPENDENCY GRAPH

```
Maya (User)
  └─> Maya Libraries (lib/maya/)
  └─> User Context
  └─> Image Generation

AdminSupervisorAgent (Admin)
  ├─> All Tools (email, analytics, content, audience)
  ├─> All Workflows (onboarding, retention, etc.)
  └─> MarketingAutomationAgent

MarketingAutomationAgent (Admin)
  ├─> Email Tools
  ├─> Analytics Tools
  ├─> Content Tools
  └─> Audience Tools

SalesDashboardAgent (Admin)
  └─> Neon SQL

DailyContentAgent (Admin)
  └─> AI SDK

Sales Agents (Admin)
  ├─> AI SDK
  └─> Neon SQL

Content Agents (User/Admin)
  └─> BaseAgent (stubs)

Strategists (User)
  └─> AI SDK
  └─> Web Search
```

---

**Report Complete**

For questions or clarifications, refer to individual agent files or contact the development team.

