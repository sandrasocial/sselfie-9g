Agent Report
Agent: admin-business-ops
Specialty: Admin tooling, operational risks, business controls.
Chunk ID: chunk-121
Group: docs
Date: 2024-06-05

Summary:
- Comprehensive audits and fixes have been applied to the Feed Planner prompting pipeline, Strategy & Captions generation, Maya image authenticity, impersonation functionality, GA4 & Facebook Pixel implementation, and other key operational systems.
- Significant improvements are made to ensure Feed Planner prompts fully leverage Maya's potential with enforced mandatory requirements, personal brand styling, and trigger word usage.
- The Instagram strategy and caption generation system is underutilized; a detailed hybrid approach is recommended to incorporate sophisticated frameworks, user context, and 2025 Instagram best practices.
- Maya image prompts have undergone critical restoration to reinstate authentic iPhone-quality aesthetics by adjusting prompt length, emphasizing natural imperfections, and reintroducing casual language.
  
Top Findings:
- Feed Planner Prompting Pipeline:
  - Multiple fixes applied across files (e.g., `visual-composition-expert.ts`, `generate-feed-prompt/route.ts`) to enforce 50-80 word prompts with mandatory terms like iPhone 15 Pro, natural imperfections, skin texture, film grain, muted colors. [docs/archive/FEED-PLANNER-PIPELINE-SUMMARY.md]
  - The pipeline historically suffered from overly complex validation layers. A recommendation is to simplify and align Feed Planner with Concept Cards approach using single clear system prompt and trusting AI. [docs/archive/FEED-PLANNER-VS-CONCEPT-CARDS-COMPARISON.md]
  - Trigger word usage and personal brand styling are inconsistently applied; prompts created during strategy generation lack these and are only enhanced as fallback during image generation, risking generic images. [docs/archive/FEED-PLANNER-PROMPTING-AUDIT.md]
  
- Feed Planner Strategy & Captions:
  - Current implementation uses basic generateText calls with minimal system prompt, ignoring user context, knowledge base, and 2025 Instagram best practices such as Hook-Story-Value-CTA framework and narrative arcs. [docs/archive/FEED-PLANNER-STRATEGY-AND-CAPTIONS-AUDIT.md]
  - There are sophisticated caption writer tools and Instagram strategist personalities that are not utilized, representing missed opportunities for quality improvement. [Ibid]
  
- Maya Image Authenticity:
  - A critical regression occurred after December 7, 2025 commit where prompt length doubled, "amateur cellphone photo" language was removed, and emphasis on natural imperfections weakened, leading to plastic, AI-like images. [docs/archive/MAYA-AUTHENTICITY-ANALYSIS.md]
  - Subsequent fixes successfully restored authentic iPhone-quality by refining prompt length to 30-45 words, reinforcing natural imperfections (visible sensor noise, motion blur), re-adding casual moment language, and lowering temperature for model generation consistency. [docs/archive/MAYA-AUTHENTICITY-RESTORATION-IMPLEMENTED.md]
  - Overly complex mandatory requirements and aggressive post-processing previously degraded prompt quality. Recommended to revert or simplify. [docs/archive/MAYA-PROMPT-QUALITY-COMPARISON.md]
  
- Admin User Impersonation:
  - Full impersonation flows are implemented allowing admins to act as users with all features (image generation, chat, settings). All relevant API routes updated to use `getEffectiveNeonUser()` ensuring impersonation fidelity. [docs/archive/FULL-IMPERSONATION-COMPLETE.md]
  - Simplified impersonation login system added later, retiring older complex routes, improving security and admin usability. [docs/archive/IMPERSONATION-CLEANUP-COMPLETE.md]
  
- GA4 & Facebook Pixel Implementation:
  - Complete implementation of GA4 and Facebook Pixel tracking across landing and blueprint pages, checkout and social links, with custom events for CTAs, pricing views, email signups, and checkout start. [docs/archive/GA4-IMPLEMENTATION-SUMMARY.md]
  - Scripts load deferred with environment variable control to avoid impact on page load.
  
