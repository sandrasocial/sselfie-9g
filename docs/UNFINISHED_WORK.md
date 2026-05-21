# Unfinished Work

This file tracks worktree changes that should not be lost or accidentally folded into unrelated commits.

## Maya unfinished work

Status as of 2026-05-21:

Modified Maya files currently sitting in the worktree:

- `app/api/maya/chat/route.ts`
- `components/sselfie/maya/maya-chat-interface.tsx`

What the changes appear related to:

- Inline Maya image rendering and fullscreen modal behavior.
- Looking up generated image metadata from `/api/images/lookup`.
- Passing image favorite state into the existing `FullscreenImageModal`.
- Adding a cleaner canvas instruction for OpenAI image prompts so generated photos do not appear inside a white frame or app-preview mockup.
- Adding safer error handling around the internal `/api/maya/generate-image-openai` dispatch so a fetch failure returns a Maya-facing message instead of hard-crashing the chat stream.

Risk assessment:

- Medium risk.
- The direction appears aligned with the Maya consolidation/debug work, but it touches the active Maya chat route and active Maya chat interface.
- It should be validated in an authenticated Maya session before commit.

Recommended next Codex task:

Continue the Maya consolidation debug phase as a focused task. Review these two modified files, run the Maya image continuation scenario, verify fullscreen image behavior, verify Gallery/favorite behavior, and only then commit or revise the Maya changes.

Warning:

Do not overwrite, revert, or accidentally commit these Maya files inside unrelated design, email, sales-page, or documentation work.
