# SSELFIE Skool — launch runbook

Written 2026-09-03, launch day. This is the ordered path from "she pays on Skool"
to "she is inside SSELFIE with 100 credits", including the part that is still
manual and why.

Group: `skool.com/sselfie` · Plan: `sselfie-skool-monthly` · €97/month → €197 from
25 September 2026.

---

## Where this stands

PR #131 ("Add feature-gated Skool membership provisioning") shipped the whole
server side and was merged 2026-09-01 **deliberately inert**. Its own description
says what was left:

> **Current external dependency:** Skool's official Zapier integration exposes
> `New Paid Member` for the initial successful paid join, but does not document a
> recurring renewal-payment trigger.
>
> **Next action:** connect the external Skool payment-event transport + dedicated
> signing secret, run controlled E2E, merge/deploy/activate only if every
> production gate is green.

Nothing is broken. The transport was parked and never connected. Everything
below closes that gap.

### Launch checklist — verified 2026-09-03

| # | Gate | State |
|---|------|-------|
| 1 | `SKOOL_MEMBERSHIP_INGRESS_SECRET` in Vercel **production** | ✅ already set 2026-09-01 — **do not regenerate** |
| 2 | Same secret in Vercel **preview** | ❌ absent |
| 3 | Same secret in local `.env.local` | ❌ absent — blocks `skool:grant` and `skool:preflight` |
| 4 | `NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED=true` | ❌ unset in production and preview |
| 5 | Redeploy after 2–4 (`NEXT_PUBLIC_` inlines at build) | ❌ not done |
| 6 | `RESEND_API_KEY`, `DATABASE_URL`, `NEXT_PUBLIC_SITE_URL` in production | ✅ all present |
| 7 | Migration 77 / `skool_membership_entitlements` in the live DB | ✅ wired — `vercel.json` `buildCommand` runs `run-production-launch-migrations.ts` (which calls migration 77) before `next build`, so every production deploy applies it. `skool:preflight` confirms against the live DB. |
| 8 | Zapier `New Paid Member` → ingress endpoint | ❌ not wired |
| 9 | Renewal policy | ✅ **decided** — monthly run (§5) |

`/join/studio` returned **200** on 2026-09-03 instead of redirecting to
`skool.com/sselfie/about`, which is the direct confirmation that gate 4 is off:
the bio link and every marketing CTA are selling the parallel Stripe €97
membership today.

---

## 1 · Preflight

```bash
pnpm skool:preflight
```

Prints GO or NO-GO and names each blocker in order. It reads your **local** env —
confirm production separately with `vercel env ls`.

---

## 2 · The two environment values

Both go in **Vercel production and preview**, and in `.env.local`.

### `SKOOL_MEMBERSHIP_INGRESS_SECRET` — already set. Do not generate a new one.

**Checked 2026-09-03: this secret already exists in Vercel Production**, set
2026-09-01 alongside the PR #131 merge. Earlier drafts of this runbook told you to
generate one. Do not. Running the generate command now and pasting the result over
the existing value **rotates the secret**, and every membership key and setup link
derives from it — that orphans anything already provisioned and invalidates any
setup link already sent.

What is still missing is the *mirroring*: the same value must also be in
**Preview** and in **`.env.local`**, and it is in neither. Copy the existing one
outward rather than making a new one:

```bash
vercel env pull .env.local --environment=production   # brings the live value down
vercel env ls preview | grep SKOOL                    # confirm; add it there if absent
```

Generate a value **only** if `vercel env ls production` shows no
`SKOOL_MEMBERSHIP_INGRESS_SECRET` at all:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Identical in all three places, and **never rotated** thereafter.

### `NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED=true` — not set anywhere yet

Confirmed off in production on 2026-09-03: `https://www.sselfie.ai/join/studio`
returns 200 and renders, instead of redirecting to the Skool about page. While it
is off, `/join/studio`, `/bio` and the marketing CTAs all still sell the parallel
Stripe €97 membership — **the bio link is pointing at the wrong offer.**

```bash
printf 'true' | vercel env add NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED production
printf 'true' | vercel env add NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED preview
```

This is a `NEXT_PUBLIC_` value, so it is inlined at build time: **redeploy or it
does not take effect.** Setting the variable alone changes nothing.

```bash
vercel --prod
```

The Vercel project `sselfie-9g` is git-linked to `sandrasocial/sselfie-9g` with
`main` as the production branch, so **any merge to `main` also triggers a
production deploy** and picks up the new values. Merging a PR works as the
redeploy; you do not need the CLI for this step.

> **The Vercel MCP connector cannot do any of this.** It exposes seven tools —
> project protection, web analytics, pause/unpause, git-project creation — and
> none of them read or write environment variables or trigger a deploy. Env vars
> are the CLI or the dashboard, nothing else.

Verify it landed — this should redirect to `skool.com/sselfie/about`, not 200:

```bash
curl -s -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.sselfie.ai/join/studio
```

---

## 3 · Provisioning members

Until Zapier is wired (step 4), each paid member is provisioned by hand. This is
manual, not broken — it runs the exact same code the endpoint runs.

```bash
pnpm skool:grant her@email.com                      # one
pnpm skool:grant a@x.com b@y.com c@z.com            # several
pnpm skool:grant --file=members.txt                 # one email per line
pnpm skool:grant --list                             # who is already done
pnpm skool:grant her@email.com --dry-run            # preview
```

Each member gets an account, the Skool entitlement, 100 credits, a ledger row,
and a signed setup email. Members who already have a password skip the email and
just log in.

**Idempotency.** The billing period defaults to the first of the current month, so
re-running inside the same month grants nothing. That is deliberate: a day-based
key would hand the same member 200 credits if you ran it twice in a month.

