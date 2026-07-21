# Maya Invisible AI: First Result Contract

**Locked:** 2026-07-13
**Applies to:** Live member app at `/app`
**Purpose:** Help a nontechnical member turn one selfie into one useful piece of content, then make the next visibility move without learning SSELFIE's internal tools.

This contract extends `SUITE_MAYA_SINGLE_OWNER_UX_2026-07-06.md`. It does not govern legacy `/studio`.

## Evidence and measured constraint

The measured guided-Maya cohort had 12 non-admin starters:

- 10 generated.
- 5 downloaded.
- 4 selected a next action.
- All 4 next-action selections produced another successful generation within two hours.

The product must therefore protect the working guided path and improve the handoff from first result to download, next action, and return. It must not add another creation system.

## Maya operating layer member jobs

The member experience is measured through five jobs. These are product outcomes, not new tabs,
agents, dashboards, or generation systems:

1. **Decide what to post.** Leave with one clear post to finish next.
2. **Create content.** Turn an intention into one usable image, caption, or combined result.
3. **Finish a selected Calendar post.** Complete the exact post the member selected without losing its context.
4. **Improve a grid.** Make one coherent visual or planning improvement to the current grid.
5. **Learn the next useful thing.** Use one relevant lesson or part of Sandra's method, then take one practical action.

### Phase 0 member-job baseline

The table records the shortest observed authenticated production path on 2026-07-21. It separates
member interaction from provider latency and is a comparison baseline, not a claim that the current
journey is acceptable. A primary decision is a click or choice that advances the job; ordinary
navigation and optional exploration are excluded.

| Member job                      | Entry surface and observed path                                       | Primary decisions |         Modal or drawer opens | Surface handoffs |              Context repairs | Interaction time     | Provider wait | Observed completion                                |
| ------------------------------- | --------------------------------------------------------------------- | ----------------: | ----------------------------: | ---------------: | ---------------------------: | -------------------- | ------------- | -------------------------------------------------- |
| Decide what to post             | Calendar → What needs me → recommended post sheet                     |                 2 |                             1 |                0 |                            0 | Manual baseline only | Excluded      | A specific post is open                            |
| Create content                  | Create → Maya recommendation → Start with Maya → approve concept      |                 3 |                             1 |                1 |                            0 | Manual baseline only | Excluded      | Creation is ready for explicit credit confirmation |
| Finish a selected Calendar post | Calendar → post sheet → Create with Maya → resume/start choice → Maya |                 4 | 2 competing surfaces observed |                1 | 1 possible stale-task repair | Manual baseline only | Excluded      | Maya is open, but task ownership is ambiguous      |
| Improve a grid                  | Calendar → Visual direction → choose direction → save                 |                 3 |                             1 |                0 |                            0 | Manual baseline only | Excluded      | Current grid direction is saved                    |
| Learn the next useful thing     | Learn → choose goal → recommendation → Use it with Maya               |                 3 |                 1 Maya drawer |                1 |                            0 | Manual baseline only | Excluded      | A generic lesson handoff reaches Maya              |

Phase 0 does not make paid provider calls. Later measurements must report provider wait separately
so model latency is never misreported as member decision time.

## Locked customer journey

1. The returning Create surface shows at most one personalized **Maya recommends today** card.
2. A text field remains the direct escape hatch for a member who already knows what she needs.
3. Weekly looks and format shortcuts remain available under **More ways to create**.
4. Maya chooses the strongest visual direction by default.
5. The first concept is shown as **Maya recommends**. Additional concepts stay under **See more ideas**.
6. Maya does not spend a credit until the member chooses to create.
7. A finished result has a real use action, followed by one contextual **Maya recommends next** action.
8. Other formats and secondary actions stay behind **More**.

If a member has no saved selfie, adding or choosing one remains the visible prerequisite. When a saved selfie exists, Create must not show a duplicate large selfie card.

### First-selfie shortcut

**Start with one selfie** is already an explicit photo decision. Its locked path is:

1. Open Maya's selfie manager.
2. Add or choose one selfie.
3. On **Continue with Maya**, Maya chooses one strongest Vault world and prepares one recommended photo concept.
4. The member chooses whether to spend one credit on that concept.

This path must not ask for format, style, shot, shoot type, shot count, photo engine, inspiration,
or extra identity angles before the first result. The refinement composer and **Change** setup strip
also remain hidden until the first result. Advanced controls are preserved for intentional use
after value. A previously saved inspiration image must not attach itself to a fresh session.

## Ownership rules

### Format

- Front-door intent detection owns the initial explicit format.
- The server `set_format` tool owns an explicit format change during an existing conversation.
- `ClarifyPrompt.kind` is the typed boundary between `format` and `detail`; the client must not guess from button copy.
- Selecting a format clarification commits that format.
- Answering a topic, style, brand, or other detail question preserves the already committed format.
- Ordinary refinement copy must not silently switch formats.

### Visual direction

- `Maya decides` is the default visual world for recommendations, text starts, and simple shortcuts.
- Maya chooses one strongest real Vault direction using the request, brand profile, memory, recent activity, and content calendar.
- Maya must not ask the member to choose a style before showing value.
- Style, inspiration, shot, and trained-model controls remain optional advanced tools.
- The first-selfie shortcut keeps those advanced tools out of view until result one.
- If live aesthetics fail, bundled aesthetics remain usable and the interface shows a retry path.

Normal style, inspiration, and shot choices update the current session in place. They preserve the chat, generated cards, and `startedAt`; they must not open a different workspace or restart the member's session. Only **Start new** creates a new workspace.

