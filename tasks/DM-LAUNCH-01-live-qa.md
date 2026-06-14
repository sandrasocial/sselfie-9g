# DM-LAUNCH-01 - Instagram DM Live QA

OWNER: sandra

Status: built, waiting for real-world QA.

## What Is Built

- ManyChat inbound bridge: `app/api/webhooks/manychat-inbound/route.ts`
- Admin inbox: `/admin/ig-inbox`
- Simple daily inbox: `/my-inbox`
- Native Instagram sender: `lib/ig-agent/send-dm.ts`
- ManyChat sender: `lib/ig-agent/send-manychat.ts`
- Manual send failure feedback in admin inbox.
- Production envs:
  - `IG_AGENT_AUTO_SEND_ENABLED`
  - `INSTAGRAM_WEBHOOK_VERIFY_TOKEN`
  - `INSTAGRAM_APP_SECRET`
  - `MANYCHAT_API_KEY`

## QA Steps

1. Send a real test DM that enters through ManyChat's default-reply bridge.
2. Confirm the conversation appears in `/admin/ig-inbox`.
3. Use the AI draft or type a short reply.
4. Click `Send reply`.
5. Confirm the reply arrives inside Instagram.
6. Confirm the conversation status becomes `sandra_replied`.
7. If it fails, capture the visible error in the admin UI and the conversation id.

## Acceptance

- A ManyChat-originated conversation can be replied to from admin and arrives in Instagram.
- A native Instagram conversation can be replied to from admin and arrives in Instagram.
- Automated agent sends remain blocked while `IG_AGENT_AUTO_SEND_ENABLED` is not `true`.
- Failures are visible and do not clear Sandra's typed reply.

## Known Follow-Up

ManyChat flow hygiene is still a separate operational task: audit live keywords, buttons, URLs,
UTMs, stale flows, and collision-prone tags inside ManyChat.
