# Maya Videos Tab Audit

Status: audit completed on `codex/maya-videos-audit` at 2026-03-11
Baseline: `335ec896` (`docs: lock maya ux recovery baseline`)
Scope: user-facing Maya Videos tab only

## Summary

The Videos stack is only half-unified today.

- The **video backend pipeline exists and is usable**.
- The **standalone Videos tab UI exists and is usable** as an image grid / video generator.
- The **chat-native Maya video workflow also exists**, but only inside the main Maya chat renderer.
- The Videos top tab **does not currently mount Maya chat or the shared input bar**, so users cannot "chat with Maya" inside Videos.

This is the core reason users experience the Videos tab as inconsistent with how Maya works elsewhere.

## What works today

### 1. Standalone Videos tab can generate videos from existing images

`MayaVideosTab`:

- loads candidate source images
- generates motion prompts
- calls `/api/maya/generate-video`
- polls `/api/maya/check-video`
- shows completed reels via `InstagramReelCard`

Code:
- `components/sselfie/maya/maya-videos-tab.tsx:142`
- `components/sselfie/maya/maya-videos-tab.tsx:163`
- `components/sselfie/maya/maya-videos-tab.tsx:285`

### 2. Chat-native video tool flow already exists

`MayaChatInterface` can render a full `tool-generateVideo` lifecycle:

- choose image
- upload reference
- processing
- ready
- error

Code:
- `components/sselfie/maya/maya-chat-interface.tsx:1558`

`MayaChatScreen` already owns the execution path:

- generate motion prompt
- start video generation
- poll for completion
- persist `[VIDEO_CARD:...]` markers

Code:
- `components/sselfie/maya-chat-screen.tsx:2572`

### 3. Reload-safe video card persistence already exists for Maya chat

Completed videos are persisted as marker text and rebuilt on load.

Code:
- `components/sselfie/maya-chat-screen.tsx:1662`
- `app/api/maya/load-chat/route.ts:1021`

### 4. Video intent detection works in orchestration

Users asking Maya for a video or reel are routed into `generate_video`.

Code:
- `lib/maya/intent-dispatcher.ts:51`
- `lib/maya/intent-dispatcher.ts:145`

### 5. Narrow video-related tests are green on this branch

Passed:

- `tests/maya-tool-markers.test.ts`
- `tests/maya-tool-dispatcher.test.ts`
- `tests/maya-video-card-marker.test.ts`
- `tests/maya-tool-orchestrator.test.ts`
- `tests/maya-skill-router.test.ts`
- `tests/maya-video-motion-context.test.ts`

Also passed:

- `pnpm type-check`

## What is missing

### 1. No Maya chat surface inside the Videos tab

The Videos tab mounts `MayaVideosTab` directly. It does **not** mount `MayaChatInterface`.

Code:
- `components/sselfie/maya-chat-screen.tsx:4325`

Implication:

- users cannot type to Maya from the Videos tab
- the tab feels like a separate tool instead of Maya

### 2. No shared Maya input bar in the Videos tab

The fixed bottom input area is only shown for `photos` and `feed`.

Code:
- `components/sselfie/maya-chat-screen.tsx:4241`

Implication:

- even though a chat-native video workflow exists, the Videos tab cannot use it directly

### 3. Video card hydration is currently photos-tab scoped

`load-chat` only appends rebuilt video card parts when `isPhotosTab` is true.

Code:
- `app/api/maya/load-chat/route.ts:1021`

Implication:

- if we add chat to Videos tab without changing hydration, reload behavior will still be inconsistent

### 4. Two separate video UX paths exist

Current split:

- `MayaVideosTab` = standalone image-grid generator
- `tool-generateVideo` in chat = inline Maya workflow

Implication:

- duplicate behavior
- duplicate polling and credit flow
- users see different patterns depending on where they start

### 5. Videos tab is not yet task-scoped in Maya terms

The tab is visually separate, but architecturally it is not yet a true Maya-owned tab with:

- one chat surface
- one input surface
- one persistence model
- one reload path

## Recommended implementation direction

Do **not** build a third video path.

Use this order instead:

1. Keep the existing `MayaVideosTab` image-source grid as the source picker/gallery.
2. Add `MayaChatInterface` above it in the Videos tab.
3. Extend the fixed input bar to appear in Videos as well.
4. Route Videos-tab chat messages through the existing `tool-generateVideo` path.
5. Update `load-chat` so video-card hydration is not limited to Photos-only assumptions.
6. Only after that, decide whether standalone `MayaVideosTab` generation logic should be reduced or folded into the shared chat flow.

## Recommended first implementation slice

### Slice 1: make Videos a real Maya chat tab

Requirements:

- Videos tab renders `MayaChatInterface`
- Videos tab shows `MayaUnifiedInput`
- top prompts are video-specific only
- tab keeps the existing image grid below chat as the source chooser

Do **not** change in Slice 1:

- feed architecture
- calendar flow
- training flow
- photos/chat source-choice behavior

## Conclusion

The Videos backend is not the main problem.

The real problem is **surface architecture**:

- video generation works
- Maya chat video tools work
- but the Videos tab does not yet expose that Maya chat flow

So the next safe branch should not be "debug random video errors."
It should be:

- **make Videos a real Maya-guided tab first**
- then fix any remaining persistence or polling gaps from there
