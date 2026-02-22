# TASK V-03 — Hide Mode Complexity from Users
Priority: High · Do after V-02 is complete
Estimated time: 2-3 hours
Context: Audit found users confused by Classic/Pro/Feed mode labels.
Maya's intelligence works — the UX labelling is the problem.

## Problem
Users see "Classic Mode" and "Pro Mode" and don't know which to choose.
This creates friction before they've even started.
The modes are a technical distinction that users should never have to think about.

## Goal
Users never see the words "Classic mode" or "Pro mode" again.
Maya decides which mode to use based on what the user asks for.
The experience feels like one intelligent assistant, not a tool with settings.

## What to change

### UI changes
- Remove Classic/Pro mode toggle/selector from user-facing interface
- Remove any mode labels visible to users in Maya chat
- Remove Feed tab (already disabled — clean it up completely)
- Maya chat should look like one unified chat interface

### Logic changes
Maya auto-selects mode based on context:
- User uploads a reference image → use Pro mode automatically
- User has a trained LoRA model → use Classic mode automatically
- User asks for content calendar or strategy → use feed/planning context
- Default (no reference, no LoRA) → use Pro mode

Add this routing logic to Maya chat route:
```
function autoSelectMayaMode(user, messageContext):
  if messageContext.hasReferenceImage → 'pro'
  if user.hasTrainedLoraModel → 'classic'
  if messageContext.isContentPlanning → 'planning'
  default → 'pro'
```

### What stays the same
- All generation pipelines stay exactly as they are
- Classic and Pro mode code stays — just hidden from users
- Admin can still see mode labels in admin dashboard
- Sandra can still see mode in admin for support purposes

## Technical notes
- Feature flag: FEATURE_UNIFIED_MAYA_UI = true
- Do NOT remove Classic/Pro backend code — only hide from user UI
- Do NOT change Maya system prompts
- Do NOT change generation routes
- Current members must see no disruption

## Acceptance criteria
- [ ] No mode labels visible to regular users in Maya UI
- [ ] Feed tab removed from UI completely
- [ ] Auto-mode selection logic working for all three cases
- [ ] Admin dashboard still shows mode labels
- [ ] All generation routes still working
- [ ] Feature flag controls rollout
- [ ] Existing member sessions unaffected
