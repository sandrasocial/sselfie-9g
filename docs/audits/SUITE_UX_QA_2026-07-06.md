# Suite UX QA — First-Session Confusion Audit (2026-07-06)

*Code-level walkthrough of a first-day member (woman 35-55, non-technical) through /app.
Method: read-only audit agent over the real JSX/handlers + same-day fixes by Fable.
Companion docs: `docs/product/SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md`,
`docs/research/CONVERSATIONAL_AI_UX_BEST_PRACTICES_2026-07-06.md`.
Guard tests: `tests/maya-session-and-inspiration-qa.test.ts`.*

## Fixed same day (this commit)

| # | Finding | Fix |
|---|---------|-----|
| 1 | **"Start new" resurrected the previous thread.** The draft save-effect ran one commit while rendered state was still the old thread but the session was already new — persisting the old conversation under the new session key; a render-time re-seed then restored it. | Save effect skips stale commits (`sessionChatIdRef` guard); local draft seeds once per mount; `openFresh` outranks any in-flight server-draft restore. |
| 2 | **Inspiration image looked ignored when a Vault style was chosen.** All single-photo jobs forced "close-recreation" (rebuild the inspiration), which lost the fight against the detailed collection brief — so the model followed the brief and the inspiration did nothing visible. Rejected URLs were also dropped silently. | New mode-aware semantics: inspiration-led sessions (maya-*) reconstruct the inspiration; style-led sessions (Vault collection) get `SSELFIE_INSPIRATION_STYLE_ACCENT` — the collection is the world, the inspiration steers pose, light, and mood. Rejected URLs now log. UI shows "· Inspiration in" + one line explaining how both combine. |
| 3 | **Copy-paste look (both directions).** Scene side was covered (`SSELFIE_ENVIRONMENT_INTEGRATION`), but nothing stopped the selfie's own outfit/pose/background/camera-angle from leaking into renders — the "pasted from her selfie" look. | New shared `SSELFIE_SELFIE_RESTYLE` rule ("identity is WHO she is, never what she wore") wired into both person-into-scene pipelines: suite prompt-compiler photo path + admin Shoot Studio. Demo-generator intentionally excluded (Sandra hand-writes those prompts). |
| 4 | **Memory modal read as blank/broken.** It hid `preferredOverlayStyle` entirely and an empty state said nothing about what Maya learns. | "What Maya learns as you create" section: learned text style shown with one-tap Forget; honest empty states for style + likeness notes. |
| 5 | First-photo CTA said "Start my brand shoot" for a single photo, with no cost. | "Create my photo · 1 credit" (matches the priced shoot cards). |
| 6 | Reference manager had three exit buttons (Close/Done/Continue) at the most fragile moment. | One way forward: "Continue with Maya" (top Close covers leaving). |
| 7 | No identity-safety reassurance at the upload button. | Trust line at the button: "Your selfie stays yours. Maya only uses it to keep your real face in every photo." |

## Open — next build queue (Codex-ready, ranked by churn impact)

1. **Credit balance in the Maya drawer header.** Balance lives only in Account; the pre-generation freeze ("will this use up my credits?") is the top activation blocker. Show balance once in the drawer + keep per-action costs on every spend button.
2. **"Continue history" should open the chat-history list** (explicit past threads) instead of just re-showing the in-memory drawer. "Start new" is now hard-guaranteed clean; make Continue equally explicit.
3. **"Let Maya decide" should preview before committing**: return the 2-3 style options as tappable cards *before* any generation planning, and rename toward "Not sure? Let Maya suggest looks."
4. **Legacy member welcome**: members with a trained model get a one-line "Your trained model came with you" and trained-model as their default source (today it's a quiet Account entry; their first selfie-engine result can read as a downgrade).
5. **Create-tab hierarchy**: one hero action (selfie card), typed box + starter chips demoted to a secondary row — three co-equal doors is choice overload.
6. **Weekly look surface**: the Monday email's look has no in-app home since the single-owner cleanup; give it a Maya starter chip.

## Standing verdicts (do not relitigate)

- Inspiration is kept semantically separate from identity end-to-end (server appends it after identity refs; "never her face") — correct, keep.
- The stack is current (AI SDK 6 `useChat`, no `ai/rsc`); confusion came from interaction logic, not framework age.
- Single-owner contract holds structurally; remaining violations are informational (cost shown inconsistently, three front doors), not architectural.
