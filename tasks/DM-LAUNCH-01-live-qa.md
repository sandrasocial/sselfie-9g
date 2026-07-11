# DM-LAUNCH-01 - Instagram DM Live QA

## 2026-07-11 repair and current proof

- The correct ManyChat account (`fb877156`, connected to `@sandra.social`) was already live, but its Default Reply request body mapped the incoming message to `No field selected`. This was repaired to `Last Text Input` and the live flow was updated.
- The stale-account API key was replaced locally and in Vercel Production with the key issued by account `877156`. Human-approved ManyChat outbound is enabled; `IG_AGENT_AUTO_SEND_ENABLED` remains off.
- Outbound now fails closed if the token prefix does not match `MANYCHAT_ACCOUNT_ID`, preventing a future cross-account credential regression.
- Native Instagram is already proven in production: seven Sandra-approved replies are recorded sent/delivered, most recently 2026-07-10. There have been zero automated agent sends in the last 30 days.
- Remaining: one post-repair real DM through Default Reply, followed by one Sandra-approved reply and arrival confirmation in Instagram.

OWNER: sandra

Status: on hold by Sandra as of 2026-06-14.

Forward-going bridge is live. Historical backlog import is paused because Meta Graph times out on
Sandra's current IG thread volume, and the public ManyChat API does not expose bulk message
history. Existing backlog remains in Instagram/ManyChat unless Sandra exports it or revives this
work later.

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
