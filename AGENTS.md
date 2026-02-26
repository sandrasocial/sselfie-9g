# AGENTS Instructions

1. Before starting new threads, read `docs/CODEX_CONTEXT.md` and mention the `State Summary Template` there so later turns can pick up the current state quickly.
2. For documentation authority and what is current vs archive, see **docs/README.md** and **docs/_CANONICAL/**.
3. Keep each thread focused on a single topic: scope files narrowly, perform targeted lint/test commands, and summarize the change + tests before closing the turn.
4. Automations stay read-only unless explicitly asked to edit. When diagnosing errors, cite `output/automation/*` logs so humans can review before the next change.
5. Follow the safety rules: adopt a test-first bug-fix approach (write a failing test or reproduction before fixing). Decline broad refactors unless the user explicitly requests a refactor.
6. Use the naming scheme: branches prefixed with `codex/`, and thread/worktree names follow `thread-{topic}` / `worktree-{topic}` for traceability.
7. For outward-facing copy (email, DM, landing, story, sales scripts), load and follow:
   - `docs/brand/VOICE_BIBLE.md`
   - `docs/brand/DO_DONT.md`
   - `docs/brand/MESSAGING_PILLARS.md`
8. Keep launch copy in draft mode until Sandra explicitly approves higher autonomy.
9. Before marking copy done, run a manual QA pass against the five checks in `docs/brand/VOICE_BIBLE.md` (voice match, clarity, emotional truth, action clarity, offer fit).
