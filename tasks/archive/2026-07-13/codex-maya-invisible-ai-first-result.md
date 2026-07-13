# CODEX — Maya Invisible AI: First Result + Return Integrity

**Status:** Complete
**Owner:** Stella / Codex
**Date:** 2026-07-13
**Release intent:** Make Maya feel like a decisive personal-brand partner, not a menu of AI tools.

## Evidence

The guided Maya cohort currently has 12 non-admin starters: 10 generated, 5 downloaded, and 4
selected a next action. Every measured next-action selection led to another successful generation
within two hours. The clearest measured leak is therefore after the first result, while code review
also found state bugs that can make clarification answers overwrite the selected format.

## Customer and single job

The customer is a nontechnical woman building a personal brand who does not want to learn prompts,
formats, styles, or workflow terminology. Her first job is:

> Turn one selfie into one useful piece of content, then know the next visibility action.

## Locked design direction

- Palette: existing Seasalt, White, Silver, Davy, Night tokens only.
- Type: existing Cormorant Garamond display plus the current sans UI face.
- Shape language: existing restrained rounded product UI.
- Signature element: one editorial **Maya recommends today** card grounded in her brand context.
- No new color, font, icon system, dashboard, agent roster, or parallel studio.
- No em dashes, emoji, hype language, or unsupported claims in new UI copy.

### Layouts considered

Option A exposes three equal goals immediately:

```text
What needs to move forward today?
[ Be visible today ] [ Promote my offer ] [ Create brand photos ]
[ Tell Maya what you need ................................ ]
```

Option B lets Maya lead, with manual control available but secondary:

```text
What needs to move forward today?
[ MAYA RECOMMENDS TODAY                                  ]
[ Specific idea, why now, and one Continue with Maya CTA ]

[ Tell Maya what you need ................................ ]
[ More ways to create ]
```

Choose **Option B**. Equal goal cards still make the member plan the software. Maya's recommendation
shows the value of memory and judgment before asking her to navigate anything.

### Generic-choice critique

A generic AI dashboard would add feature cards, gradients, badges, and a capability grid. That would
repeat the current problem. This release keeps one calm editorial recommendation, one free-text
escape hatch, and one disclosed advanced menu. The interface should feel quieter after the change.

## Required changes

### 1. One owner for format

- Front-door intent detection owns the initial explicit format.
- `set_format` owns an explicit mid-conversation format change.
- A reply to an inline topic, style, or brand question must preserve the committed format.
- Format clarification choices may explicitly commit a format.
- Add a typed `kind` to clarify prompts so the client does not guess from button text.
- Narrow ambiguous router patterns that currently interpret normal copy such as “set the text
  smaller” or “tell my story” as a new output format.

### 2. Maya recommends by default

- The returning-member Create surface shows at most one personalized recommendation from the
  existing Maya recommendation endpoint.
- Keep one text field as the direct escape hatch.
- Move weekly look and format shortcuts behind one **More ways to create** disclosure.
- Remove the duplicate large selfie card when a saved selfie already exists.
- Starting from a recommendation or shortcut uses **Maya decides** as the visual world.
- When Maya decides, she selects one strongest Vault direction from memory, brand profile, calendar,
  and the request. She must not ask the member to choose a style first.
- Preserve the full style, inspiration, shot, and trained-model tools as optional controls.
- If live aesthetics are slow or unavailable, use the bundled aesthetics and show a retry path. The
  only primary action must never be disabled without a visible prerequisite/recovery.

### 3. One recommendation before alternatives

- Show the first concept as **Maya recommends**.
- Put additional concept directions behind **See more ideas**.
- Do not auto-spend credits.
- Remove the automatic pre-value “name your agent” interruption. Naming remains available in Memory.

### 4. Make the result lead somewhere

- Primary result action is a real download/use action.
- Log `suite_image_downloaded` only after a browser download is initiated, not for merely opening a
  new image tab.
- Show one contextual recommended next action directly. Put edit, calendar, regenerate, and other
  formats behind **More**.
- A graphic next action must re-enter the required text/no-text gate instead of bypassing it.
- The brand interview may appear only after the result has been used/downloaded, not merely rendered.

### 5. Return integrity

- The launcher offers **Resume current**, **Start new**, and **View past chats** when an active draft
  exists.
- Resume restores the exact active workspace.
- Persist the authoritative last generation, graphic text choices, generation source, and value-used
  state with the current draft. Sanitize all restored fields.
- Past transcript history must not claim to restore a complete workspace. Label it honestly until
  versioned chat snapshots exist.

### 6. Mobile and accessibility hardening

- One scroll owner inside Maya.
- Add dialog semantics, Escape close, focus restoration/trap where practical in the live drawer.
- Add visible focus states, `aria-pressed`/`aria-current` for selected controls, and polite live regions
  for async errors/statuses touched by this release.
- Replace stray warm full-shoot colors touched in the flow with the locked cool tokens.

## Tests first

Add failing regression coverage before implementation for:

1. topic/style clarify replies preserve the committed format;
2. explicit format clarification commits the selected format;
3. default Maya path does not force style selection;
4. aesthetics failure has a fallback and retry;
5. returning Create shows one recommendation and hides advanced choices by default;
6. first concept is visible and alternatives are disclosed;
7. result has one primary next action and real download behavior;
8. graphic next action re-enters the text gate;
9. resume restores last generation, text choices, source, and value-used state;
10. naming does not interrupt the first result path.

## Non-goals

- Do not build a new content engine, AI agent team, scheduler, or offer builder.
- Do not change generation providers, credit pricing, checkout, trial terms, or entitlements.
- Do not replace Calendar, Gallery, Learn, Account, or legacy Studio.
- Do not broadly redesign the app shell.

## Verification gate

- Focused regression tests pass.
- Full automated suite and production build pass.
- 375 px and desktop first-session flows are verified in a real browser.
- No browser console errors on `/app` and the Maya flow.
- Existing users, payments, webhooks, credits, trial caps, and legacy Studio remain untouched.
- Deploy only through `main`, then verify the Ready production deployment.
