# SHOOT-STUDIO-02 - Live Drop QA

OWNER: sandra

Status: built, waiting for live QA with real queued shoots.

## What Is Built

- Shoot Studio creates 6+ shots.
- Sandra can upload/select multiple selfies.
- The first inspiration image is treated as the primary style anchor.
- Images can be opened larger before approval.
- Approved shoots publish into DB-backed Vault/freebie/Library/Maya surfaces.
- Drop email preview, test-send, dry-run counts, and send workflow exist.

## QA Steps

1. Publish a new shoot with at least 6 approved shots.
2. Confirm Vault shows the full collection.
3. Confirm the free AI prompts page shows only Shot 1 and locked teasers for the rest.
4. Confirm Maya/App library can see the published collection.
5. Open the drop-email preview in admin.
6. Confirm images match the newest published shoot, not old static images.
7. Send a test email to Sandra.
8. Run dry-run counts before any live send.

## Acceptance

- New shoot appears correctly in Vault, freebie, Library, and Maya style surfaces.
- Email preview uses the selected/new collection images.
- Test email matches preview.
- Dry-run counts are visible before any live send.
- No live send happens without Sandra approval.

## Known Follow-Up

If carousel/story/text-style quality still feels off after this QA, write a fresh current spec for
that exact problem. Do not revive `CONTENT-VISUALS-01`; Shoot Studio replaced that old workflow.
