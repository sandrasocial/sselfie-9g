# Calendar mobile reorder proposal

Status: proposal only. Sandra approval required before implementation.

## Recommendation

Use tap-to-select, then tap-to-swap on phones.

1. The member long-presses or taps a small `Move` action on a completed calendar tile.
2. The selected tile receives one clear outline and the calendar says `Choose where to move it`.
3. She taps a second tile.
4. The two posts swap immediately, with `Undo` available in a toast.

## Why this is the smallest safe fallback

- It does not depend on HTML5 drag-and-drop, which is unreliable on touch screens.
- It uses the existing two-post swap endpoint and desktop ordering behavior.
- It avoids tiny arrow controls and repeated taps across a 9 or 12-post grid.
- It preserves normal tap-to-open behavior until the member deliberately enters move mode.
- Undo is safer and faster than adding a confirmation dialog to every move.

## Accessibility and trust requirements

- The selected tile must be identified visually and with `aria-pressed`.
- A visible `Cancel move` action must always be available.
- The destination must be a full tile target, not a small icon.
- Saving failure must restore the original order and show an in-app error.
- Desktop drag-and-drop remains unchanged.

## Approval decision

Approve or reject the interaction before any mobile reorder UI is built. The customer-facing
labels above are drafts and must be reviewed with the live 375px design.
