Agent Report
Agent: admin-business-ops
Specialty: Admin tooling, operational risks, business controls.
Chunk ID: chunk-008
Group: .backups
Date: 2024-06-07

Summary:
- The chunk contains multiple admin API route handlers and UI components related to managing testimonials, training models, user searches, writing assistant content, and an advanced admin chat agent (named Alex).
- Admin access is consistently verified using email checks against a designated ADMIN_EMAIL "ssa@ssasocial.com".
- Several endpoints interact with the database via Neon, and with external services like Replicate API, Stripe, and Anthropic API.
- Complex business logic exists in training model management (e.g., promoting test models to production, fixing trigger words, syncing model versions).
- The admin chat agent leverages AI with streaming responses, tools execution, and manages chat sessions with rich logging and error handling.

Top Findings:
- Testimonials Admin Page (.backups/admin-cleanup-jan31-2026/admin/testimonials/page.tsx):
  - Full React component for managing testimonials: filtering by published/pending, manual upload with image uploads, editing testimonials including images, approval/rejection, and previewing cards.
  - Image uploads POST to /api/upload with progress tracking and error displays (lines ~150-220).
  - Fetches testimonials from /api/admin/testimonials?published=true/false, and updates via PATCH /api/admin/testimonials with partial updates (lines ~80-120).
- Testimonial API routes (.backups/admin-cleanup-jan31-2026/admin/testimonials/route.ts):
  - GET fetches testimonials filtered optionally by published status (lines 6-31).
  - PATCH updates testimonial fields including images, publication, featuring with database update queries (lines 33-69).
- Training Admin APIs:
  - Bulk sync version POST endpoint updates multiple users’ models with the latest Replicate model versions (bulk-sync/route.ts).
  - Fix trigger word POST endpoint includes complex logic: verifies admin access, reads current and original trigger words, fetches training status from Replicate, conditionally cancels ongoing training, updates DB trigger words, and returns detailed next steps (fix-trigger-word/route.ts).
  - Promote test model POST endpoint handles locating test and production models, resolves unique trigger word conflicts by updating trigger words with timestamps, and either creates or updates production model while preserving data integrity; extensive logging and error handling for DB constraint violations (promote-test-model/route.ts).
  - Sync status GET endpoint fetches latest completed model per user, queries Replicate API for version info, sorts by status, and reports summary counts for syncing needs (sync-status/route.ts).
  - Sync single user POST endpoint updates a specific user model’s replicate version and LoRA weights URL after fetching latest Replicate version (sync-user/route.ts).
- User Admin APIs:
  - User search GET endpoint with authentication checks that query users by email or display name with rate limit handling (users/search/route.ts).
  - V2 feature flag update endpoints (POST and PUT) that toggle “use_feed_planner_v2” in users table based on userId/email, with admin verification (users/v2-flag/route.ts).
- Writing Assistant Admin APIs:
  - Generate POST endpoint uses Anthropic API with a tailored system prompt for Sandra’s brand voice and content pillars, including saving to DB optionally and handling JSON output parsing (writing-assistant/generate/route.ts).
  - List GET endpoint to fetch saved writing assistant outputs filtered by pillar/outputType/date range with admin check (writing-assistant/list/route.ts).
  - Save POST endpoint stores writing assistant content including hashtags and suggested dates, creates DB table if needed (writing-assistant/save/route.ts).
  - Delete DELETE endpoint supports deletion of single or bulk writing assistant outputs restricted to admin user (writing-assistant/delete/route.ts).
- Verification Admin APIs:
  - verify-anthropic-key GET endpoint checks if ANTHROPIC_API_KEY is configured in env, returns masked info with admin authentication (verify-anthropic-key/route.ts).
  - verify-stripe-config GET endpoint inspects Stripe pricing IDs from env, verifies existence, active status, correct amounts and subscription type, and returns validation results for admin diagnostics (verify-stripe-config/route.ts).
- Admin Chat Agent "Alex" Endpoints:
  - Chat POST endpoint (.backups/agent-code-backup-jan31/alex/chat/route.ts) implements a complex streaming AI chat interface:
    - Verifies admin by email.
    - Processes varied message formats preserving images and text.
    - Manages chat sessions with provided or fallback chatIds.
    - Saves messages with generated titles.
    - Extracts image URLs from messages for context.
    - Loads knowledge base.
    - Executes defined AI tools iteratively via Anthropic API with streaming SSE responses.
    - Handles tool uses and parsing, including email content generation, Instagram captions, proactive suggestions, automation sequences.
    - Detailed logging and error handling for robustness and graceful failures.
  - Additional endpoints for chat management:
    - chat/new-chat POST creates new admin chat with optional initial message for title.
    - chat/chats GET lists admin agent chats with message counts.
    - chat/chats/[chatId] DELETE deletes a chat; PATCH updates chat title.
    - chat/load-chat GET loads chat messages and associates automation sequences for rendering.
    - alex/suggestions/act-upon POST marks suggestions acted upon.
- Webhook diagnostics page (.backups/admin-cleanup-jan31-2026/admin/webhook-diagnostics/page.tsx) exports default from diagnostics/system/page (delegates rendering).

Risks:
- Image upload endpoints in testimonial manual and edit forms use generic /api/upload with limited error handling; lack of explicit virus/malware scanning or file type validation info (page.tsx

## FILES_REVIEWED
```json
[
  ".backups/admin-cleanup-jan31-2026/admin/testimonials/page.tsx",
  ".backups/admin-cleanup-jan31-2026/admin/testimonials/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/training/bulk-sync/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/training/fix-trigger-word/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/training/promote-test-model/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/training/sync-status/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/training/sync-user/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/users/search/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/users/v2-flag/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/verify-anthropic-key/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/verify-stripe-config/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/webhook-diagnostics/page.tsx",
  ".backups/admin-cleanup-jan31-2026/admin/writing-assistant/delete/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/writing-assistant/generate/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/writing-assistant/list/route.ts",
  ".backups/admin-cleanup-jan31-2026/admin/writing-assistant/save/route.ts",
  ".backups/agent-code-backup-jan31/alex/chat/route.ts",
  ".backups/agent-code-backup-jan31/alex/chats/[chatId]/route.ts",
  ".backups/agent-code-backup-jan31/alex/chats/route.ts",
  ".backups/agent-code-backup-jan31/alex/load-chat/route.ts",
  ".backups/agent-code-backup-jan31/alex/new-chat/route.ts",
  ".backups/agent-code-backup-jan31/alex/page.tsx",
  ".backups/agent-code-backup-jan31/alex/suggestions/act-upon/route.ts"
]
```