## Result and value contract

- A single image or video uses a real **Download** action. A multi-slide result uses **View all slides**, with real per-slide downloads in the lightbox.
- Vercel Blob assets use its attachment download URL. Other external assets are fetched into an object URL when possible.
- A preview tab is not a download. `suite_image_downloaded` is recorded only after the browser download has been initiated successfully.
- Download events carry `source`, `format`, and stable `asset_id` when available.
- Review eligibility counts distinct downloaded assets. Repeated downloads of the same asset do not advance the third-download review prompt.
- Naming Maya remains available in Memory and must not interrupt the first-result path.
- The brand interview may appear only after `valueUsed` is true from an actual download, not merely after a render.

After a result, one contextual next-format recommendation is visible. Its alternatives are disclosed under **More things Maya can make**. Edit, calendar, regenerate, and prompt inspection remain secondary under **More**.

A recommended graphic next action must return to the explicit text choice:

1. With text or without text.
2. If with text, choose the text style.
3. Then generate.

It must never reuse stale text settings or bypass this gate.

## Resume and persistence contract

When an active draft exists, the launcher offers:

- **Resume current**
- **Start new**
- **View past chats**

Resume restores the exact active workspace. The persisted, sanitized snapshot contains:

- Session: aesthetic, output format, reference selfie, video source, graphic text, seed, creation intent, shot direction, generation source, initial setup action, creation idea, and `startedAt`.
- Draft: `chatId`, messages, generation-card state, `generatedOnce`, setup state, `lastGeneration`, `textOverlayMode`, `textStyleChoice`, `textStyleAdjustments`, `generationSource`, and `valueUsed`.

`lastGeneration` is the authoritative record of the latest completed format, image count, style, concept, inspiration use, and trained-model use. Restored data is sanitized before use. A stale save from an older thread must not overwrite a newly started session.

Past chat history restores the conversation only. It must not claim that files or a complete generation workspace were restored; finished files remain in Photos.

## Mobile and accessibility contract

- Maya has one scroll owner at a time: setup scrolls while setup is open; the conversation thread scrolls after setup closes.
- The drawer, selfie manager, and image lightbox use dialog semantics.
- Escape closes the active surface predictably.
- Focus moves into an opened dialog, is trapped where practical, and returns to the prior control on close.
- Selected controls expose selection state with `aria-pressed` or the appropriate current-state attribute.
- Touched async errors and statuses use visible recovery copy and polite announcements.
- The drawer follows the mobile visual viewport when the on-screen keyboard opens.
- The flow uses the existing Seasalt, White, Silver, Davy, and Night product tokens only.

## Behavioral analytics contract

Behavior events are not revenue truth. Keep these stable so the activation funnel can compare cohorts:

| Event | Required decision fields |
| --- | --- |
| `suite_home_viewed` | `cohort`, `hasSelfie`, `section` |
| `first_action_selected` | `cohort`, `action` |
| `suite_maya_inline_started` | `cohort`, `action`, `format`, `confidence` |
| `suite_intent_detected` | `cohort`, `action`, `format`, `source`, `confidence` where available |
| `suite_inline_choice_selected` | `cohort`, `action`, intent fields, relevant choice identifier |
| `suite_concepts_emitted` | `format`, `count`; repair/failure diagnostics when applicable |
| `suite_image_generated` | `source`, `format`, `rerun`, `mode`, `aestheticId`, `conceptTitle`, `images`, `ai_image_id`, `ai_image_ids` |
| `suite_generation_path_completed` | `cohort`, `format`, `source` |
| `suite_image_downloaded` | `source`, `format`, `asset_id` when available |
| `suite_next_action_selected` | `cohort`, `kind`, `selection`, `from_format`, `to_format`, `style_reference` |
| `suite_maya_recovery_shown` | `cohort`, `format`, `reason` |

`selection` distinguishes the visible recommended next action from an alternative opened under More. Upload events must be logged only after a successful upload.

## Metrics to watch

Review these by member/trial source and by the creation entry path:

1. Starter to successful generation.
2. Successful generation to distinct asset download.
3. Download to next-action selection.
4. Recommended next action versus More alternatives.
5. Next-action selection to second successful generation within two hours.
6. Day-7 and week-two return creation after the first downloaded result.
7. Recovery shown, generation failure, and chat abort rates by format.

The initial benchmark for next-action quality is 4 of 4 selections producing another successful generation within two hours. Preserve that behavior while growing the measured cohort; do not interpret four people as proof of scale.

## Non-regression rules

Do not reintroduce:

- Pre-value agent naming or brand interviews.
- A required style grid before Maya can create.
- Format, style, shot-director, model-source, or extra-angle controls in the first-selfie shortcut.
- Silent reuse of an old inspiration image in a fresh creation.
- Equal capability cards that make the member plan the workflow.
- Multiple primary recommendations at the front door or after a result.
- A Vault grid that competes with the single front-door recommendation. Vault browsing stays a quiet, member-explicit escape into Maya's existing picker.
- Fake downloads, preview-tab downloads counted as success, or repeated-click review inflation.
- Format changes inferred from ordinary detail answers.
- Style or shot choices that replace the active workspace.
- Automatic credit spend.
- A new agent roster, content engine, scheduler, dashboard, or parallel studio.

Every future Maya change must answer one question: does it make the member more visible, trusted, or paid with less workflow learning? If not, it does not belong in the first-result path.
