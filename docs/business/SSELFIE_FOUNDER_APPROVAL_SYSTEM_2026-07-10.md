# SSELFIE Founder Approval System

Status: live email-only architecture, updated 2026-07-12
Owner: Sandra

## What Sandra uses

One email: **Daily Sandra Briefing**.

When work is ready, its **Waiting on you** section contains up to five review links. The same open
actions appear on the admin home. The supported action is:

1. Send a recent Resend broadcast draft whose name begins with `Story ·`.

Open the link, review the exact email, then press **Send**. Press
**Dismiss — don't send** when it should be removed. Merely opening the email or page never performs
an action. Broadcast approvals show the current Resend subject, preview text, and plain-text body;
the send button stays disabled if that preview cannot be loaded.

## Ownership boundaries

- Claude may research, plan, and create drafts. It does not send customer-facing work.
- Codex changes the product through reviewed local code and direct-to-main deployment. No GitHub PR
  workflow is required for Sandra.
- The repo owns actions that touch customers or money, because it provides durable state, auditability,
  idempotency, and production monitoring.
- Resend remains the delivery channel. It does not decide what Sandra should say or sell.

## Safety and recovery

- Approval links use an HMAC signature from the server-only `ADMIN_ACTION_SECRET` and expire in seven days.
- GET requests are read-only, protecting against email-link scanners.
- POST requests atomically change `pending` to `executing` before sending, preventing duplicate sends.
- Completed and dismissed actions cannot run again.
- Failed actions retain a short error message and remain visible for manual review; email sends do not
  silently retry.
- Every action has an idempotency key tied to the underlying Resend broadcast.

## Operations

- Schedule: `daily-sandra-briefing` at 06:15 Europe/Oslo-equivalent Vercel cron time.
- Database migration: `db/migrations/66-create-admin-action-queue.sql`.
- Review page: `/approve/[token]`.
- Execution endpoint: `/api/admin-actions/[token]` (POST only).
- Source sync: `lib/admin/sync-approval-actions.ts`.

The repo-hosted Instagram/ManyChat reply approval system was retired and removed on 2026-07-12.
Do not add a second approval email, a second queue, or an auto-send path. Extend the existing action
types only when the new action can be previewed exactly, claimed atomically, and safely retried.
