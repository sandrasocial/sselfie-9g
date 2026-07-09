-- Cleanup: the Instagram inbound-capture investigation is resolved (root
-- cause was a wrong app secret, fixed 2026-07-09). Drop the TEMP diagnostic
-- table created for that investigation.
DROP TABLE IF EXISTS ig_webhook_hits;
