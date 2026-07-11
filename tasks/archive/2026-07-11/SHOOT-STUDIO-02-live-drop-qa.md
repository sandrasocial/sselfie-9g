# SHOOT-STUDIO-02 - Live Drop QA

## ✅ LIVE DROP QA COMPLETE 2026-07-11 (Codex)

- The old "waiting for one more collection" gate was stale. Production has 17 published Shoot Studio collections.
- The next reviewed drop is `Paris Balcony Dusk` (8 shots) + `Shadow Study Editorial` (6 shots). All 14 image assets return HTTP 200 and both collections are queued.
- Paid Vault access shows both full collections. Free AI Prompts access shows Shot 1 plus 7 and 5 locked teasers. Both collections appear in the App aesthetics feed, membership Library source, and Maya's dynamic Vault style guide.
- Buyer and nonbuyer previews contain only the selected new shoot images. The dry run resolved 3,663 free-preview recipients and 49 Vault buyers (3,712 total).
- Both preview variants were test-sent to Sandra and reached `delivered`. No live audience send was started.
- One abandoned 24-day-old run with zero claims or sends was cancelled. Future zero-work runs now auto-cancel after 24 hours before a new run is created, preventing permanent stale locks.

Status: Complete. The actual audience send remains an attended Sandra approval action, not unfinished implementation.

OWNER: sandra

Status: built, partially verified 2026-06-14; waiting for one more published Shoot Studio collection.

Codex verified live data on 2026-06-14:

- `Café Minimalist Paris` is published to `vault_collections` with 6 published prompts and `email_drop_status = queued`.
- `Quiet Monochrome City` has 4 approved shots and needs 2 more approved rendered shots before it can publish.
- `Monochrome Ease` and `Shadows & Structure` each have 6 generated shots but 0 approved shots.
- Live drop tracking tables `vault_drop_runs` and `vault_drop_recipient_claims` were missing and have now been created from the additive migration.
- Strict Shoot Studio drop QA still needs at least one more Shoot Studio collection published so the drop email can use new shoot images only, instead of mixing one new shoot with older static pending collections.

## What Is Built

- Shoot Studio creates 6+ shots.
- Sandra can upload/select multiple selfies.
- The first inspiration image is treated as the primary style anchor.
- Images can be opened larger before approval.
- Approved shoots publish into DB-backed Vault/freebie/Library/Maya surfaces.
- Drop email preview, test-send, dry-run counts, and send workflow exist.

## QA Steps

1. Sandra approves at least 6 rendered shots in one more shoot.
2. Publish that shoot to the Vault.
3. Confirm Vault shows the full collection.
4. Confirm the free AI prompts page shows only Shot 1 and locked teasers for the rest.
5. Confirm Maya/App library can see the published collection.
6. Open the drop-email preview in admin and select the two newest Shoot Studio collections.
7. Confirm images match the selected newest shoots, not old static images.
8. Send a test email to Sandra.
9. Run dry-run counts before any live send.

## Acceptance

- New shoot appears correctly in Vault, freebie, Library, and Maya style surfaces.
- Email preview uses the selected/new collection images.
- Test email matches preview.
- Dry-run counts are visible before any live send.
- No live send happens without Sandra approval.

## Known Follow-Up

If carousel/story/text-style quality still feels off after this QA, write a fresh current spec for
that exact problem. Do not revive `CONTENT-VISUALS-01`; Shoot Studio replaced that old workflow.
