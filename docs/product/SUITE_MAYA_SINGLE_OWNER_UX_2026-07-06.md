# SUITE Maya Single-Owner Creation UX

Date: 2026-07-06

Status: Active product contract

## Summary

SUITE creation is now Maya-owned.

The Create tab is a calm starting surface. It does not own selfie setup, style selection, shot selection, text-on-image decisions, or trained-model routing.

Maya owns the creation setup inside the chat drawer through inline cards and the reference manager.

## Product Rule

One creation decision should have one owner.

- Format: Maya
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
- show starter chips
- open Maya with a creation intent
- open Maya with the selfie manager as the first setup action
- show a visual orientation card

Create may not:

- mount the selfie/reference manager directly
- render a manual format grid
- render a Vault look grid as an active creation picker
- render a shot picker
- render text/font/overlay choices
- expose trained model as a primary creation CTA

## Maya Responsibility

Maya should ask only for the next needed detail.

The expected flow is:

1. Format or intent
2. Selfie/reference source
3. Style or inspiration image
4. Shot choice when a collection needs it
5. Text/no-text and text style for graphic formats
6. Generate
7. Result actions

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

## Regression Tests

The contract is guarded by:

- `tests/app-v3-maya-first-ux.test.ts`
- `tests/app-v3-vibe-shot-picker.test.ts`
- `tests/maya-chat-selfie-manager.test.ts`

These tests intentionally prevent the Create tab from becoming a second creation studio again.

## Manual QA

Before shipping changes to this flow, verify:

- Create page loads with one primary Maya start surface.
- Tapping “Add one selfie” opens Maya and shows the reference manager there.
- Starter chips open Maya and wait for the needed next step.
- Style and shot picking happen inside Maya only.
- Text-on-image decisions happen inside Maya only.
- Photos and Content actions hand context into Maya without creating a separate setup surface.
- Account remains the place to find legacy trained-model access.
