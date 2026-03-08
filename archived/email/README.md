This folder holds email automation code that is intentionally not live.

Archived on 2026-03-08 during the V-02 email audit cleanup:
- unscheduled cron routes moved out of `app/api/cron` so they no longer appear live
- dead template files with no active runtime imports moved out of `lib/email/templates`

Some legacy templates still remain in `lib/email/templates` because they are still imported by admin tools, referral flows, scripts, or manual recovery utilities even though they are not on a scheduled cron.
