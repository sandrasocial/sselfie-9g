# Unfinished Work

This file tracks worktree changes that should not be lost or accidentally folded into unrelated commits.

## Maya unfinished work

Status as of 2026-05-21:

Resolved by the focused Maya cleanup pass. The previously modified files were reviewed and committed intentionally:

- `app/api/maya/chat/route.ts`
- `components/sselfie/maya/maya-chat-interface.tsx`

What the changes did:

- Reused the existing premium `FullscreenImageModal` for inline Maya-generated images.
- Looked up generated image metadata through `/api/images/lookup` so favorites can use the existing Gallery favorite endpoint.
- Added a cleaner canvas instruction for OpenAI image prompts so generated photos are less likely to appear inside a white frame, mockup, app UI, or preview card.
- Added safer error handling around the internal `/api/maya/generate-image-openai` dispatch so a fetch failure returns a Maya-facing message instead of hard-crashing the chat stream.

Risk assessment:

- Medium risk because the active Maya chat route and chat interface were touched.
- The changes are stabilization-oriented and preserve existing auth, credits, Gallery persistence, providers, routes, and product delivery.

Follow-up recommendation:

Run one authenticated local Maya QA pass before deployment: generate an inline image, click it fullscreen, download it, favorite it, and send one continuation prompt after the image.
