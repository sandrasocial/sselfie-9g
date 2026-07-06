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

## Open list — ALL BUILT same day (second commit)

1. ✅ **Credit balance in the Maya drawer.** Shown in the drawer header ("N credits" / "Unlimited credits"), fetched on open, refreshed from every generation response. Per-action costs already on spend buttons.
2. ✅ **"Continue history" opens the real chat list.** New `openHistory()` context channel; the launcher's Continue shows past threads to pick from. "Start new" is hard-guaranteed clean.
3. ✅ **"Not sure? Let Maya suggest looks."** Renamed tile + server rule: for maya-decides sessions she must FIRST offer 2-3 named Vault looks as taps (ask_clarify) and may not emit concepts until one is picked.
4. ✅ **Legacy welcome** — "Your trained model from Studio came with you" sits at the Photo source choice. *Deliberate divergence from the audit's rec:* selfie engine stays the DEFAULT — flagship doctrine (gpt-image-2 reference edits; LoRA kept as opt-in, not promoted). If legacy likeness complaints persist, revisit per-member defaulting.
5. ✅ **Create-tab hierarchy**: without a saved selfie the selfie card leads and typing/chips are secondary; with a selfie the typed start leads (her power path).
6. ✅ **Weekly look chip**: "New this week: {name}" starter chip opens Maya with the look preloaded; format stays Maya's question. No vault grid returned to Create.

## Standing verdicts (do not relitigate)

- Inspiration is kept semantically separate from identity end-to-end (server appends it after identity refs; "never her face") — correct, keep.
- The stack is current (AI SDK 6 `useChat`, no `ai/rsc`); confusion came from interaction logic, not framework age.
- Single-owner contract holds structurally; remaining violations are informational (cost shown inconsistently, three front doors), not architectural.
