# E-01 — Fix Subscriber Count + Remove False Mismatch Block

## Context
The Brand Engine broadcast admin page shows `~1` subscriber and blocks sending with an
"Audience mismatch detected" warning. This is caused by two bugs:

**Bug 1 — Broken count (the root cause)**
`getAudienceContactCountFast()` in `lib/resend/get-audience-contacts.ts` fetches
`/audiences/{id}/contacts?limit=1` and reads `payload.total`. Resend's API does NOT
return a `total` field on this endpoint. The code then falls back to `list.length`
which is always `1` (one contact returned). The subscriber count has never worked.

Confirmed via curl:
```
curl "https://api.resend.com/audiences/762d7ab8-7a72-40d1-8f26-9ddfcff52e73/contacts?limit=1"
→ {"object":"list","has_more":true,"data":[{...}]}
# No "total" field. list.length = 1.
```

**Bug 2 — Wrong mismatch logic**
`app/api/admin/marketing/brand-engine-broadcast/route.ts` (GET and POST) computes:
```ts
audienceMismatch: dbSubscriberCount > 0 && subscriberCount > 0 && subscriberCount < Math.ceil(dbSubscriberCount * 0.5)
```
The DB (`freebie_subscribers`) has ~479 rows. Sandra's Resend audience has ~3,000+
contacts imported from Flodesk before SSELFIE was built. The DB is intentionally
incomplete — Resend is the source of truth. This comparison will always flag a mismatch
and should be removed.

The UI reads `audienceMismatch` and blocks the Approve + Send button when true.

---

## What to fix

### 1. Fix `getAudienceContactCount()` in `lib/resend/get-audience-contacts.ts`

Reuse the existing `getAudienceContacts()` which already paginates correctly and is
cached at CACHE_TTL.LONG (15 min). Just return its length:

```ts
export async function getAudienceContactCount(audienceId: string): Promise<number> {
  const contacts = await getAudienceContacts(audienceId)
  return contacts.length
}
```

Remove `getAudienceContactCountFast()` and `getAudienceContactCountStatus()` entirely —
they are broken and unused outside this file.

### 2. Remove the mismatch guard from the broadcast route

In `app/api/admin/marketing/brand-engine-broadcast/route.ts`:
- Remove the `dbSubscriberCount` SQL query in both GET and POST handlers
- Remove `audienceMismatch` from both responses
- Remove `dbSubscriberCount` from both responses

### 3. Update the broadcast admin UI

Wherever `audienceMismatch` or `dbSubscriberCount` are read in the frontend:
- Remove the yellow "Audience mismatch detected" warning banner
- Remove any `disabled` state on Approve + Send tied to `audienceMismatch`
- Remove or relabel the "DB SUBSCRIBERS" stat box — it's misleading. If kept, label
  it "App signups" with no comparison logic.
- SUBSCRIBERS and RESEND AUDIENCE CONTACTS boxes should both show the real Resend count

---

## Files to change
- `lib/resend/get-audience-contacts.ts`
- `app/api/admin/marketing/brand-engine-broadcast/route.ts`
- Broadcast admin UI component (wherever audienceMismatch is rendered)

## Do NOT change
- `getAudienceContacts()` pagination logic — it works
- The send/approve/preview flow
- Any other email or marketing routes

## Success criteria
- Broadcast page shows ~3,000 real subscribers from Resend
- No mismatch warning
- Approve + Send button is enabled
- Count is cached — no re-fetch on every page load