- Image Analysis and Motion Prompt Fix:
  - Fixed a critical bug where motion prompt API did not receive imageUrl, leading to incorrect motion prompt generation. Now `imageUrl` is passed properly to enable Claude vision analysis for accurate pose-aligned motions. [docs/archive/IMAGE-ANALYSIS-AUDIT.md]
  - Motion prompting now avoids facial expressions and smiling for natural in-video appearances. [docs/archive/MOTION-PROMPT-EXPRESSION-FIXES.md]
  
Risks:
- The Feed Planner’s multiple validation layers and complex prompt enforcement could lead to brittle code and slow iteration cycles, risking prompt quality regressions on future changes [FEED-PLANNER-VS-CONCEPT-CARDS-COMPARISON.md].
- Current Feed Planner strategy generation is too simplistic and misses integration with user context and knowledge bases, risking low engagement and inconsistent brand voice [FEED-PLANNER-STRATEGY-AND-CAPTIONS-AUDIT.md].
- Aggressive removal of user physical preferences in prompt generation (historically) risks misrepresenting user features like hair, age, and body type in final images, leading to dissatisfaction [MAYA-TRAINING-AUDIT-REPORT.md].
- Inconsistent LoRA training parameters (e.g., high rank, dropout) may cause instability or training inefficiencies if not addressed alongside prompt fixes [MAYA-TRAINING-AUDIT-REPORT.md].
- Usage of stored prompts without re-validation or enhancement during image generation risks image outputs that do not include trigger words or brand styling, degrading user image quality [FEED-PLANNER-PROMPTING-AUDIT.md].

Opportunities:
- Simplify Feed Planner prompting by adopting concept card style system prompt trust and removing complex validation to improve maintainability and model compliance [FEED-PLANNER

## FILES_REVIEWED
```json
[
  "docs/archive/FEED-PLANNER-PIPELINE-SUMMARY.md",
  "docs/archive/FEED-PLANNER-PROMPT-AUDIT.md",
  "docs/archive/FEED-PLANNER-PROMPTING-AUDIT.md",
  "docs/archive/FEED-PLANNER-STRATEGY-AND-CAPTIONS-AUDIT.md",
  "docs/archive/FEED-PLANNER-VS-CONCEPT-CARDS-COMPARISON.md",
  "docs/archive/FEED-STRATEGY-DOCUMENT-AUDIT.md",
  "docs/archive/FULL-IMPERSONATION-COMPLETE.md",
  "docs/archive/GA4-IMPLEMENTATION-SUMMARY.md",
  "docs/archive/GIT_HISTORY_ANALYSIS.md",
  "docs/archive/IMAGE-ANALYSIS-AUDIT.md",
  "docs/archive/IMPERSONATION-CLEANUP-COMPLETE.md",
  "docs/archive/IMPERSONATION-IMPLEMENTATION.md",
  "docs/archive/LANDING-PAGE-OPTIMIZATION-SUMMARY.md",
  "docs/archive/LEGACY-MIGRATIONS-ARCHIVED.md",
  "docs/archive/LIVE-STRIPE-CHECKLIST.md",
  "docs/archive/MANUAL-STEPS-ADVANCED-AUTOMATION.md",
  "docs/archive/MANUAL-STEPS-REQUIRED.md",
  "docs/archive/MANUAL-STEPS-RESEND-WEBHOOK.md",
  "docs/archive/MAYA-AUTHENTICITY-ANALYSIS.md",
  "docs/archive/MAYA-AUTHENTICITY-RESTORATION-IMPLEMENTED.md",
  "docs/archive/MAYA-IMAGE-PROMPTING-AUDIT.md",
  "docs/archive/MAYA-PROMPT-QUALITY-COMPARISON.md",
  "docs/archive/MAYA-PROMPTING-FIXES-IMPLEMENTED.md",
  "docs/archive/MAYA-QUALITY-SETTINGS-AUDIT.md",
  "docs/archive/MAYA-TRAINING-AUDIT-REPORT.md",
  "docs/archive/MOTION-PROMPT-EXPRESSION-FIXES.md",
  "docs/archive/PRE-COMMIT-CLEANUP-ANALYSIS.md",
  "docs/archive/PROMPT-CHANGES-COMPARISON-2-WEEKS.md",
  "docs/archive/PROMPT-FIXES-SUMMARY.md"
]
```
