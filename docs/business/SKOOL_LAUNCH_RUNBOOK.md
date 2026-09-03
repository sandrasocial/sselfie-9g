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

**`SKOOL_MEMBERSHIP_INGRESS_SECRET`** — generate once:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Identical in all three places, and **never rotated**. Every membership key and
every setup link is derived from it; changing it orphans every member provisioned
before the change.

**`NEXT_PUBLIC_SKOOL_PUBLIC_ACQUISITION_ENABLED=true`** — until this is on,
`/join/studio`, `/bio` and the marketing CTAs still sell the parallel Stripe €97
membership. With it on, `/join/studio` redirects to the Skool about page.

Redeploy after setting both.

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

## 5 · The unsolved one: renewals

Skool's Zapier has no documented recurring-payment trigger. So step 4 covers the
first month and nothing after it. PR #131 is explicit that *"the monthly-credit
promise must not be activated without an authoritative renewal/payment source."*

The launch copy promises ongoing monthly credits. Three honest ways to square it:

1. **Run the monthly command** (step 3). True while you are doing it. Fine for a
   first cohort; a chore at a few hundred members.
2. **Find an authoritative renewal source** — a Skool payments export, or their
   API if it exposes invoices — and drive `recordSkoolRosterObservation` plus a
   period grant from it. That is the real fix and it is not built.
3. **Change the promise** to the credits that come with joining, and treat ongoing
   top-ups as something granted rather than guaranteed.

Until one of those is chosen, the monthly run is the only thing making the copy
true.

---

## What exists but is not wired

- `recordSkoolRosterObservation()` — built, never called. No churn reconciliation,
  so access is never withdrawn automatically. Deliberate per PR #131.
- Maya's four lesson hand-backs return to the classroom root, not the exact
  lesson: the old classroom ids do not resolve in `/sselfie`. See the TODO in
  `lib/app-v3/maya/skool-handoff.ts`.
