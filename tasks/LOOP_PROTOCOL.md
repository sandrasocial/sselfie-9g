# Claude ↔ Codex Loop Protocol

Established 2026-06-13 with Sandra. Autonomy level: **full auto, gate sends + money only.**
Goal: Claude and Codex operate as a closed loop through the repo, with no human relay.
Sandra approves only two things. Everything else flows.

## The shared bus — one writer per file (no contention)
The board and the status channel are SEPARATE files so the two agents never edit the same one.

- **Claude owns `tasks/**` (all specs + `tasks/README.md` the board).** Codex reads these but
  does NOT edit them, unless a specific spec explicitly tells it to touch a file under `tasks/`.
- **Codex reports status through its OWN channel, never the board:** the PR body + commit
  messages, and a machine-readable `tasks/.codex-status.json` (Codex is the only writer of
  that JSON; Claude only reads it). This is the one file under `tasks/` Codex may write.
- Claude reads Codex's status (PRs via `gh`, commits, `.codex-status.json`) and updates the
  board to match. The board's `OWNER` / `STATUS` / `NOTES` fields are maintained by Claude.

`tasks/.codex-status.json` shape (Codex writes, Claude reads):
```json
{
  "updated": "<ISO8601>",
  "tasks": [
    { "spec": "WEBHOOK-01-...md", "branch": "codex/webhook-01", "pr": 123,
      "status": "in-progress|in-review|blocked|done", "ci": "pending|green|red",
      "tier": 0, "notes": "what changed, tests run, blockers/questions" }
  ]
}
```

## The cycle

**Claude (runs on a schedule):**
1. `git pull`. Read the queue.
2. For each `codex / in-review` item: review the branch/PR diff. If it passes the gate
   (below) and isn't a gated carve-out, **merge to main**, mark `merged → done`, write a
   short taste/decision note.
3. Write or refine the next spec for the top unblocked item; set `OWNER: codex`,
   `STATUS: spec-ready`.
4. Run a fresh audit sweep (repo audit scripts + a targeted issue hunt). Dedupe against
   tracked tasks. Spec only confirmed, worth-doing issues. Cap new specs per cycle to avoid
   churn.
5. Update the queue. Commit + push.

**Codex (watches `tasks/`, reports via its own channel):**
1. `git pull`. Pick the top `spec-ready / OWNER: codex` task on the board.
2. Implement on a `codex/<task>` branch. Run `build` + `type-check` + `vitest` locally.
3. Open a PR (commit + PR body describe the change). Update `tasks/.codex-status.json` with
   the task's status/ci/notes. **Do not edit `tasks/README.md` or any spec.**
4. Next task.

## Merge tiers (what may auto-merge vs what gates)

**Tier 0 — auto-merge.** Normal product / UI / content / email-template / non-sensitive logic
changes. Claude auto-merges to main when **CI is green** (`next build`, `tsc --noEmit`,
`vitest`, lint all pass — `.github/workflows/ci.yml`). No green, no merge.

**Tier 1 — Claude explicit-approval gate (never silent auto-merge).** Payment/webhook code
(`lib/payments/**`, `app/api/webhooks/**`, Stripe API-shape), auth / access-gate / entitlement
logic, DB migrations / destructive SQL. Claude reviews the diff deliberately and explicitly
approves the merge, or escalates to Sandra on any doubt. CI green is necessary but not
sufficient here. (Why: the 2026-06-12 "Basil shape" incident lost real renewals via a
silently-merged webhook change — money/access code earns a real look.)

**Tier 2 — Sandra only.** Sending email/broadcasts + the final copy that will be sent; charging
users / changing prices / moving funds. Claude never approves these — it flags to Sandra
(`OWNER: sandra` + a NOTES question). Templates may be merged under tier 0/1; the SEND decision
and copy sign-off are always Sandra's.

## Deploy
Push to `main` only. No agent runs Vercel deploys or force-deploys. Production updates flow
through Vercel's own `main` → prod pipeline after a normal merge.

## Surface, don't auto-fix
Ambiguous calls, business judgment, brand/voice/doctrine decisions, or anything that would
need Sandra's intent → write a short question into the task NOTES and set `OWNER: sandra`.
Never guess on her behalf.

## Cadence (two-speed, not a fixed timer)
- My scheduled routine `claude-codex-loop` is a **15-minute heartbeat**, but each run
  **drains**: it keeps reviewing/merging/speccing while there is immediately-actionable work,
  and waits briefly in-run for CI to go green (re-check ~90s) instead of ending. So when work
  flows, a queue drains in one run; the 15-min tick is only the catch-all.
- CI is already event-driven (`ci.yml` on every PR/push) — the test gate never waits on a timer.
- Idle runs exit in seconds. Optional upgrade for near-real-time: a GitHub Action on PR-open
  that calls the claude.ai RemoteTrigger to wake the routine the instant Codex pushes.

## Anti-churn / idle
- Each cycle dedupes findings against open tasks; it does not re-file known issues.
- If the queue has no unblocked work and audits surface nothing new, the loop idles (cheap
  early exit) rather than inventing low-value work.

## Durable state
Everything the loop needs lives in the repo (`tasks/`, specs, code) + Claude's memory files.
A fresh scheduled run reconstructs context from these — no dependence on any one chat session.
