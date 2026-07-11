# SCALE-READY-01 - Loose Threads Before The Codebase Feels Clean

OWNER: codex

This is not one giant refactor. It is the current list of practical loose threads that would make
the codebase safer to scale.

## Highest Priority

1. **DM live QA**
   - Prove ManyChat inbound -> admin reply -> Instagram received.
   - Prove native IG manual reply still works.

2. **Shoot Studio live drop QA**
   - Publish enough real shoots to verify Vault/freebie/Library/Maya/drop-email surfaces.
   - Confirm email previews use newest shoot images.

3. **Admin Maya QA**
   - Confirm Maya uses weekly brief data and admin memory correctly.
   - Confirm handoff buttons/workflows are clear in the live admin chat.

## Codebase Cleanup

4. **Reduce task/spec confusion**
   - ✅ 2026-06-14: Current task board was cleaned; stale/completed specs were archived.
   - Keep only current specs in `tasks/`.
   - Archive or delete old planning docs once their current truth is captured.
   - Never let the task board become a second stale product roadmap.

5. **Legacy surface deletion pass**
   - The repo still contains legacy `/studio`, legacy Maya routes, and old funnel surfaces.
   - Use `CLAUDE.md` dead-code map before deleting anything.
   - Do this only after the current app, payments, and admin flows stay stable.

6. **Lint-warning diet**
   - Lint exits with 0 errors, but the repo still has many warnings.
   - Prioritize warnings in active surfaces only: `/app`, `/admin`, checkout, webhooks, emails.
   - Do not spend time polishing dead routes before the legacy deletion pass.

7. **Payment analytics follow-up**
   - Webhook extraction is done enough for safety.
   - Optional follow-up: add one universal purchase analytics event after confirming all handlers
     are stable. Money truth must still come from `stripe_payments` or Stripe, never analytics.

8. **Admin data / entitlement hygiene**
   - ✅ 2026-06-14: Active test-mode subscription rows are currently 0.
   - ✅ 2026-06-14: Admin SUITE trial counters now exclude test-mode trial and conversion rows.
   - Remaining: subscriptions still mixes memberships, trials, and one-time ownership rows. Treat
     that as a data-model smell; do not count a row as membership without a canonical helper.

9. **Vault drop safety**
   - ✅ 2026-06-14: Live drop tracking tables exist in production.
   - ✅ 2026-06-14: The secret `/api/vault/email-drop` start endpoint now delegates to the same
     admin-reviewed preview/live-run workflow, preventing one new Shoot Studio collection from
     being mixed with old static pending collections.
   - Remaining: strict live QA still needs one more published Shoot Studio collection.

10. **ManyChat flow hygiene**
   - Audit live ManyChat flows, buttons, URLs, UTMs, keywords, tags, and stale automations.
   - This is operational cleanup, not app code, unless broken links or tracking gaps are found.

11. **Monitoring discipline**
   - Keep using `/admin/webhook-review`, Daily Sandra Briefing, and content brief as the main
     operational view.
   - Avoid creating more dashboards unless an existing one is removed or merged.

## Not Active Right Now

- Vault Club buildout remains gated.
- Broad redesigns are not active until current funnels and admin workflows are stable.
- Old loop automation protocol is archived. Shipping and direct verification are preferred.
