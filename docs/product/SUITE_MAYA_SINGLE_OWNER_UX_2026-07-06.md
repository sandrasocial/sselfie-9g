# SUITE Maya Single-Owner Creation UX

Date: 2026-07-06

Last updated: 2026-07-13

Status: Active product contract

## Summary

SUITE creation is now Maya-owned.

The Create tab is a calm starting surface. It owns the member's initial explicit format or intent,
then hands the workspace to Maya. It does not own selfie setup, visual-world selection, shot
selection, text-on-image decisions, or trained-model routing.

Maya owns the creation setup inside the chat drawer through inline cards and the reference manager.

## Product Rule

One creation decision should have one owner.

- Initial explicit format or intent: Create front door
- Explicit mid-conversation format change: Maya's `set_format` tool
- Selfie/reference images: Maya
- Style/vibe: Maya
- Shot choice: Maya
- Inspiration image: Maya
- Text on image: Maya
- Trained model versus selfie engine: Maya or Account only
- Finished outputs: Photos/Gallery
- Content ideas: Content tab hands context to Maya
- Account/settings/model management: Account

## Create Tab Responsibility

Create may:

- let the member type what she wants
- show one personalized **Maya recommends today** direction
- keep one direct text escape hatch
- disclose starter and format shortcuts behind **More ways to create**
- open Maya with a creation intent
- open Maya with the selfie manager as the first setup action

Create may not:

- mount the selfie/reference manager directly
- render a manual format grid
- render a Vault look grid as an active creation picker
- render a shot picker
- render text/font/overlay choices
- expose trained model as a primary creation CTA

## Maya Responsibility

Maya should ask only for the next needed detail.

The default expected flow is:

1. One recommended intent, or the member's explicit request
2. Selfie/reference source
3. Maya chooses one strongest real Vault visual world
4. Text/no-text and text style only when the output needs it
5. One recommended concept, with alternatives disclosed
6. Generate
7. Real download/use action
8. One contextual next recommendation, with other actions behind **More**

Style, inspiration, shot, and trained-model controls remain available as optional advanced paths.
They are not required before the first result. A normal topic, style, or brand answer must not
silently change the committed format.

The **Start with one selfie** card is a committed photo request, not an undecided blank session.
It opens the selfie manager, then hands the confirmed selfie to **Maya decides**. Maya chooses one
world and shows one recommended concept. The pre-result drawer does not expose format, style, shot,
shoot-size, model-source, extra-angle, inspiration, Change, or composer controls.

The member should not need to know which tab holds which setup tool before creating.

## Existing Tabs

Tabs remain useful, but they are not parallel studios.

- Create: starts Maya
- Photos: saved results and gallery actions
- Content: recommendations that hand context to Maya
- Library: owned products and assets
- Account: account, support, model management

## Implementation Notes

- `components/app-v3/visual-front-door.tsx` is intentionally simple and does not import `SelfieReferenceManagerModal`.
- `components/app-v3/maya-concierge.tsx` remains the only creation setup owner.
- `components/app-v3/concierge-context.tsx` supports `initialSetupAction: "selfie_manager"` so a Create CTA can open Maya and immediately show the full reference manager in the right layer.
- `components/app-v3/maya-inline-components.tsx` owns inline format/style/shot/result choices.
- `components/app-v3/aesthetics.ts` owns the quiet **Maya decides** default. The chat route resolves
  it to one real Vault world; it must not ask the member to choose between several styles first.
- The exact active workspace persists its latest generation, graphic text choices, generation
  source, and used/downloaded state. New chat and History are unavailable while generation or text
  refinement is in flight so an old result cannot land in another workspace.
- Naming stays in Memory and must not interrupt the pre-value path. The short brand interview may
  appear only after a result has been used or downloaded.

## Regression Tests

The contract is guarded by:

- `tests/app-v3-maya-first-ux.test.ts`
- `tests/app-v3-vibe-shot-picker.test.ts`
- `tests/maya-chat-selfie-manager.test.ts`
- `tests/maya-invisible-ai-first-result.test.ts`

These tests intentionally prevent the Create tab from becoming a second creation studio again.

## Manual QA

Before shipping changes to this flow, verify:

- Create page loads with one personalized recommendation and one direct text escape hatch.
- Advanced starts remain collapsed behind **More ways to create**.
- Tapping “Add one selfie” opens Maya and shows the reference manager there.
- Continuing from that manager goes directly to one Maya-chosen photo concept without setup cards.
- Maya chooses the default visual world without requiring style selection.
- Optional style and shot picking happens inside Maya only.
- Text-on-image decisions happen inside Maya only.
- The first concept is visible and additional directions remain behind **See more ideas**.
- Download starts a real browser download and only then records use.
- The result presents one recommended next action; graphic next actions re-enter the text gate.
- New chat and History stay disabled until an in-flight generation or refinement is complete.
- Photos and Content actions hand context into Maya without creating a separate setup surface.
- Account remains the place to find legacy trained-model access.