**The monthly renewal run** — until there is a renewal source, on the 1st:

```bash
pnpm skool:grant --list                    # copy the emails still active on Skool
pnpm skool:grant --file=members.txt        # grants the new period to everyone
```

**If a member fails with a duplicate-account error**, she has two `users` rows
with different email casing. Run `pnpm audit:close-out`, merge them toward the row
holding her subscription and images, then re-run. Do not skip this — provisioning
the wrong row gives her credits on an account she cannot log into.

---

## 4 · Automating the first join (Zapier)

Skool's official Zapier integration fires **New Paid Member** on the first
successful paid join.

- **Trigger:** Skool → New Paid Member
- **Action:** Code by Zapier (JavaScript)
- **Input data:** `email` = the member's email from the trigger;
  `secret` = `SKOOL_MEMBERSHIP_INGRESS_SECRET`

```js
const crypto = require('crypto');

const body = JSON.stringify({
  schemaVersion: 1,
  source: "skool",
  eventType: "membership.present",
  groupId: "sselfie-photo-club-2569",
  planCode: "sselfie-skool-monthly",
  observedAt: new Date().toISOString(),
  privateProvisioning: { email: inputData.email }
});

const ts = String(Math.floor(Date.now() / 1000));
const sig = "v1=" + crypto
  .createHmac("sha256", Buffer.from(inputData.secret, "base64url"))
  .update(`${ts}.${body}`, "utf8")
  .digest("base64url");

const res = await fetch("https://www.sselfie.ai/api/orchestration/skool/paid-member", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "x-sselfie-timestamp": ts,
    "x-sselfie-signature": sig
  },
  body
});

output = { status: res.status, body: await res.text() };
```

Verified against the live verifier and envelope normalizer before being written
down. Expect `200`. `401` means the secret differs between Zapier and Vercel;
`503` means the secret is not set in Vercel at all; `422` means the group or plan
code does not match.

`groupId` stays `sselfie-photo-club-2569`. That is the **internal entitlement
namespace**, not the public URL — it is baked into every membership key, and
changing it orphans existing members. The public URL lives in
`lib/skool/public-acquisition.ts` and is `skool.com/sselfie`.

The server derives the membership key, billing period and dedupe key from the
email and the secret, so the payload carries no ids and replays are safe.

---

## 5 · Renewals — decided: option 1, the monthly run

**Sandra's decision, 2026-09-03: the monthly-credit promise stays in the copy.**

That closes the question PR #131 left open, and it does so by committing to the
operational answer rather than the engineering one. The copy is true *because the
monthly run happens*, not because a system guarantees it. Skool still has no
documented recurring-payment trigger, so step 4 covers the first join and nothing
after it. Nothing below is automatic.

**What that obliges, every month, on the 1st:**

```bash
pnpm skool:grant --list                    # who is provisioned already
# reconcile against the active member list in Skool, one email per line:
pnpm skool:grant --file=members.txt
```

The grant is idempotent within a calendar month (the billing period defaults to
the 1st), so a re-run inside the same month grants nothing. A *missed* month is
the failure mode that shows up — as a member who paid and did not get credits.

**Reconciliation is manual and it matters.** `--list` reports who SSELFIE has
provisioned; it cannot know who is still paying on Skool. Anyone who churned must
be dropped from `members.txt` by hand, because `recordSkoolRosterObservation()`
is built but never called and access is never withdrawn automatically.

**This is a commitment with a shelf life.** It is fine for a first cohort and a
chore at a few hundred members. The real fix remains unbuilt and unchanged:

- **The durable fix** — find an authoritative renewal source (a Skool payments
  export, or their API if it exposes invoices) and drive
  `recordSkoolRosterObservation` plus a period grant from it. Revisit this the
  first month the manual run is late, or when the roster outgrows a text file.
- **The retreat** — if the run stops happening, the honest move is to change the
  promise to credits-on-joining rather than let the copy outrun the delivery.

### Where to run it from

`pnpm skool:grant` lives on `main`. The working clone at `~/ACTIVE/sselfie-9g` is
checked out on `codex/fresh-start-reset`, which is ~121 commits behind main and
does **not** contain these scripts. Run the monthly command from a checkout of
`main` — the dedicated worktree at `.claude/worktrees/skool-launch` exists for
exactly this and has its dependencies installed.

Its `.env.local` must carry the **production** `SKOOL_MEMBERSHIP_INGRESS_SECRET`.
A local secret that differs from Vercel derives different membership keys, and
the member gets an entitlement and a setup link the live endpoint will not
recognise.

---

## Landmine: `vercel.json` differs between branches

`vercel.json` on `main` overrides the build:

```
"buildCommand": "pnpm exec tsx scripts/run-production-launch-migrations.ts && pnpm exec next build"
```

That is the only thing that applies migration 77. On `codex/fresh-start-reset` —
the branch the working clone sits on — `vercel.json` contains **crons only, no
`buildCommand`**, so the build falls back to `package.json`’s plain `next build`
and no migration runs.

Production deploys from `main`, so this is currently harmless. It stops being
harmless the moment anything from that branch becomes the production source:
the Skool endpoint would come up against a database with no
`skool_membership_entitlements` table. If `codex/fresh-start-reset` is ever
merged or promoted, carry `main`’s `buildCommand` across first.

---

## What exists but is not wired

- `recordSkoolRosterObservation()` — built, never called. No churn reconciliation,
  so access is never withdrawn automatically. Deliberate per PR #131.
- Maya's four lesson hand-backs return to the classroom root, not the exact
  lesson: the old classroom ids do not resolve in `/sselfie`. See the TODO in
  `lib/app-v3/maya/skool-handoff.ts`.
