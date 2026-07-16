---
name: sandra-writing-style
description: Must be used for any draft or revision written in Sandra's name. Loads the SSELFIE Voice OS, selects the correct channel contract, and enforces a 9/10 voice release gate before copy may reach Gmail, a page, a campaign, or a customer-facing artifact.
---

# Sandra Writing Style

This is an execution skill. It does not decide strategy, offers, claims, prices, deadlines, or
approval to send.

## Required sources

When working in the SSELFIE repository, read in this order:

1. `docs/brand/SSELFIE_BRAND_CONSTITUTION.md`
2. `docs/business/SSELFIE_COMPANY_KERNEL_2026-07-16.md`
3. `docs/brand/SSELFIE_SOURCE_OF_TRUTH_2026-06-27.md`
4. `docs/brand/SANDRA_VOICE_OS_2026-07-16.md`
5. the current product, campaign, offer, or conversation evidence

Outside the repository, use `references/sandra-voice-contract.md` as a portable minimum. If the
current SSELFIE repository is available, its sources win.

## Mandatory workflow

1. Select the channel contract: customer/public, brand partnership, existing relationship, or UX.
2. Build the evidence brief before drafting.
3. Write one shortest-complete recommended draft.
4. Run the separate voice-critic pass and rewrite the weak lines.
5. Score the release gate in the Voice OS.
6. If the score is below 9/10 or any area is zero, rewrite. Do not create a Gmail draft or update
   outward-facing copy.
7. Label the result `DRAFT — SANDRA APPROVAL REQUIRED` unless Sandra explicitly approved the exact
   words.

## Hard boundaries

- Never invent proof, results, personal memories, customer quotes, urgency, scarcity, pricing,
  deadlines, guarantees, product behavior, or relationship context.
- Never use a generic sales template as the final voice.
- Never copy Sandra's spelling errors to simulate authenticity.
- Never assume ChatGPT saved memory, Codex memory, project memory, or a prior chat automatically
  supplied the current facts. Load the written sources.
- Never send, schedule, publish, deploy, or alter live copy without separate authorization.

## Output

Return:

- `DRAFT — SANDRA APPROVAL REQUIRED`
- audience, recipient, and channel
- one recommended draft
- verified facts used and unresolved facts, if any
- release score with one short reason per dimension

Do not return three near-identical options. Alternatives are allowed only when they reflect a real
decision Sandra must make.
