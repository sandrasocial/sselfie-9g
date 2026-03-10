# Maya Inline Feed Chat Audit

Status: code audit as of 2026-03-10
Goal: bring feed planning back inside the main Maya conversation, not as a separate Maya tab.

## 1. Product decision locked

- Feed should be inline in Maya chat.
- Feed should not return as a separate visible Maya tab.
- Feed Planner remains the deeper editing surface after Maya creates or drafts the feed.

## 2. Current implementation reality

The old Maya feed path is not actually "inline chat". It is a tab-scoped subsystem.

Key files:

- `components/sselfie/maya-chat-screen.tsx`
- `components/sselfie/maya/maya-feed-tab.tsx`
- `components/sselfie/maya/maya-chat-interface.tsx`
- `app/api/maya/load-chat/route.ts`
- `app/api/maya/save-message/route.ts`
- `app/api/maya/update-message/route.ts`
- `lib/maya/feed-generation-handler.ts`
- `app/api/feed-planner/create-from-strategy/route.ts`

## 3. Why the old feed tab broke

### 3.1 Feed trigger detection lives in the disabled tab component

`MayaFeedTab` owns detection and processing of `[CREATE_FEED_STRATEGY: {...}]`.

That means:

- if the feed tab is disabled, feed trigger handling is effectively disabled too
- the main Maya photos/chat surface does not own feed creation
- feed generation is coupled to a UI branch that the user cannot see

### 3.2 Feed persistence is chat-type gated

`save-message` and `update-message` only allow `feed_cards` in feed-planner chats.

That means:

- a normal Maya chat thread cannot persist feed cards safely today
- inline feed inside the main Maya conversation will fail unless this storage rule changes

### 3.3 Feed hydration is also tab-gated

`load-chat` only processes feed cards when the requested chat type is the feed planner chat type.

That means:

- even if feed cards exist in a normal Maya chat, refresh/hydration would currently strip or ignore them
- the old design assumes concept cards live in photo chats and feed cards live in feed chats

### 3.4 Maya chat already renders tool cards, but feed is still treated as separate state

`MayaChatInterface` can render feed-related tool parts.

But the orchestration is split:

- feed creation logic lives in `MayaFeedTab`
- feed persistence logic lives in feed-only chat types
- main Maya chat still thinks feed is a separate tab concern

### 3.5 Feed creation already delegates to Feed Planner backend

`createFeedFromStrategyHandler()` already calls `/api/feed-planner/create-from-strategy`.

This part is useful and should stay.

The problem is not the feed creation backend. The problem is the chat orchestration and persistence layer around it.

## 4. Safe architecture target

The correct target is:

1. User asks Maya for feed help in the main chat.
2. Maya returns inline feed strategy/feed cards in that same chat thread.
3. Those feed cards persist in the same Maya conversation.
4. A follow-up CTA can open the full Feed Planner editor when needed.

This implies:

- feed becomes a chat tool, not a tab mode
- feed cards must be allowed inside standard Maya chats
- load/save/update logic must hydrate feed cards in the main Maya thread

## 5. Recommended implementation path

### Slice A: decouple feed trigger detection from `MayaFeedTab`

Move feed trigger detection/processing into a shared controller used by the main chat surface.

Do not keep feed creation trapped in `MayaFeedTab`.

Best candidates:

- extract from `components/sselfie/maya/maya-feed-tab.tsx`
- mount in `components/sselfie/maya-chat-screen.tsx`
- keep `lib/maya/feed-generation-handler.ts` as the backend bridge

### Slice B: let main Maya chats persist feed cards

Change persistence rules so feed cards can be saved in standard Maya chat threads.

Two safe options:

1. store feed cards in the existing `feed_cards` column for `maya` chats as well
2. convert feed cards fully into tool-marker/tool-part reconstruction and stop requiring feed-only chat types

Recommendation:

- keep `feed_cards` for now
- expand persistence rules to allow them in `maya` chats
- do not require a separate `feed_planner` Maya chat to save feed work

### Slice C: hydrate feed cards in main chat refresh/load

`load-chat` should rebuild feed cards for the main Maya chat the same way it rebuilds concept cards and video cards.

This is the refresh-resilience requirement.

Without this, inline feed will appear to work until reload, then disappear.

### Slice D: keep Feed Planner as the deep-edit handoff

After Maya creates a feed draft, show:

- inline preview in Maya chat
- clear CTA: `Open in Feed Planner`

Do not force the user to leave Maya just to see the first result.
Only hand off when they want deeper editing.

### Slice E: remove the tab dependency last

Only after Slices A-C are stable should the old feed tab code be removed.

Do not delete `MayaFeedTab` first.
Use it as extraction source material, then remove dead wiring after inline feed is proven.

## 6. What should not change in the first inline-feed pass

- Do not rewrite `/api/feed-planner/create-from-strategy`
- Do not merge Feed Planner and Maya routes
- Do not touch admin-only feed/reporting surfaces unless needed for compatibility
- Do not refactor concept card or video card persistence at the same time

## 7. Main regression risks

### Risk 1: concept cards and feed cards collide in the same assistant message

Need explicit tests for messages containing:

- text only
- concept cards only
- feed cards only
- concept cards plus feed cards
- feed cards plus video markers

### Risk 2: refresh loses inline feed state

Need tests for:

- save message
- update message
- load chat
- reload page

### Risk 3: wrong chat history shows wrong card type

If feed cards move into normal Maya chats, tab-based filtering assumptions must be removed carefully.

### Risk 4: duplicated feed creation

The old tab logic has duplicate-prevention behavior around trigger processing.
That logic must survive the move into shared chat orchestration.

## 8. Recommended test plan before shipping inline feed

1. Send a Maya message that produces `[CREATE_FEED_STRATEGY]`.
2. Confirm inline feed card appears in the main Maya chat.
3. Refresh the page.
4. Confirm feed card reloads from persisted chat state.
5. Send a normal concept-generation request in the same chat.
6. Confirm concept cards still work and do not overwrite the feed card.
7. Use `Open in Feed Planner`.
8. Confirm the handoff opens the correct feed.

## 9. Conclusion

The old Maya feed tab should not be re-enabled as-is.

It is the wrong architecture for the product decision now locked:

- Maya chat is the interface
- feed belongs inline in that conversation

The safe path is not "turn the tab back on".
The safe path is:

- extract the feed trigger/orchestration out of the tab
- allow feed cards in normal Maya chats
- hydrate them on reload
- keep Feed Planner as the deeper editor
