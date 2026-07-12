# AI-Assisted Community Management — RETIRED 2026-07-12

> Historical research only. Sandra removed the repo-hosted reply agent and unattended DM jobs.
> Do not use this document to restore them.

Deep research run (105 sub-agents, 22 sources fetched, adversarial verification) answering: how
do successful brands/creators actually use Claude for community management and social DM/comment
triage? Full context for the `sselfie-community-manager` skill and the `lib/ig-agent/` pipeline.

## Headline finding

**No documented case study exists of Claude being used specifically for Instagram/social
DM-and-comment triage at creator scale.** Anthropic's own customer-support materials showcase
enterprise contact-center customers (Intercom, Coinbase, DoorDash, TurboTax, Lyft) — not creators,
not social platforms. Vendor products claiming "Claude-powered social auto-reply" (Arahi,
NotPeople) did not hold up under verification and should not be treated as proof points. This
means SSELFIE's setup is not copying a proven playbook — it's a reasonable synthesis of adjacent,
verified best practice, not a battle-tested pattern for this exact use case.

## What is verified and does apply

1. **Anthropic's own escalation bar** (generic support-chat guidance, not social-specific): aim
   for 95%+ accuracy recognizing when a query needs a human. Useful as a target, not currently
   measured for our pipeline.
2. **Cross-industry escalation consensus** (Replicant, CX Today — not Claude-specific): always
   escalate on explicit human request, clear frustration, fraud/billing/refund signals, vulnerable
   customers, or when the AI detects its own failure (loops, repeated fallback, backend errors)
   rather than keep guessing. This closely matches — and, as of this research, was used to
   tighten — `lib/ig-agent/triage.ts`'s existing flag rules.
3. **"Draft, don't auto-send"** (Circle.so, community-platform vendor guidance): AI-drafted
   member-facing content should always get a human review pass before it goes out. Matches this
   repo's existing design exactly — `IG_AGENT_AUTO_SEND_ENABLED` stays off; every reply is a draft
   until Sandra approves it.
4. **Cautionary tales** (DPD's chatbot swearing at a customer after a guardrail update broke
   silently; Cursor's bot "Sam" fabricating a policy and causing a trust backlash once found to be
   AI): the concrete risk of full autonomy without review, and of an AI failure state going
   unnoticed. Directly motivated the 2026-07-09 fix where a generation failure (LLM/network error)
   was scoring high enough confidence to sail through unflagged — see `generationFailedDraft` in
   `lib/ig-agent/responder.ts`.
5. **Honest metrics** (Zendesk CEO, reported by CNBC): don't count deflections as "resolved."
   Applies to how `auto_handled` counts should be reported to Sandra — as "keyword automation
   already covered this," never as "fully resolved, nothing left to check."

## What changed in the repo as a direct result (2026-07-09)

- `lib/ig-agent/responder.ts`: added `generationFailedDraft()` — an actual AI/LLM failure now
  always flags (confidence 0.3, `intent: "generation_failed"`) instead of potentially scoring 0.82
  on a bare keyword match and sailing through unflagged with a canned response that also broke the
  "never paste prompt links yourself" rule.
- `lib/ig-agent/processor.ts`: surfaces `ai_generation_failed` as a distinct flag reason, separate
  from ordinary low-confidence drafts.
- `scripts/ig-community-manager.ts`: sorts `ai_generation_failed` alongside personal/urgent flags
  at the top of the triage list.
- `~/.claude/skills/sselfie-community-manager/SKILL.md`: escalation categories tightened to match
  the verified cross-industry list, with this doc as the citation trail.

## What this does NOT justify

- Turning on `IG_AGENT_AUTO_SEND_ENABLED`. Nothing in this research supports full autonomy for a
  solo creator's personal-voice brand — if anything it argues the opposite.
- Buying or trusting a third-party "Claude-powered social management" product — the two found
  making that claim did not verify.
- Treating "auto_handled" volume as a success metric on its own — it's a noise-reduction signal,
  not proof the community is fully served.
